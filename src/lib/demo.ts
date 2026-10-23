import { generateData, REGIONS } from "./data";
import { runDataQuality } from "./dq";
import { outcomeRank, screenAll } from "./rules";
import type { ComplianceCase, Finding, ScreeningResult } from "./types";

export const DATA = generateData();
export const RESULTS = screenAll(DATA);
export const DQ = runDataQuality(DATA);
export const CUSTOMERS = new Map(DATA.customers.map((c) => [c.id, c]));
export const PRODUCTS = new Map(DATA.products.map((p) => [p.id, p]));
export const LICENSES = new Map(DATA.licenses.map((l) => [l.id, l]));
export const TXNS = new Map(DATA.transactions.map((t) => [t.id, t]));
export const regionOf = (country: string) => REGIONS[country] ?? "Other";
export const txnValue = (t: { quantity: number; unitValue: number }) => t.quantity * t.unitValue;

const SEV_RANK = { high: 3, medium: 2, low: 1 } as const;
export function topFinding(r: ScreeningResult): Finding | undefined {
  return [...r.findings].sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity])[0];
}
export function priorityOf(r: ScreeningResult): "High" | "Medium" | "Low" {
  const t = topFinding(r);
  return !t ? "Low" : t.severity === "high" ? "High" : t.severity === "medium" ? "Medium" : "Low";
}

/** Seed a handful of cases from flagged transactions (deterministic). */
function buildSeedCases(): ComplianceCase[] {
  const flagged = DATA.transactions.filter((t) => RESULTS[t.id].status !== "Clear")
    .sort((a, b) => outcomeRank(RESULTS[b.id].status) - outcomeRank(RESULTS[a.id].status) || a.id.localeCompare(b.id));
  const plan: [ComplianceCase["status"], string][] = [
    ["Open", ""], ["In Review", "Requested address and registration documents from the customer."],
    ["Escalated", "Escalated for senior review: name similarity could not be dismissed."], ["Resolved", "Reviewed evidence; synthetic data corrected. No further action in demo."],
    ["Open", ""], ["In Review", "Waiting on classification reviewer."],
  ];
  return plan.flatMap(([status, note], i) => {
    const t = flagged[i * 2];
    if (!t) return [];
    const r = RESULTS[t.id];
    const created = `2026-06-${String(10 + i).padStart(2, "0")}T09:00:00.000Z`;
    const history = [{ at: created, actor: "System (seed)", action: "Case created from flagged transaction" }];
    const notes = note ? [{ at: `2026-06-${String(12 + i).padStart(2, "0")}T14:30:00.000Z`, author: t.reviewer, text: note }] : [];
    if (status !== "Open") history.push({ at: notes[0]?.at ?? created, actor: t.reviewer, action: `Status changed to ${status}` });
    return [{ id: `CASE-${String(i + 1).padStart(4, "0")}`, transactionId: t.id, category: topFinding(r)?.category ?? "General", priority: priorityOf(r),
      status, reviewer: t.reviewer, createdAt: created, updatedAt: history[history.length - 1].at, notes, history }];
  });
}
export const SEED_CASES: ComplianceCase[] = buildSeedCases();
