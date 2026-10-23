import { describe, expect, it } from "vitest";
import { CLEAR_DISCLAIMER, destinationRule, integrityRules, licenseRules, partyRule, productRules, screenAll, statusFromFindings } from "./rules";
import { generateData } from "./data";
import { runDataQuality, validateProduct } from "./dq";
import { csvCell, toCsv } from "./csv";
import { normalizeName } from "./text";
import type { Customer, License, Product, Transaction } from "./types";

const cust = (legalName: string): Customer => ({ id: "C-X", legalName, normalizedName: normalizeName(legalName), country: "US", city: "A", address: "B", type: "t", screeningStatus: "", lastScreened: "", source: "" });
const prod = (o: Partial<Product> = {}): Product => ({ id: "P-X", description: "Widget", category: "c", manufacturer: "m", eccn: "3A991", hts: "8473.30.1180", origin: "US", classificationDate: "2026-01-01", classificationSource: "s", ...o });
const txn = (o: Partial<Transaction> = {}): Transaction => ({ id: "TX-X", orderRef: "SO-1", date: "2026-06-01", customerId: "C-X", productId: "P-X", quantity: 10, unitValue: 100, destination: "US", origin: "US", licenseId: null, reviewer: "r", ...o });
const lic = (o: Partial<License> = {}): License => ({ id: "LIC-DEMO-X", customerId: "C-X", destination: "US", validFrom: "2026-01-01", expiry: "2026-12-31", quantityLimit: 100, evidenceRef: "DEMO-DOC-1", ...o });

describe("party screening", () => {
  it("flags a normalized exact match as Potential Match, never confirmed", () => {
    const r = partyRule(cust("ZELMAR TRADING, F.Z.E."));
    expect(r[0].ruleId).toBe("PARTY-001");
    expect(r[0].outcome).toBe("Potential Match");
    expect(r[0].explanation).toMatch(/not a confirmed match/);
  });
  it("flags fuzzy matches at/above threshold and not below", () => {
    expect(partyRule(cust("Korvath Micro Systems Co"))[0].ruleId).toBe("PARTY-002");
    expect(partyRule(cust("Korvath Micro Systems Co"), undefined, 0.99)).toHaveLength(0);
    expect(partyRule(cust("Brightwell Compute Inc"))).toHaveLength(0);
  });
  it("handles missing customer", () => expect(partyRule(undefined)).toEqual([]));
});

describe("product data (ECCN and HTS are separate fields)", () => {
  it("flags missing ECCN without touching HTS", () => {
    const r = productRules(prod({ eccn: null }));
    expect(r.map((x) => x.ruleId)).toEqual(["PROD-001"]);
    expect(r[0].fields).toEqual(["product.eccn"]);
  });
  it("flags invalid HTS format only on the HTS field", () => {
    const r = productRules(prod({ hts: "8471.50" }));
    expect(r).toHaveLength(1);
    expect(r[0].fields).toEqual(["product.hts"]);
  });
  it("accepts EAR99 and rejects malformed ECCN", () => {
    expect(productRules(prod({ eccn: "EAR99" }))).toHaveLength(0);
    expect(productRules(prod({ eccn: "ABC" }))[0].ruleId).toBe("PROD-002");
  });
  it("stale boundary: 365 days ok, 366 flagged", () => {
    expect(productRules(prod({ classificationDate: "2025-06-30" }), "2026-06-30")).toHaveLength(0);
    expect(productRules(prod({ classificationDate: "2025-06-29" }), "2026-06-30")[0].ruleId).toBe("PROD-004");
    expect(productRules(prod({ classificationDate: null }))[0].ruleId).toBe("PROD-004");
  });
});

