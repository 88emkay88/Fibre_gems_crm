import { createServerFn } from "@tanstack/react-start";
import { getCurrentUser, createSession, destroySession, hashPassword, verifyPassword, type AuthUser } from "./auth";
import { getDb, isMockMode, mockStore, type MockCustomer, type MockActivity, type MockOrder, type MockBatch } from "./db";
import { customers, orders, payments, activations, activities, profiles, userRoles, agilityImportBatches, agilityImportRows } from "./db/schema";
import { eq, desc, and } from "drizzle-orm";
import crypto from "node:crypto";

function normalizeCell(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("0") ? `27${digits.slice(1)}` : digits;
}

// ----------------------------------------------------
// AUTH SERVER FUNCTIONS
// ----------------------------------------------------

export const getCurrentUserFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = await getCurrentUser();
  return { user };
});

export const loginFn = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();

    if (isMockMode()) {
      let foundUser = Array.from(mockStore.profiles.values()).find(
        (p) => p.email.toLowerCase() === email
      );

      // If user is logging in with admin/agent test account or new account
      if (foundUser) {
        if (!verifyPassword(data.password, foundUser.passwordHash)) {
          throw new Error("Invalid password");
        }
      } else {
        // Fallback for easy development login if password is password123
        if (data.password === "password123") {
          const newId = crypto.randomUUID();
          foundUser = {
            id: newId,
            agentCode: `AGT-${Math.floor(100 + Math.random() * 900)}`,
            fullName: email.split("@")[0].toUpperCase(),
            email,
            passwordHash: hashPassword(data.password),
            status: "active",
            teamId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockStore.profiles.set(newId, foundUser);
          mockStore.userRoles.set(newId, email.includes("admin") ? "admin" : "agent");
        } else {
          throw new Error("User not found with these credentials");
        }
      }

      await createSession(foundUser.id);
      const role = mockStore.userRoles.get(foundUser.id) ?? "agent";
      return {
        success: true,
        user: {
          id: foundUser.id,
          email: foundUser.email,
          fullName: foundUser.fullName,
          agentCode: foundUser.agentCode,
          role: role as AuthUser["role"],
          status: foundUser.status,
        },
      };
    }

    // PostgreSQL database query via Drizzle
    const db = getDb();
    const [profile] = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1);

    if (!profile || !profile.passwordHash) {
      throw new Error("Invalid email or password");
    }

    const isValid = verifyPassword(data.password, profile.passwordHash);
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    if (profile.status !== "active") {
      throw new Error("Account is currently inactive");
    }

    await createSession(profile.id);

    const [roleRow] = await db.select().from(userRoles).where(eq(userRoles.userId, profile.id)).limit(1);

    return {
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.fullName,
        agentCode: profile.agentCode,
        role: (roleRow?.role ?? "agent") as AuthUser["role"],
        status: profile.status,
      },
    };
  });

export const registerFn = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string; fullName: string }) => data)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const fullName = data.fullName.trim();
    if (!email || !data.password || !fullName) {
      throw new Error("All fields are required");
    }

    const hashedPassword = hashPassword(data.password);
    const agentCode = `AGT-${Math.floor(100 + Math.random() * 900)}`;

    if (isMockMode()) {
      const existing = Array.from(mockStore.profiles.values()).find(
        (p) => p.email.toLowerCase() === email
      );
      if (existing) throw new Error("An account with this email already exists");

      const newId = crypto.randomUUID();
      const newProfile = {
        id: newId,
        agentCode,
        fullName,
        email,
        passwordHash: hashedPassword,
        status: "active",
        teamId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockStore.profiles.set(newId, newProfile);
      mockStore.userRoles.set(newId, "agent");

      await createSession(newId);
      return {
        success: true,
        user: {
          id: newId,
          email,
          fullName,
          agentCode,
          role: "agent" as const,
          status: "active",
        },
      };
    }

    // PostgreSQL database insert via Drizzle
    const db = getDb();
    const [existing] = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1);
    if (existing) {
      throw new Error("An account with this email already exists");
    }

    const [newProfile] = await db
      .insert(profiles)
      .values({
        fullName,
        email,
        agentCode,
        passwordHash: hashedPassword,
        status: "active",
      })
      .returning();

    await db.insert(userRoles).values({
      userId: newProfile.id,
      role: "agent",
    });

    await createSession(newProfile.id);

    return {
      success: true,
      user: {
        id: newProfile.id,
        email: newProfile.email,
        fullName: newProfile.fullName,
        agentCode: newProfile.agentCode,
        role: "agent" as const,
        status: newProfile.status,
      },
    };
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  await destroySession();
  return { success: true };
});

