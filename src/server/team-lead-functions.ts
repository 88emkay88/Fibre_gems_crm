import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import { getCurrentUser, type AuthUser } from "./auth";
import { getDb, isMockMode, mockStore } from "./db";
import { customers, profiles } from "./db/schema";

function requireTeamLead(user: AuthUser | null): AuthUser {
  if (!user) throw new Error("Unauthorized");
  if (user.role !== "team_leader" && user.role !== "admin") throw new Error("Forbidden");
  return user;
}

export const getTeamCallbacksFn = createServerFn({ method: "GET" }).handler(async () => {
  requireTeamLead(await getCurrentUser());

  if (isMockMode()) {
    const callbacks = Array.from(mockStore.customers.values())
      .filter((c) => c.recordStatus === "active" && c.nextActionDate)
      .map((c) => ({
        id: c.id,
        full_name: c.fullName,
        cell_number: c.cellNumber,
        area_suburb: c.areaSuburb ?? null,
        owner_id: c.ownerId,
        next_action: c.nextAction ?? null,
        next_action_date: c.nextActionDate,
      }));
    const agents = Array.from(mockStore.profiles.values()).map((p) => ({
      id: p.id,
      full_name: p.fullName,
      agent_code: p.agentCode ?? null,
    }));
    return { callbacks, agents };
  }

  const db = getDb();
  const callbacks = await db
    .select({
      id: customers.id,
      full_name: customers.fullName,
      cell_number: customers.cellNumber,
      area_suburb: customers.areaSuburb,
      owner_id: customers.ownerId,
      next_action: customers.nextAction,
      next_action_date: customers.nextActionDate,
    })
    .from(customers)
    .where(and(eq(customers.recordStatus, "active"), isNotNull(customers.nextActionDate)))
    .orderBy(asc(customers.nextActionDate))
    .limit(1000);

  const agents = await db
    .select({ id: profiles.id, full_name: profiles.fullName, agent_code: profiles.agentCode })
    .from(profiles);

  return { callbacks, agents };
});

export const reassignCallbacksFn = createServerFn({ method: "POST" })
  .validator((data: { customerIds: string[]; targetAgentId: string }) => data)
  .handler(async ({ data }) => {
    requireTeamLead(await getCurrentUser());
    if (data.customerIds.length === 0) throw new Error("Select at least one callback");

    if (isMockMode()) {
      if (!mockStore.profiles.get(data.targetAgentId)) throw new Error("Choose an active agent");
      const nowIso = new Date().toISOString();
      let moved = 0;
      for (const id of data.customerIds) {
        const existing = mockStore.customers.get(id);
        if (!existing || existing.recordStatus !== "active") continue;
        mockStore.customers.set(id, { ...existing, ownerId: data.targetAgentId, updatedAt: nowIso });
        moved += 1;
      }
      if (moved === 0) throw new Error("No callbacks were reassigned");
      return { reassigned: moved };
    }

    const db = getDb();
    const [target] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, data.targetAgentId))
      .limit(1);
    if (!target) throw new Error("Choose an active agent");

    const moved = await db
      .update(customers)
      .set({ ownerId: data.targetAgentId, updatedAt: new Date() })
      .where(and(inArray(customers.id, data.customerIds), eq(customers.recordStatus, "active")))
      .returning({ id: customers.id });
    if (moved.length === 0) throw new Error("No callbacks were reassigned");

    return { reassigned: moved.length };
  });
