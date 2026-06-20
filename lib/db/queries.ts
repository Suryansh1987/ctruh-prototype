import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { contacts, emailVerifications, reports, tokenLogs } from "@/lib/db/schema";
import type { TokenUsageEntry } from "@/lib/types";

export type ReportWithTokens = {
  id: string;
  contactEmail: string | null;
  contactPhone: string | null;
  storeUrl: string;
  storeName: string | null;
  productCount: number | null;
  xrReadinessScore: string | null;
  topOpportunities: string[] | null;
  pdfUrl: string | null;
  createdAt: Date | null;
  totalInputTokens: string;
  totalOutputTokens: string;
  totalCostUsd: string;
  operationCount: string;
};

export async function upsertVerificationCode(params: {
  email: string;
  phone: string;
  code: string;
  expiresAt: Date;
}): Promise<void> {
  const db = getDb();

  await db
    .delete(emailVerifications)
    .where(and(eq(emailVerifications.email, params.email), eq(emailVerifications.phone, params.phone), isNull(emailVerifications.consumedAt)));

  await db.insert(emailVerifications).values({
    email: params.email,
    phone: params.phone,
    code: params.code,
    expiresAt: params.expiresAt,
  });
}

export async function verifyContactCode(params: {
  email: string;
  phone: string;
  code: string;
}): Promise<boolean> {
  const db = getDb();
  const now = new Date();

  const [verification] = await db
    .select()
    .from(emailVerifications)
    .where(
      and(
        eq(emailVerifications.email, params.email),
        eq(emailVerifications.phone, params.phone),
        eq(emailVerifications.code, params.code),
        isNull(emailVerifications.consumedAt),
        gt(emailVerifications.expiresAt, now)
      )
    )
    .orderBy(desc(emailVerifications.createdAt))
    .limit(1);

  if (!verification) return false;

  await db
    .update(emailVerifications)
    .set({ consumedAt: now })
    .where(eq(emailVerifications.id, verification.id));

  const [existingContact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.email, params.email), eq(contacts.phone, params.phone)))
    .limit(1);

  if (existingContact) {
    await db
      .update(contacts)
      .set({ emailVerifiedAt: now })
      .where(eq(contacts.id, existingContact.id));
  } else {
    await db.insert(contacts).values({
      email: params.email,
      phone: params.phone,
      emailVerifiedAt: now,
    });
  }

  return true;
}

export async function getVerifiedContact(params: {
  email: string;
  phone: string;
}) {
  const db = getDb();
  const [contact] = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.email, params.email),
        eq(contacts.phone, params.phone)
      )
    )
    .limit(1);

  if (!contact?.emailVerifiedAt) return null;
  return contact;
}

export async function insertReport(params: {
  contactId?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  storeUrl: string;
  storeName: string;
  productCount: number;
  xrReadinessScore: number;
  topOpportunities: string[];
  pdfUrl?: string;
}): Promise<string> {
  const db = getDb();
  const [row] = await db
    .insert(reports)
    .values({
      contactId: params.contactId ?? null,
      contactEmail: params.contactEmail ?? null,
      contactPhone: params.contactPhone ?? null,
      storeUrl: params.storeUrl,
      storeName: params.storeName,
      productCount: params.productCount,
      xrReadinessScore: params.xrReadinessScore.toFixed(2),
      topOpportunities: params.topOpportunities,
      pdfUrl: params.pdfUrl ?? null,
    })
    .returning({ id: reports.id });
  return row.id;
}

export async function insertTokenLogs(
  reportId: string,
  entries: TokenUsageEntry[]
): Promise<void> {
  if (entries.length === 0) return;
  const db = getDb();
  await db.insert(tokenLogs).values(
    entries.map((e) => ({
      reportId,
      operation: e.operation,
      model: e.model,
      inputTokens: e.inputTokens ?? null,
      outputTokens: e.outputTokens ?? null,
      imagesGenerated: e.imagesGenerated ?? null,
      costUsd: e.costUsd.toFixed(6),
    }))
  );
}

export async function getAllReportsWithTokens(): Promise<ReportWithTokens[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: reports.id,
      contactEmail: reports.contactEmail,
      contactPhone: reports.contactPhone,
      storeUrl: reports.storeUrl,
      storeName: reports.storeName,
      productCount: reports.productCount,
      xrReadinessScore: reports.xrReadinessScore,
      topOpportunities: reports.topOpportunities,
      pdfUrl: reports.pdfUrl,
      createdAt: reports.createdAt,
      totalInputTokens: sql<string>`COALESCE(SUM(${tokenLogs.inputTokens}), 0)`,
      totalOutputTokens: sql<string>`COALESCE(SUM(${tokenLogs.outputTokens}), 0)`,
      totalCostUsd: sql<string>`COALESCE(SUM(${tokenLogs.costUsd}), 0)`,
      operationCount: sql<string>`COUNT(${tokenLogs.id})`,
    })
    .from(reports)
    .leftJoin(tokenLogs, eq(tokenLogs.reportId, reports.id))
    .groupBy(reports.id)
    .orderBy(desc(reports.createdAt));

  return rows as ReportWithTokens[];
}

export async function getReportsByContact(params: {
  email: string;
  phone: string;
}): Promise<ReportWithTokens[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: reports.id,
      contactEmail: reports.contactEmail,
      contactPhone: reports.contactPhone,
      storeUrl: reports.storeUrl,
      storeName: reports.storeName,
      productCount: reports.productCount,
      xrReadinessScore: reports.xrReadinessScore,
      topOpportunities: reports.topOpportunities,
      pdfUrl: reports.pdfUrl,
      createdAt: reports.createdAt,
      totalInputTokens: sql<string>`COALESCE(SUM(${tokenLogs.inputTokens}), 0)`,
      totalOutputTokens: sql<string>`COALESCE(SUM(${tokenLogs.outputTokens}), 0)`,
      totalCostUsd: sql<string>`COALESCE(SUM(${tokenLogs.costUsd}), 0)`,
      operationCount: sql<string>`COUNT(${tokenLogs.id})`,
    })
    .from(reports)
    .leftJoin(tokenLogs, eq(tokenLogs.reportId, reports.id))
    .where(and(eq(reports.contactEmail, params.email), eq(reports.contactPhone, params.phone)))
    .groupBy(reports.id)
    .orderBy(desc(reports.createdAt));

  return rows as ReportWithTokens[];
}