// ----------------------------------------------------
// WORKSPACE DATA SERVER FUNCTIONS
// ----------------------------------------------------

export const getWorkspaceDataFn = createServerFn({ method: "GET" })
  .validator((params?: { mode?: "agent" | "admin" }) => params)
  .handler(async ({ data: params }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const mode = params?.mode ?? (user.role === "admin" ? "admin" : "agent");

    if (isMockMode()) {
      let custs = Array.from(mockStore.customers.values()).filter(
        (c) => c.recordStatus === "active"
      );
      if (mode === "agent") {
        custs = custs.filter((c) => c.ownerId === user.id);
      }

      let acts = Array.from(mockStore.activities.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      if (mode === "agent") {
        acts = acts.filter((a) => a.actorId === user.id);
      }

      const profs = Array.from(mockStore.profiles.values()).map((p) => ({
        id: p.id,
        full_name: p.fullName,
        email: p.email,
        agent_code: p.agentCode,
        status: p.status,
      }));

      const ords = Array.from(mockStore.orders.values());

      return {
        customers: custs,
        activities: acts,
        profiles: profs,
        orders: ords,
      };
    }

    // Direct PostgreSQL queries
    const db = getDb();

    let custRows = await db
      .select({
        id: customers.id,
        full_name: customers.fullName,
        first_name: customers.firstName,
        surname: customers.surname,
        cell_number: customers.cellNumber,
        area_suburb: customers.areaSuburb,
        product_package: customers.productPackage,
        payment_type: customers.paymentType,
        status: customers.status,
        owner_id: customers.ownerId,
        next_action: customers.nextAction,
        next_action_date: customers.nextActionDate,
        last_contact_date: customers.lastContactDate,
        created_at: customers.createdAt,
      })
      .from(customers)
      .where(
        mode === "agent"
          ? and(eq(customers.recordStatus, "active"), eq(customers.ownerId, user.id))
          : eq(customers.recordStatus, "active")
      )
      .orderBy(desc(customers.createdAt))
      .limit(1000);

    const mappedCustomers = custRows.map((c) => ({
      ...c,
      full_name: c.full_name || `${c.first_name} ${c.surname}`.trim(),
      created_at: c.created_at ? new Date(c.created_at).toISOString() : new Date().toISOString(),
    }));

    const actRows = await db
      .select({
        id: activities.id,
        customer_id: activities.customerId,
        actor_id: activities.actorId,
        action_type: activities.actionType,
        outcome: activities.outcome,
        notes: activities.notes,
        customer_status_after: activities.customerStatusAfter,
        next_action: activities.nextAction,
        created_at: activities.createdAt,
      })
      .from(activities)
      .where(mode === "agent" ? eq(activities.actorId, user.id) : undefined)
      .orderBy(desc(activities.createdAt))
      .limit(2000);

    const mappedActivities = actRows.map((a) => ({
      ...a,
      created_at: a.created_at ? new Date(a.created_at).toISOString() : new Date().toISOString(),
    }));

    const profRows = await db
      .select({
        id: profiles.id,
        full_name: profiles.fullName,
        email: profiles.email,
        agent_code: profiles.agentCode,
        status: profiles.status,
      })
      .from(profiles)
      .orderBy(profiles.fullName);

    const ordRows = await db
      .select({
        id: orders.id,
        customer_id: orders.customerId,
        ovr_number: orders.ovrNumber,
        ovk_number: orders.ovkNumber,
        status: orders.status,
      })
      .from(orders);

    return {
      customers: mappedCustomers,
      activities: mappedActivities,
      profiles: profRows,
      orders: ordRows,
    };
  });

export const captureLeadFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      first_name: string;
      surname: string;
      cell_number: string;
      alternate_cell_number?: string;
      email?: string;
      area_suburb?: string;
      full_address?: string;
      product_package?: string;
      payment_type?: string;
      next_action?: string;
      next_action_date?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const cell = data.cell_number.trim();
    const norm = normalizeCell(cell);
    const fullName = `${data.first_name.trim()} ${data.surname.trim()}`;
    const nowIso = new Date().toISOString();

    if (isMockMode()) {
      const existing = Array.from(mockStore.customers.values()).find(
        (c) => c.normalizedCell === norm
      );
      if (existing) {
        throw new Error("This customer already exists in the company pipeline.");
      }

      const custId = crypto.randomUUID();
      const newCust: MockCustomer = {
        id: custId,
        externalCustomerId: `CUS-${Math.floor(1000 + Math.random() * 9000)}`,
        recordStatus: "active",
        firstName: data.first_name.trim(),
        surname: data.surname.trim(),
        fullName,
        cellNumber: cell,
        normalizedCell: norm,
        alternateCellNumber: data.alternate_cell_number?.trim() || null,
        email: data.email?.trim() || null,
        fullAddress: data.full_address?.trim() || null,
        areaSuburb: data.area_suburb?.trim() || null,
        productPackage: data.product_package || null,
        paymentType: data.payment_type || null,
        ownerId: user.id,
        originalAgentId: user.id,
        teamLeaderId: null,
        status: "new_lead",
        nextAction: data.next_action || null,
        nextActionDate: data.next_action_date || null,
        lastContactDate: null,
        createdBy: user.id,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      mockStore.customers.set(custId, newCust);

      // Create initial order and activity
      const ordId = crypto.randomUUID();
      mockStore.orders.set(ordId, {
        id: ordId,
        customerId: custId,
        externalOrderId: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        orderDate: new Date().toISOString().slice(0, 10),
        ovrNumber: null,
        ovkNumber: null,
        status: "pending",
        nextAction: "Initial verification",
        actionDate: null,
        source: "crm",
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      const actId = crypto.randomUUID();
      mockStore.activities.set(actId, {
        id: actId,
        customerId: custId,
        actorId: user.id,
        actionType: "Lead captured",
        contactMethod: "Web Form",
        outcome: "Lead Created",
        customerStatusAfter: "new_lead",
        nextAction: data.next_action || null,
        nextActionDate: data.next_action_date || null,
        escalationType: null,
        escalationReason: null,
        notes: "Captured via agent form",
        createdAt: nowIso,
      });

      return { success: true, customer: newCust };
    }

    // Direct PostgreSQL via Drizzle
    const db = getDb();

    // Check duplicate
    const [existing] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.normalizedCell, norm))
      .limit(1);

    if (existing) {
      throw new Error("This customer already exists in the company pipeline.");
    }

    const [newCust] = await db
      .insert(customers)
      .values({
        firstName: data.first_name.trim(),
        surname: data.surname.trim(),
        fullName,
        cellNumber: cell,
        normalizedCell: norm,
        alternateCellNumber: data.alternate_cell_number?.trim() || null,
        email: data.email?.trim() || null,
        fullAddress: data.full_address?.trim() || null,
        areaSuburb: data.area_suburb?.trim() || null,
        productPackage: data.product_package || null,
        paymentType: data.payment_type || null,
        ownerId: user.id,
        originalAgentId: user.id,
        createdBy: user.id,
        status: "new_lead",
        nextAction: data.next_action || null,
        nextActionDate: data.next_action_date || null,
      })
      .returning();

    // Create accompanying order, payment, activation, and initial activity
    await Promise.all([
      db.insert(orders).values({ customerId: newCust.id }),
      db.insert(payments).values({ customerId: newCust.id }),
      db.insert(activations).values({ customerId: newCust.id }),
      db.insert(activities).values({
        customerId: newCust.id,
        actorId: user.id,
        actionType: "Lead captured",
        customerStatusAfter: "new_lead",
        notes: "Captured in field workspace",
      }),
    ]);

    return { success: true, customer: newCust };
  });

