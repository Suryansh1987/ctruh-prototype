import { pgTable, uuid, text, integer, decimal, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { XRReport } from "@/lib/types";

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    identityIdx: uniqueIndex("contacts_email_phone_idx").on(table.email, table.phone),
  })
);

export const emailVerifications = pgTable("email_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export interface GlbEntry {
  productId: number;
  title: string;
  glbUrl: string;
  previewImageUrl: string | null;
  score: number;
}

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  storeUrl: text("store_url").notNull(),
  storeName: text("store_name"),
  productCount: integer("product_count"),
  xrReadinessScore: decimal("xr_readiness_score", { precision: 4, scale: 2 }),
  topOpportunities: jsonb("top_opportunities").$type<string[]>(),
  glbUrls: jsonb("glb_urls").$type<GlbEntry[]>(),
  pdfUrl: text("pdf_url"),
  reportData: jsonb("report_data").$type<XRReport>(),
  status: text("status").default("ready"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const tokenLogs = pgTable("token_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportId: uuid("report_id").references(() => reports.id, { onDelete: "cascade" }),
  operation: text("operation").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  imagesGenerated: integer("images_generated"),
  costUsd: decimal("cost_usd", { precision: 10, scale: 6 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const meshyTasks = pgTable("meshy_tasks", {
  taskId: text("task_id").primaryKey(),
  reportId: uuid("report_id").references(() => reports.id, { onDelete: "cascade" }).notNull(),
  productId: text("product_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type TokenLog = typeof tokenLogs.$inferSelect;
export type NewTokenLog = typeof tokenLogs.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type EmailVerification = typeof emailVerifications.$inferSelect;
export type NewEmailVerification = typeof emailVerifications.$inferInsert;
export type MeshyTask = typeof meshyTasks.$inferSelect;
export type NewMeshyTask = typeof meshyTasks.$inferInsert;
