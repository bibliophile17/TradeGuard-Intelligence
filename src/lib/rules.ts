import type { Customer, DemoData, Finding, License, Outcome, PartyListEntry, Product, ScreeningResult, Transaction } from "./types";
import { daysBetween, normalizeName, similarity } from "./text";

export const RULE_VERSION = "1.0.0";
export const REFERENCE_DATE = "2026-06-30"; // fixed "as-of" date so the demo is deterministic
export const FUZZY_THRESHOLD = 0.85;
export const STALE_DAYS = 365;
export const ECCN_RE = /^(EAR99|\d[A-E]\d{3}(\.[a-z0-9]+)*)$/i;
export const HTS_RE = /^\d{4}\.\d{2}\.\d{4}$/;

export const SYNTHETIC_SOURCE = "Synthetic demo rule (not a legal determination)";
export const CLEAR_DISCLAIMER =
  "Clear means no synthetic demo rule fired. It is not legal authorization or a guarantee that a transaction is permitted.";

/** FICTIONAL training entries. They are not real restricted parties. */
export const SYNTHETIC_PARTY_LIST: PartyListEntry[] = [
  { id: "SYN-001", name: "Korvath Microsystems Ltd" },
  { id: "SYN-002", name: "Zelmar Trading FZE" },
  { id: "SYN-003", name: "Orvane Technical Supply" },
  { id: "SYN-004", name: "Tessaly Procurement Group" },
  { id: "SYN-005", name: "Velmora Components Trading" },
];
/** Synthetic destination review list. Not a legal list; reviewers must consult current official guidance. */
export const SYNTHETIC_REVIEW_DESTINATIONS = ["AE", "TR", "VN"];

type FindingInput = Omit<Finding, "ruleVersion" | "source">;
const f = (x: FindingInput): Finding => ({ ruleVersion: RULE_VERSION, source: SYNTHETIC_SOURCE, ...x });

export function partyRule(c: Customer | undefined, list: PartyListEntry[] = SYNTHETIC_PARTY_LIST, threshold = FUZZY_THRESHOLD): Finding[] {
  if (!c) return [];
  const n = normalizeName(c.legalName);
  let best: { e: PartyListEntry; s: number } | null = null;
  for (const e of list) {
    const s = similarity(n, normalizeName(e.name));
    if (!best || s > best.s) best = { e, s };
  }
  if (!best) return [];
  if (best.s === 1)
    return [f({ ruleId: "PARTY-001", category: "Party Screening", severity: "high", outcome: "Potential Match", fields: ["customer.legalName"],
      explanation: `Normalized name "${n}" equals synthetic training entry ${best.e.id}. This is a name comparison only, not a confirmed match.`,
      action: "Human reviewer must compare address, identifiers and context against the official Consolidated Screening List before any decision." })];
  if (best.s >= threshold)
    return [f({ ruleId: "PARTY-002", category: "Party Screening", severity: "medium", outcome: "Potential Match", fields: ["customer.legalName"],
      explanation: `Normalized name "${n}" is ${(best.s * 100).toFixed(0)}% similar to synthetic training entry ${best.e.id} (threshold ${(threshold * 100).toFixed(0)}%). Similarity does not establish identity.`,
      action: "Human review required to confirm or dismiss the possible name match." })];
  return [];
}

export function productRules(p: Product | undefined, ref = REFERENCE_DATE): Finding[] {
  if (!p) return [];
  const out: Finding[] = [];
  if (!p.eccn?.trim())
    out.push(f({ ruleId: "PROD-001", category: "Product Data", severity: "high", outcome: "Data Hold", fields: ["product.eccn"],
      explanation: `Product ${p.id} has no ECCN on record. The app never infers a classification from a product name.`,
      action: "Route to an authorized classification reviewer; record the ECCN and its source." }));
  else if (!ECCN_RE.test(p.eccn.trim()))
    out.push(f({ ruleId: "PROD-002", category: "Product Data", severity: "medium", outcome: "Data Hold", fields: ["product.eccn"],
      explanation: `ECCN value "${p.eccn}" does not match the expected format (e.g. 3A991 or EAR99).`, action: "Correct the ECCN in the product master." }));
  if (!p.hts?.trim())
    out.push(f({ ruleId: "PROD-003", category: "Product Data", severity: "medium", outcome: "Data Hold", fields: ["product.hts"],
      explanation: `Product ${p.id} has no HTS code on record (stored separately from ECCN).`, action: "Add the HTS code after tariff-classification review." }));
  else if (!HTS_RE.test(p.hts.trim()))
    out.push(f({ ruleId: "PROD-003", category: "Product Data", severity: "medium", outcome: "Data Hold", fields: ["product.hts"],
      explanation: `HTS value "${p.hts}" does not match the 10-digit format NNNN.NN.NNNN.`, action: "Correct the HTS code in the product master." }));
  if (!p.classificationDate)
    out.push(f({ ruleId: "PROD-004", category: "Product Data", severity: "low", outcome: "Review Required", fields: ["product.classificationDate"],
      explanation: "No classification review date on record.", action: "Record the date of the last classification review." }));
  else if (daysBetween(p.classificationDate, ref) > STALE_DAYS)
    out.push(f({ ruleId: "PROD-004", category: "Product Data", severity: "low", outcome: "Review Required", fields: ["product.classificationDate"],
      explanation: `Classification last reviewed ${p.classificationDate}, more than ${STALE_DAYS} days before ${ref}.`, action: "Re-verify the classification and update the review date." }));
  return out;
}

