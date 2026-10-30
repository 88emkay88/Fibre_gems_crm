import { pgTable, uuid, text, timestamp, date, integer, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";

export const appRoleEnum = pgEnum("app_role", ["admin", "team_leader", "agent"]);
export const customerStatusEnum = pgEnum("customer_status", [
  "new_lead",
  "contacted",
  "qualified",
  "order_submitted",
  "payment_pending",
  "activation_pending",
  "activated",
  "lost",
]);

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentCode: text("agent_code").unique(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  status: text("status").notNull().default("active"),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  role: appRoleEnum("role").notNull().default("agent"),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalCustomerId: text("external_customer_id").unique(),
  recordStatus: text("record_status").notNull().default("active"),
  firstName: text("first_name").notNull(),
  surname: text("surname").notNull(),
  fullName: text("full_name"),
  cellNumber: text("cell_number").notNull(),
  normalizedCell: text("normalized_cell").notNull().unique(),
  alternateCellNumber: text("alternate_cell_number"),
  email: text("email"),
  fullAddress: text("full_address"),
  areaSuburb: text("area_suburb"),
  productPackage: text("product_package"),
  paymentType: text("payment_type"),
  ownerId: uuid("owner_id").notNull().references(() => profiles.id),
  originalAgentId: uuid("original_agent_id").notNull().references(() => profiles.id),
  teamLeaderId: uuid("team_leader_id").references(() => profiles.id),
  status: customerStatusEnum("status").notNull().default("new_lead"),
  nextAction: text("next_action"),
  nextActionDate: date("next_action_date"),
  lastContactDate: date("last_contact_date"),
  createdBy: uuid("created_by").notNull().references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  externalOrderId: text("external_order_id").unique(),
  orderDate: date("order_date"),
  ovrNumber: text("ovr_number").unique(),
  ovkNumber: text("ovk_number").unique(),
  status: text("status").notNull().default("pending"),
  nextAction: text("next_action"),
  actionDate: date("action_date"),
  source: text("source").notNull().default("crm"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  promisedPaymentDate: date("promised_payment_date"),
  paymentDate: date("payment_date"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activations = pgTable("activations", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  activationDate: date("activation_date"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").notNull().references(() => profiles.id),
  actionType: text("action_type").notNull(),
  contactMethod: text("contact_method"),
  outcome: text("outcome"),
  customerStatusAfter: customerStatusEnum("customer_status_after"),
  nextAction: text("next_action"),
  nextActionDate: date("next_action_date"),
  escalationType: text("escalation_type"),
  escalationReason: text("escalation_reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dailyAgentActivity = pgTable("daily_agent_activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").notNull().references(() => profiles.id),
  activityDate: date("activity_date").notNull().defaultNow(),
  touchCount: integer("touch_count").notNull().default(0),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productMappings = pgTable("product_mappings", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceProduct: text("source_product").notNull().unique(),
  crmProduct: text("crm_product").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const agilityImportBatches = pgTable("agility_import_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  fileName: text("file_name").notNull(),
  fileHash: text("file_hash").notNull().unique(),
  status: text("status").notNull().default("staged"),
  rowCount: integer("row_count").notNull().default(0),
  newCount: integer("new_count").notNull().default(0),
  updatedCount: integer("updated_count").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  uploadedBy: uuid("uploaded_by").notNull().references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  committedAt: timestamp("committed_at", { withTimezone: true }),
});

export const agilityImportRows = pgTable("agility_import_rows", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id").notNull().references(() => agilityImportBatches.id, { onDelete: "cascade" }),
  rowNumber: integer("row_number").notNull(),
  rawData: jsonb("raw_data").notNull(),
  ovrNumber: text("ovr_number"),
  ovkNumber: text("ovk_number"),
  validationStatus: text("validation_status").notNull().default("pending"),
  validationErrors: jsonb("validation_errors").notNull().default([]),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
});