export const logOutcomeFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      customerId: string;
      outcome: string;
      status: string;
      nextActionDate: string | null;
      nextAction: string | null;
      notes: string | null;
    }) => data
  )
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Johannesburg",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const nowIso = new Date().toISOString();

    if (isMockMode()) {
      const cust = mockStore.customers.get(data.customerId);
      if (!cust) throw new Error("Customer not found");

      cust.status = data.status;
      cust.nextAction = data.nextAction;
      cust.nextActionDate = data.nextActionDate;
      cust.lastContactDate = today;
      cust.updatedAt = nowIso;

      const actId = crypto.randomUUID();
      mockStore.activities.set(actId, {
        id: actId,
        customerId: data.customerId,
        actorId: user.id,
        actionType: "Call outcome",
        contactMethod: "Phone Call",
        outcome: data.outcome,
        customerStatusAfter: data.status,
        nextAction: data.nextAction,
        nextActionDate: data.nextActionDate,
        escalationType: null,
        escalationReason: null,
        notes: data.notes,
        createdAt: nowIso,
      });

      return { success: true };
    }

    // Direct PostgreSQL
    const db = getDb();

    await db
      .update(customers)
      .set({
        status: data.status as any,
        nextAction: data.nextAction,
        nextActionDate: data.nextActionDate,
        lastContactDate: today,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, data.customerId));

    await db.insert(activities).values({
      customerId: data.customerId,
      actorId: user.id,
      actionType: "Call outcome",
      outcome: data.outcome,
      customerStatusAfter: data.status as any,
      nextActionDate: data.nextActionDate,
      nextAction: data.nextAction,
      notes: data.notes,
    });

    return { success: true };
  });