export function destinationRule(t: Transaction, list: string[] = SYNTHETIC_REVIEW_DESTINATIONS): Finding[] {
  if (!list.includes(t.destination)) return [];
  return [f({ ruleId: "DEST-001", category: "Destination", severity: "medium", outcome: "Review Required", fields: ["transaction.destination"],
    explanation: `Destination ${t.destination} is on the synthetic destination review list. This does not mean the destination is legally restricted.`,
    action: "Reviewer must assess current official BIS guidance for this destination and item." })];
}

export function licenseRules(t: Transaction, lic: License | undefined, usedBefore: number, list: string[] = SYNTHETIC_REVIEW_DESTINATIONS): Finding[] {
  const out: Finding[] = [];
  if (!t.licenseId) {
    if (list.includes(t.destination))
      out.push(f({ ruleId: "LIC-002", category: "License", severity: "medium", outcome: "Review Required", fields: ["transaction.licenseId", "transaction.destination"],
        explanation: `Destination ${t.destination} requires review and no internal license record is linked.`, action: "Obtain and attach license evidence, or document why none applies." }));
    return out;
  }
  if (!lic)
    return [f({ ruleId: "LIC-004", category: "License", severity: "medium", outcome: "Data Hold", fields: ["transaction.licenseId"],
      explanation: `Transaction references license ${t.licenseId}, which does not exist in the license register.`, action: "Correct the license reference." })];
  if (t.date > lic.expiry || t.date < lic.validFrom)
    out.push(f({ ruleId: "LIC-001", category: "License", severity: "high", outcome: "Review Required", fields: ["license.expiry", "transaction.date"],
      explanation: `Transaction date ${t.date} is outside the validity window of ${lic.id} (${lic.validFrom} to ${lic.expiry}). Illustrative internal record only.`,
      action: "Hold for review; confirm whether valid authorization exists." }));
  if (lic.customerId !== t.customerId || lic.destination !== t.destination)
    out.push(f({ ruleId: "LIC-004", category: "License", severity: "medium", outcome: "Data Hold", fields: ["license.customerId", "license.destination"],
      explanation: `${lic.id} is recorded for ${lic.customerId}/${lic.destination} but the transaction is ${t.customerId}/${t.destination}.`, action: "Correct the license linkage." }));
  if (usedBefore + t.quantity > lic.quantityLimit)
    out.push(f({ ruleId: "LIC-003", category: "License", severity: "medium", outcome: "Review Required", fields: ["transaction.quantity", "license.quantityLimit"],
      explanation: `Cumulative quantity ${usedBefore + t.quantity} would exceed the demo limit of ${lic.quantityLimit} on ${lic.id}.`, action: "Review remaining limit before release." }));
  return out;
}

export function integrityRules(t: Transaction, c: Customer | undefined, p: Product | undefined, orderRefCount: number): Finding[] {
  const out: Finding[] = [];
  if (!c) out.push(f({ ruleId: "INT-001", category: "Transaction Integrity", severity: "high", outcome: "Data Hold", fields: ["transaction.customerId"],
    explanation: `Customer reference "${t.customerId}" does not exist in the customer master.`, action: "Correct the customer reference." }));
  if (!p) out.push(f({ ruleId: "INT-002", category: "Transaction Integrity", severity: "high", outcome: "Data Hold", fields: ["transaction.productId"],
    explanation: `Product reference "${t.productId}" does not exist in the product master.`, action: "Correct the product reference." }));
  if (orderRefCount > 1) out.push(f({ ruleId: "INT-003", category: "Transaction Integrity", severity: "medium", outcome: "Review Required", fields: ["transaction.orderRef"],
    explanation: `Order reference ${t.orderRef} appears on ${orderRefCount} transactions.`, action: "Confirm whether this is a duplicate entry." }));
  if (!(t.quantity > 0) || !(t.unitValue > 0)) out.push(f({ ruleId: "INT-004", category: "Transaction Integrity", severity: "medium", outcome: "Data Hold", fields: ["transaction.quantity", "transaction.unitValue"],
    explanation: "Quantity and unit value must both be greater than zero.", action: "Correct the transaction amounts." }));
  return out;
}

const RANK: Record<Outcome, number> = { Clear: 0, "Review Required": 1, "Data Hold": 2, "Potential Match": 3 };
export const outcomeRank = (o: Outcome): number => RANK[o];

export function statusFromFindings(findings: Finding[]): Outcome {
  return findings.reduce<Outcome>((acc, x) => (RANK[x.outcome] > RANK[acc] ? x.outcome : acc), "Clear");
}

export function screenAll(data: DemoData): Record<string, ScreeningResult> {
  const cm = new Map(data.customers.map((c) => [c.id, c]));
  const pm = new Map(data.products.map((p) => [p.id, p]));
  const lm = new Map(data.licenses.map((l) => [l.id, l]));
  const refCount = new Map<string, number>();
  data.transactions.forEach((t) => refCount.set(t.orderRef, (refCount.get(t.orderRef) ?? 0) + 1));
  const used = new Map<string, number>();
  const sorted = [...data.transactions].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const out: Record<string, ScreeningResult> = {};
  for (const t of sorted) {
    const before = t.licenseId ? used.get(t.licenseId) ?? 0 : 0;
    const c = cm.get(t.customerId), p = pm.get(t.productId);
    const findings = [
      ...partyRule(c), ...productRules(p), ...destinationRule(t),
      ...licenseRules(t, t.licenseId ? lm.get(t.licenseId) : undefined, before),
      ...integrityRules(t, c, p, refCount.get(t.orderRef) ?? 0),
    ];
    if (t.licenseId) used.set(t.licenseId, before + t.quantity);
    out[t.id] = { transactionId: t.id, status: statusFromFindings(findings), findings };
  }
  return out;
}
