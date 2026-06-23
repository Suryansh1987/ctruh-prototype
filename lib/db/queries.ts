import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { contacts, emailVerifications, meshyTasks, reports, tokenLogs } from "@/lib/db/schema";
import type { GlbEntry } from "@/lib/db/schema";
import type { TokenUsageEntry, XRReport } from "@/lib/types";

export type ReportWithTokens = {
  id: string;
  contactEmail: string | null;
  contactPhone: string | null;
  storeUrl: string;
  storeName: string | null;
  productCount: number | null;
  xrReadinessScore: string | null;
  topOpportunities: string[] | null;
  glbUrls: GlbEntry[] | null;
  pdfUrl: string | null;
  reportData: XRReport | null;
  status: string | null;
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
  glbUrls?: GlbEntry[];
  pdfUrl?: string;
  reportData?: XRReport;
  status?: string;
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
      glbUrls: params.glbUrls ?? null,
      pdfUrl: params.pdfUrl ?? null,
      reportData: params.reportData ?? null,
      status: params.status ?? "ready",
    })
    .returning({ id: reports.id });
  return row.id;
}

export async function updateReport(
  id: string,
  patch: {
    glbUrls?: GlbEntry[];
    pdfUrl?: string;
    reportData?: XRReport;
    status?: string;
  }
): Promise<void> {
  const db = getDb();
  await db
    .update(reports)
    .set({
      ...(patch.glbUrls !== undefined ? { glbUrls: patch.glbUrls } : {}),
      ...(patch.pdfUrl !== undefined ? { pdfUrl: patch.pdfUrl } : {}),
      ...(patch.reportData !== undefined ? { reportData: patch.reportData } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
    })
    .where(eq(reports.id, id));
}

export async function getReportById(id: string): Promise<ReportWithTokens | null> {
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
      glbUrls: reports.glbUrls,
      pdfUrl: reports.pdfUrl,
      reportData: reports.reportData,
      status: reports.status,
      createdAt: reports.createdAt,
      totalInputTokens: sql<string>`COALESCE(SUM(${tokenLogs.inputTokens}), 0)`,
      totalOutputTokens: sql<string>`COALESCE(SUM(${tokenLogs.outputTokens}), 0)`,
      totalCostUsd: sql<string>`COALESCE(SUM(${tokenLogs.costUsd}), 0)`,
      operationCount: sql<string>`COUNT(${tokenLogs.id})`,
    })
    .from(reports)
    .leftJoin(tokenLogs, eq(tokenLogs.reportId, reports.id))
    .where(eq(reports.id, id))
    .groupBy(reports.id)
    .limit(1);

  return (rows[0] as ReportWithTokens) ?? null;
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

export async function insertMeshyTask(params: {
  taskId: string;
  reportId: string;
  productId: number | string;
}): Promise<void> {
  const db = getDb();
  await db.insert(meshyTasks).values({
    taskId: params.taskId,
    reportId: params.reportId,
    productId: String(params.productId),
  }).onConflictDoNothing();
}

export async function getMeshyTaskByTaskId(taskId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(meshyTasks)
    .where(eq(meshyTasks.taskId, taskId))
    .limit(1);

  return row ?? null;
}

export async function markMeshyTaskCompleted(taskId: string): Promise<void> {
  const db = getDb();
  await db
    .update(meshyTasks)
    .set({ completedAt: new Date() })
    .where(eq(meshyTasks.taskId, taskId));
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
      glbUrls: reports.glbUrls,
      pdfUrl: reports.pdfUrl,
      reportData: reports.reportData,
      status: reports.status,
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
      glbUrls: reports.glbUrls,
      pdfUrl: reports.pdfUrl,
      reportData: reports.reportData,
      status: reports.status,
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
