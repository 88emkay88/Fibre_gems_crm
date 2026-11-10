import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const dbUrl = process.env.DATABASE_URL || process.env.LOVABLE_DB_MIGRATION_URL || process.env.POSTGRES_URL;

let drizzleDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function isMockMode(): boolean {
  return !dbUrl;
}

export function getDb() {
  if (!dbUrl) {
    throw new Error("DATABASE_URL is not set. Please set DATABASE_URL in your .env file.");
  }
  if (!drizzleDb) {
    const client = postgres(dbUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    drizzleDb = drizzle(client, { schema });
  }
  return drizzleDb;
}

// In-memory fallback store used when DATABASE_URL is not yet configured.
// Provides immediate out-of-the-box local development and demo functionality.
export interface MockProfile {
  id: string;
  agentCode: string | null;
  fullName: string;
  email: string;
  passwordHash: string;
  status: string;
  teamId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockCustomer {
  id: string;
  externalCustomerId: string | null;
  recordStatus: string;
  firstName: string;
  surname: string;
  fullName: string;
  cellNumber: string;
  normalizedCell: string;
  alternateCellNumber: string | null;
  email: string | null;
  fullAddress: string | null;
  areaSuburb: string | null;
  productPackage: string | null;
  paymentType: string | null;
  easypayNumber?: string | null;
  easypayCycle?: number | string | null;
  easypayExpiry?: string | null;
  easypay_number?: string | null;
  easypay_cycle?: number | string | null;
  easypay_expiry?: string | null;
  easypay_expiry_date?: string | null;
  ovrNumber?: string | null;
  ovkNumber?: string | null;
  ovr_number?: string | null;
  ovk_number?: string | null;
  referralCode?: string | null;
  referral_code?: string | null;
  ownerId: string;
  originalAgentId: string;
  teamLeaderId: string | null;
  status: string;
  nextAction: string | null;
  nextActionDate: string | null;
  lastContactDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockActivity {
  id: string;
  customerId: string;
  actorId: string;
  actionType: string;
  contactMethod: string | null;
  outcome: string | null;
  customerStatusAfter: string | null;
  nextAction: string | null;
  nextActionDate: string | null;
  escalationType: string | null;
  escalationReason: string | null;
  notes: string | null;
  createdAt: string;
}

export interface MockOrder {
  id: string;
  customerId: string;
  externalOrderId: string | null;
  orderDate: string | null;
  ovrNumber: string | null;
  ovkNumber: string | null;
  status: string;
  nextAction: string | null;
  actionDate: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockBatch {
  id: string;
  fileName: string;
  fileHash: string;
  status: string;
  rowCount: number;
  newCount: number;
  updatedCount: number;
  errorCount: number;
  uploadedBy: string;
  createdAt: string;
  committedAt: string | null;
}

// Default seed data for development
const ADMIN_ID = "00000000-0000-0000-0000-000000000001";
const AGENT_ID = "00000000-0000-0000-0000-000000000002";
// Password for both is "password123"
const DEFAULT_PASSWORD_HASH = "d1b09b0b4a4cb99c017efad83ff6e9ea:6e6fba040f7f3f619e078ba151323f666fca554ffaa07da4aa27d420f4c9c6123498806dc5fcb51dc73468903e1b74251f22ba5427d11f67f9754f24c30c8ad2";

const initialProfiles = new Map<string, MockProfile>([
  [
    ADMIN_ID,
    {
      id: ADMIN_ID,
      agentCode: "ADM-01",
      fullName: "Admin Commander",
      email: "admin@fibregems.co.za",
      passwordHash: DEFAULT_PASSWORD_HASH,
      status: "active",
      teamId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  [
    AGENT_ID,
    {
      id: AGENT_ID,
      agentCode: "AGT-01",
      fullName: "Sipho Dlamini",
      email: "agent@fibregems.co.za",
      passwordHash: DEFAULT_PASSWORD_HASH,
      status: "active",
      teamId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
]);

const initialRoles = new Map<string, string>([
  [ADMIN_ID, "admin"],
  [AGENT_ID, "agent"],
]);

const initialCustomers = new Map<string, MockCustomer>([
  [
    "c1111111-0000-0000-0000-000000000001",
    {
      id: "c1111111-0000-0000-0000-000000000001",
      externalCustomerId: "CUS-1001",
      recordStatus: "active",
      firstName: "Thabo",
      surname: "Mokoena",
      fullName: "Thabo Mokoena",
      cellNumber: "0821234567",
      normalizedCell: "27821234567",
      alternateCellNumber: null,
      email: "thabo@example.com",
      fullAddress: "14 Khumalo Street, Soweto",
      areaSuburb: "Soweto",
      productPackage: "Vuma Reach 20Mbps/10Mbps",
      paymentType: "EasyPay",
      easypayNumber: "91234567890",
      easypayCycle: 1,
      easypayExpiry: "2026-12-31",
      easypay_number: "91234567890",
      easypay_cycle: "1",
      easypay_expiry: "2026-12-31",
      easypay_expiry_date: "2026-12-31",
      ovrNumber: "OVR-849201",
      ovkNumber: "OVK-552194",
      ovr_number: "OVR-849201",
      ovk_number: "OVK-552194",
      referralCode: "REF-MOK1001",
      referral_code: "REF-MOK1001",
      ownerId: AGENT_ID,
      originalAgentId: AGENT_ID,
      teamLeaderId: null,
      status: "new_lead",
      nextAction: "Initial follow-up call",
      nextActionDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()),
      lastContactDate: null,
      createdBy: AGENT_ID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  [
    "c1111111-0000-0000-0000-000000000002",
    {
      id: "c1111111-0000-0000-0000-000000000002",
      externalCustomerId: "CUS-1002",
      recordStatus: "active",
      firstName: "Nomvula",
      surname: "Zulu",
      fullName: "Nomvula Zulu",
      cellNumber: "0739876543",
      normalizedCell: "27739876543",
      alternateCellNumber: null,
      email: "nomvula@example.com",
      fullAddress: "88 Vilakazi St, Orlando West",
      areaSuburb: "Orlando West",
      productPackage: "Vuma Reach 50Mbps/25Mbps",
      paymentType: "Prepaid",
      easypayNumber: null,
      easypayCycle: null,
      easypayExpiry: null,
      easypay_number: null,
      easypay_cycle: null,
      easypay_expiry: null,
      easypay_expiry_date: null,
      referralCode: "REF-ZUL1002",
      referral_code: "REF-ZUL1002",
      ownerId: AGENT_ID,
      originalAgentId: AGENT_ID,
      teamLeaderId: null,
      status: "payment_pending",
      nextAction: "Payment follow-up",
      nextActionDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()),
      lastContactDate: new Date().toISOString().slice(0, 10),
      createdBy: AGENT_ID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  [
    "c1111111-0000-0000-0000-000000000003",
    {
      id: "c1111111-0000-0000-0000-000000000003",
      externalCustomerId: "CUS-1003",
      recordStatus: "active",
      firstName: "Bongani",
      surname: "Khumalo",
      fullName: "Bongani Khumalo",
      cellNumber: "0845551234",
      normalizedCell: "27845551234",
      alternateCellNumber: null,
      email: "bongani@example.com",
      fullAddress: "12 Meadowlands Zone 2, Soweto",
      areaSuburb: "Meadowlands",
      productPackage: "Vuma Reach 50Mbps/25Mbps",
      paymentType: "Debit Order",
      easypayNumber: null,
      easypayCycle: null,
      easypayExpiry: null,
      easypay_number: null,
      easypay_cycle: null,
      easypay_expiry: null,
      easypay_expiry_date: null,
      referralCode: "REF-KHU1003",
      referral_code: "REF-KHU1003",
      ownerId: AGENT_ID,
      originalAgentId: AGENT_ID,
      teamLeaderId: null,
      status: "activated",
      nextAction: "After-Sales Referral Call",
      nextActionDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()),
      lastContactDate: new Date().toISOString().slice(0, 10),
      createdBy: AGENT_ID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
]);

const initialOrders = new Map<string, MockOrder>([
  [
    "o1111111-0000-0000-0000-000000000001",
    {
      id: "o1111111-0000-0000-0000-000000000001",
      customerId: "c1111111-0000-0000-0000-000000000001",
      externalOrderId: "ORD-1001",
      orderDate: new Date().toISOString().slice(0, 10),
      ovrNumber: "OVR1001",
      ovkNumber: "OVK1001",
      status: "pending",
      nextAction: "Verification",
      actionDate: null,
      source: "crm",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  [
    "o1111111-0000-0000-0000-000000000002",
    {
      id: "o1111111-0000-0000-0000-000000000002",
      customerId: "c1111111-0000-0000-0000-000000000002",
      externalOrderId: "ORD-1002",
      orderDate: new Date().toISOString().slice(0, 10),
      ovrNumber: "OVR1002",
      ovkNumber: "OVK1002",
      status: "pending",
      nextAction: "Payment collection",
      actionDate: null,
      source: "crm",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
]);

export const mockStore = {
  profiles: initialProfiles,
  userRoles: initialRoles,
  sessions: new Map<string, { userId: string; expiresAt: Date }>(),
  customers: initialCustomers,
  orders: initialOrders,
  activities: new Map<string, MockActivity>(),
  batches: new Map<string, MockBatch>(),
};
