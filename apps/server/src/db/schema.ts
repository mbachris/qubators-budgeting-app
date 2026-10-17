import { pgTable, text, timestamp, boolean, bigint, integer, doublePrecision, uuid } from "drizzle-orm/pg-core";

// ---- Better Auth required tables (email OTP / magic link) ----
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---- Domain mirror (server truth online; phone SQLite is truth offline) ----
export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  percent: doublePrecision("percent").notNull(),
  kind: text("kind").notNull(),
  sort: integer("sort").notNull().default(0),
  userId: text("user_id"),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  isDeleted: boolean("is_deleted").notNull().default(false),
  rev: integer("rev").notNull().default(1),
});

export const incomeEntries = pgTable("income_entries", {
  id: text("id").primaryKey(),
  amountMinor: integer("amount_minor").notNull(),
  currency: text("currency").notNull().default("BIF"),
  note: text("note"),
  occurredAt: bigint("occurred_at", { mode: "number" }).notNull(),
  userId: text("user_id"),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  isDeleted: boolean("is_deleted").notNull().default(false),
  rev: integer("rev").notNull().default(1),
});

export const expenses = pgTable("expenses", {
  id: text("id").primaryKey(),
  categoryId: text("category_id").notNull(),
  amountMinor: integer("amount_minor").notNull(),
  note: text("note"),
  occurredAt: bigint("occurred_at", { mode: "number" }).notNull(),
  userId: text("user_id"),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  isDeleted: boolean("is_deleted").notNull().default(false),
  rev: integer("rev").notNull().default(1),
});

export const contributions = pgTable("contributions", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  amountMinor: integer("amount_minor").notNull(),
  deviceId: text("device_id"),
  userId: text("user_id"),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  isDeleted: boolean("is_deleted").notNull().default(false),
  rev: integer("rev").notNull().default(1),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  goalMinor: integer("goal_minor").notNull(),
  raisedMinor: integer("raised_minor").notNull().default(0),
  coverUrl: text("cover_url"),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
