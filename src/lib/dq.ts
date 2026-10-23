import type { DemoData, DqIssue, Product, Severity } from "./types";
import { alnumKey, daysBetween, similarity } from "./text";
import { ECCN_RE, HTS_RE, REFERENCE_DATE, STALE_DAYS } from "./rules";

export function validateProduct(p: Partial<Product>, existing: Product[] = []): { field: string; message: string }[] {
  const e: { field: string; message: string }[] = [];
  if (!p.description?.trim()) e.push({ field: "description", message: "Description is required." });
  if (!p.category?.trim()) e.push({ field: "category", message: "Category is required." });
  if (!p.eccn?.trim()) e.push({ field: "eccn", message: "ECCN is missing. Leave unknown records for an authorized reviewer; do not guess." });
  else if (!ECCN_RE.test(p.eccn.trim())) e.push({ field: "eccn", message: "ECCN format invalid (expected e.g. 3A991 or EAR99)." });
  if (!p.hts?.trim()) e.push({ field: "hts", message: "HTS code is missing." });
  else if (!HTS_RE.test(p.hts.trim())) e.push({ field: "hts", message: "HTS format invalid (expected NNNN.NN.NNNN)." });
  if (p.description?.trim()) {
    const k = alnumKey(p.description);
    const dup = existing.find((x) => x.id !== p.id && alnumKey(x.description) === k);
    if (dup) e.push({ field: "description", message: `Possible duplicate of ${dup.id} (${dup.description}).` });
  }
  return e;
}

export function runDataQuality(d: DemoData, ref = REFERENCE_DATE): DqIssue[] {
  const out: DqIssue[] = [];
  let n = 0;
  const add = (entity: DqIssue["entity"], entityId: string, severity: Severity, issue: string, action: string) =>
    out.push({ id: `DQ-${String(++n).padStart(3, "0")}`, entity, entityId, severity, issue, action });

  for (const c of d.customers) {
    if (!c.address.trim()) add("Customer", c.id, "medium", "Missing street address", "Obtain address from the customer record owner.");
    if (!c.city.trim()) add("Customer", c.id, "low", "Missing city", "Complete the city field.");
    if (!c.country.trim()) add("Customer", c.id, "high", "Missing country", "Complete the country field.");
  }
  for (let i = 0; i < d.customers.length; i++)
    for (let j = i + 1; j < d.customers.length; j++) {
      const a = d.customers[i], b = d.customers[j];
      if (similarity(a.normalizedName, b.normalizedName) >= 0.9)
        add("Customer", a.id, "medium", `Possible duplicate of ${b.id} ("${a.legalName}" / "${b.legalName}")`, "Manual review; merge or mark as distinct.");
    }
  for (const p of d.products) {
    if (!p.eccn?.trim()) add("Product", p.id, "high", "Missing ECCN", "Route to authorized classification reviewer.");
    else if (!ECCN_RE.test(p.eccn)) add("Product", p.id, "medium", `Invalid ECCN format "${p.eccn}"`, "Correct the ECCN.");
    if (!p.hts?.trim()) add("Product", p.id, "medium", "Missing HTS code", "Add HTS after tariff review.");
    else if (!HTS_RE.test(p.hts)) add("Product", p.id, "medium", `Invalid HTS format "${p.hts}"`, "Correct the HTS code.");
    if (p.classificationDate && daysBetween(p.classificationDate, ref) > STALE_DAYS)
      add("Product", p.id, "low", `Stale classification (last reviewed ${p.classificationDate})`, "Re-verify classification.");
  }
  for (let i = 0; i < d.products.length; i++)
    for (let j = i + 1; j < d.products.length; j++)
      if (alnumKey(d.products[i].description) === alnumKey(d.products[j].description))
        add("Product", d.products[i].id, "medium", `Possible duplicate of ${d.products[j].id}`, "Manual review; merge or mark as distinct.");
  for (const l of d.licenses) {
    if (!l.evidenceRef) add("License", l.id, "medium", "Missing supporting document reference", "Attach evidence reference.");
    if (l.expiry < ref) add("License", l.id, "medium", `License record expired ${l.expiry}`, "Confirm status; renew or retire the record.");
  }
  const cust = new Set(d.customers.map((c) => c.id)), prod = new Set(d.products.map((p) => p.id));
  for (const t of d.transactions) {
    if (!cust.has(t.customerId)) add("Transaction", t.id, "high", `Orphaned customer reference ${t.customerId}`, "Correct the customer reference.");
    if (!prod.has(t.productId)) add("Transaction", t.id, "high", `Orphaned product reference ${t.productId}`, "Correct the product reference.");
  }
  return out;
}