describe("license rules", () => {
  it("expiry boundary: same-day ok, next day flagged", () => {
    expect(licenseRules(txn({ licenseId: "L", date: "2026-12-31" }), lic(), 0)).toHaveLength(0);
    expect(licenseRules(txn({ licenseId: "L", date: "2027-01-01" }), lic(), 0)[0].ruleId).toBe("LIC-001");
  });
  it("quantity boundary: exactly at limit ok, one over flagged", () => {
    expect(licenseRules(txn({ licenseId: "L", quantity: 100 }), lic(), 0)).toHaveLength(0);
    expect(licenseRules(txn({ licenseId: "L", quantity: 101 }), lic(), 0)[0].ruleId).toBe("LIC-003");
    expect(licenseRules(txn({ licenseId: "L", quantity: 10 }), lic(), 95)[0].ruleId).toBe("LIC-003");
  });
  it("flags missing license only for review destinations", () => {
    expect(licenseRules(txn({ destination: "AE" }), undefined, 0)[0].ruleId).toBe("LIC-002");
    expect(licenseRules(txn({ destination: "US" }), undefined, 0)).toHaveLength(0);
  });
  it("flags unknown or inconsistent license linkage", () => {
    expect(licenseRules(txn({ licenseId: "NOPE" }), undefined, 0)[0].ruleId).toBe("LIC-004");
    expect(licenseRules(txn({ licenseId: "L" }), lic({ customerId: "C-Y" }), 0)[0].ruleId).toBe("LIC-004");
  });
});

describe("destination and integrity", () => {
  it("destination finding says it is not a legal prohibition", () => {
    const r = destinationRule(txn({ destination: "TR" }));
    expect(r[0].explanation).toMatch(/does not mean/);
    expect(destinationRule(txn({ destination: "US" }))).toHaveLength(0);
  });
  it("detects orphan refs, duplicate order refs and bad amounts", () => {
    const ids = integrityRules(txn({ quantity: 0 }), undefined, undefined, 2).map((x) => x.ruleId);
    expect(ids).toEqual(["INT-001", "INT-002", "INT-003", "INT-004"]);
    expect(integrityRules(txn(), cust("x"), prod(), 1)).toHaveLength(0);
  });
});

describe("status aggregation and safeguards", () => {
  it("never produces a confirmed-match status; clear carries a disclaimer", () => {
    const res = screenAll(generateData());
    const statuses = new Set(Object.values(res).map((r) => r.status));
    expect([...statuses].every((s) => ["Clear", "Review Required", "Data Hold", "Potential Match"].includes(s))).toBe(true);
    expect(CLEAR_DISCLAIMER).toMatch(/not legal authorization/);
  });
  it("potential match outranks data hold outranks review", () => {
    const mk = (outcome: "Potential Match" | "Data Hold" | "Review Required") => ({ outcome }) as never;
    expect(statusFromFindings([mk("Review Required"), mk("Potential Match"), mk("Data Hold")])).toBe("Potential Match");
    expect(statusFromFindings([])).toBe("Clear");
  });
});

describe("demo dataset", () => {
  const data = generateData();
  const res = screenAll(data);
  it("is deterministic and sized as specified", () => {
    expect(JSON.stringify(generateData())).toBe(JSON.stringify(data));
    expect(data.transactions.length).toBe(84);
    expect(data.customers.length).toBe(15);
    expect(data.products.length).toBe(10);
  });
  it("covers every flag type with a mix of clear and flagged", () => {
    const ids = new Set(Object.values(res).flatMap((r) => r.findings.map((f) => f.ruleId)));
    for (const id of ["PARTY-001", "PARTY-002", "PROD-001", "LIC-001", "DEST-001", "INT-001", "INT-003"]) expect(ids.has(id)).toBe(true);
    expect(Object.values(res).some((r) => r.status === "Clear")).toBe(true);
  });
  it("data quality finds seeded issues reproducibly", () => {
    const dq = runDataQuality(data);
    expect(dq).toEqual(runDataQuality(data));
    expect(dq.some((i) => i.issue.startsWith("Possible duplicate") && i.entity === "Customer")).toBe(true);
    expect(dq.some((i) => i.issue === "Missing ECCN")).toBe(true);
  });
  it("product validation detects duplicates and bad formats", () => {
    const errs = validateProduct({ description: "Cinder Memory Module 64GB", category: "Memory", eccn: "xx", hts: "" }, data.products);
    expect(errs.map((e) => e.field).sort()).toEqual(["description", "eccn", "hts"]);
  });
});

describe("csv", () => {
  it("escapes quotes/commas and neutralizes formula injection", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(toCsv([{ a: 1, b: "x" }])).toBe("a,b\n1,x");
  });
});
