import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { getCurrentUser, type AuthUser } from "./auth";
import { getDb, isMockMode, mockStore } from "./db";
import { customers } from "./db/schema";
import {
  dialNumber,
  hangUpCall,
  postDisposition,
  setHold,
  setMute,
  type RemiResult,
} from "./vicidial.server";

const DISPOSITION_CODES = ["SALE", "CALLBACK", "PAYMENT_PROMISED", "NI", "DNC"] as const;

async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

async function requireAssignedCustomerPhone(customerId: string): Promise<string> {
  const user = await requireUser();

  let customer: { cellNumber: string; ownerId: string } | undefined;
  if (isMockMode()) {
    const found = mockStore.customers.get(customerId);
    customer = found ? { cellNumber: found.cellNumber, ownerId: found.ownerId } : undefined;
  } else {
    const [row] = await getDb()
      .select({ cellNumber: customers.cellNumber, ownerId: customers.ownerId })
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);
    customer = row;
  }

  if (!customer) throw new Error("Customer not found");
  if (user.role !== "admin" && customer.ownerId !== user.id) {
    throw new Error("This customer is not assigned to you");
  }
  return customer.cellNumber;
}

function unwrapDialer<T>(result: RemiResult<T>): T {
  if (result.ok) return result.data;
  switch (result.code) {
    case "not_configured":
      throw new Error(
        "The VICIdial connection is not set up yet. Ask your administrator to configure it.",
      );
    case "timeout":
    case "unreachable":
      throw new Error("VICIdial did not respond. Try again in a moment.");
    default:
      throw new Error("VICIdial rejected the request. Check the lead and try again.");
  }
}

export const dialCustomerFn = createServerFn({ method: "POST" })
  .validator((data: { customerId: string }) => {
    if (typeof data?.customerId !== "string" || !data.customerId)
      throw new Error("Invalid customer");
    return data;
  })
  .handler(async ({ data }) => {
    const phone = await requireAssignedCustomerPhone(data.customerId);
    unwrapDialer(await dialNumber({ phone, customerId: data.customerId }));
    return { success: true };
  });

export const hangupCallFn = createServerFn({ method: "POST" }).handler(async () => {
  await requireUser();
  unwrapDialer(await hangUpCall());
  return { success: true };
});

export const setCallHoldFn = createServerFn({ method: "POST" })
  .validator((data: { enabled: boolean }) => {
    if (typeof data?.enabled !== "boolean") throw new Error("Invalid hold state");
    return data;
  })
  .handler(async ({ data }) => {
    await requireUser();
    unwrapDialer(await setHold(data.enabled));
    return { success: true };
  });

export const setCallMuteFn = createServerFn({ method: "POST" })
  .validator((data: { enabled: boolean }) => {
    if (typeof data?.enabled !== "boolean") throw new Error("Invalid mute state");
    return data;
  })
  .handler(async ({ data }) => {
    await requireUser();
    unwrapDialer(await setMute(data.enabled));
    return { success: true };
  });

export const submitCallDispositionFn = createServerFn({ method: "POST" })
  .validator((data: { customerId: string; disposition: string; notes: string | null }) => {
    if (typeof data?.customerId !== "string" || !data.customerId)
      throw new Error("Invalid customer");
    if (!DISPOSITION_CODES.includes(data.disposition as (typeof DISPOSITION_CODES)[number])) {
      throw new Error("Invalid outcome");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const phone = await requireAssignedCustomerPhone(data.customerId);
    unwrapDialer(
      await postDisposition({ phone, disposition: data.disposition, notes: data.notes }),
    );
    return { success: true };
  });