// ----------------------------------------------------
// AGILITY SYNC SERVER FUNCTIONS
// ----------------------------------------------------

export const getAgilityBatchesFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  if (isMockMode()) {
    return Array.from(mockStore.batches.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(agilityImportBatches)
    .orderBy(desc(agilityImportBatches.createdAt))
    .limit(20);

  return rows;
});

export const commitAgilitySyncFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      fileName: string;
      fileHash: string;
      rows: Array<{
        row_number: number;
        raw: Record<string, string>;
        ovr: string | null;
        ovk: string | null;
        product: string | null;
        state: string | null;
        customerId: string | null;
        errors: string[];
      }>;
    }) => data
  )
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") throw new Error("Admin privileges required for Agility Sync");

    const valid = data.rows.filter((r) => !r.errors.length && r.customerId);
    const nowIso = new Date().toISOString();
    const today = nowIso.slice(0, 10);

    if (isMockMode()) {
      const existing = Array.from(mockStore.batches.values()).find(
        (b) => b.fileHash === data.fileHash
      );
      if (existing) throw new Error("This file has already been imported");

      const batchId = crypto.randomUUID();
      const batch: MockBatch = {
        id: batchId,
        fileName: data.fileName,
        fileHash: data.fileHash,
        status: "committed",
        rowCount: data.rows.length,
        newCount: 0,
        updatedCount: valid.length,
        errorCount: data.rows.length - valid.length,
        uploadedBy: user.id,
        createdAt: nowIso,
        committedAt: nowIso,
      };
      mockStore.batches.set(batchId, batch);

      for (const r of valid) {
        const cust = mockStore.customers.get(r.customerId!);
        if (cust) {
          if (r.product) cust.productPackage = r.product;
          if (r.state === "paid") cust.status = "activation_pending";
          if (r.state === "activated") cust.status = "activated";
          cust.updatedAt = nowIso;
        }

        const actId = crypto.randomUUID();
        mockStore.activities.set(actId, {
          id: actId,
          customerId: r.customerId!,
          actorId: user.id,
          actionType: "Agility sync",
          contactMethod: "Batch Import",
          outcome: r.state ?? "Synced",
          customerStatusAfter: r.state === "paid" ? "activation_pending" : r.state === "activated" ? "activated" : null,
          nextAction: null,
          nextActionDate: null,
          escalationType: null,
          escalationReason: null,
          notes: `Batch ${data.fileName}`,
          createdAt: nowIso,
        });
      }

      return { success: true, count: valid.length };
    }

    // Direct PostgreSQL
    const db = getDb();

    const [batch] = await db
      .insert(agilityImportBatches)
      .values({
        fileName: data.fileName,
        fileHash: data.fileHash,
        uploadedBy: user.id,
        rowCount: data.rows.length,
        errorCount: data.rows.length - valid.length,
        updatedCount: valid.length,
        status: "committed",
        committedAt: new Date(),
      })
      .returning();

    if (data.rows.length > 0) {
      await db.insert(agilityImportRows).values(
        data.rows.map((r) => ({
          batchId: batch.id,
          rowNumber: r.row_number,
          rawData: r.raw,
          ovrNumber: r.ovr,
          ovkNumber: r.ovk,
          validationStatus: r.errors.length ? "error" : "synced",
          validationErrors: r.errors,
          customerId: r.customerId,
        }))
      );
    }

    for (const r of valid) {
      const id = r.customerId!;
      const patch: Record<string, any> = {};
      if (r.product) patch.productPackage = r.product;

      if (r.state === "paid") {
        patch.status = "activation_pending";
        await db
          .update(payments)
          .set({ status: "Paid", paymentDate: today, verifiedAt: new Date(), updatedAt: new Date() })
          .where(eq(payments.customerId, id));
      }

      if (r.state === "activated") {
        patch.status = "activated";
        await db
          .update(activations)
          .set({ status: "Activated", activationDate: today, verifiedAt: new Date(), updatedAt: new Date() })
          .where(eq(activations.customerId, id));
      }

      if (Object.keys(patch).length > 0) {
        await db.update(customers).set(patch).where(eq(customers.id, id));
      }

      await db.insert(activities).values({
        customerId: id,
        actorId: user.id,
        actionType: "Agility sync",
        outcome: r.state ?? "Synced",
        notes: `Batch ${data.fileName}`,
      });
    }

    return { success: true, count: valid.length };
  });
