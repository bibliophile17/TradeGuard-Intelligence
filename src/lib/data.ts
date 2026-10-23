import type { Customer, DemoData, License, Product, Transaction } from "./types";
import { normalizeName } from "./text";

/** Deterministic PRNG (mulberry32) so the demo dataset is identical on every load. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const addDays = (base: string, n: number) => new Date(Date.parse(base) + n * 86_400_000).toISOString().slice(0, 10);

const C = (id: string, legalName: string, country: string, city: string, address: string, type: string, screened: string): Customer => ({
  id, legalName, normalizedName: normalizeName(legalName), country, city, address, type,
  screeningStatus: "Screened (synthetic)", lastScreened: screened, source: "Synthetic seed",
});

export const REGIONS: Record<string, string> = {
  US: "Americas", CA: "Americas", MX: "Americas", GB: "EMEA", DE: "EMEA", NO: "EMEA", IL: "EMEA", AE: "EMEA", TR: "EMEA",
  JP: "APAC", SG: "APAC", TW: "APAC", AU: "APAC", VN: "APAC", MY: "APAC",
};

export function generateData(): DemoData {
  const customers: Customer[] = [
    C("C-001", "Aldervane Systems Ltd", "GB", "Reading", "12 Quarry Lane", "Data center operator", "2026-05-12"),
    C("C-002", "Aldervane Systems Limited", "GB", "Reading", "12 Quarry Lane", "Data center operator", "2026-05-12"),
    C("C-003", "Brightwell Compute Inc", "US", "Austin", "400 Mesa Parkway", "Cloud provider", "2026-06-02"),
    C("C-004", "Cobalt Ridge Data Centers LLC", "US", "Reno", "88 Sierra Blvd", "Data center operator", "2026-04-20"),
    C("C-005", "Daimyo Photonics KK", "JP", "Osaka", "3-7 Umeda Kita", "Research lab", "2026-03-18"),
    C("C-006", "Eastmere Cloud Services Pte Ltd", "SG", "Singapore", "21 Harbour Road", "Cloud provider", "2026-06-10"),
    C("C-007", "Fjordline Analytics AS", "NO", "Bergen", "5 Bryggen Gate", "Analytics firm", "2026-02-27"),
    C("C-008", "Gallant Robotics GmbH", "DE", "Stuttgart", "17 Werkstrasse", "OEM", "2026-05-30"),
    C("C-009", "Helion Quantum Labs Ltd", "IL", "Haifa", "9 Technion Way", "Research lab", "2026-01-15"),
    C("C-010", "Ironbark Logistics Pty Ltd", "AU", "Perth", "62 Freight Street", "Distributor", "2026-04-04"),
    C("C-011", "Jadestone Electronics Co Ltd", "TW", "Hsinchu", "8 Science Park Rd", "Distributor", "2026-06-18"),
    C("C-012", "Korvath Micro Systems Co", "AE", "Dubai", "Unit 14, Marina Tower", "Distributor", "2026-05-05"),
    C("C-013", "Zelmar Trading FZE", "AE", "Sharjah", "Plot 31, Free Zone", "Distributor", "2026-05-05"),
    C("C-014", "Tessaly Procurement Grp", "CA", "Toronto", "", "Distributor", "2026-03-03"),
    C("C-015", "Meridian Holdings", "TR", "", "", "Distributor", "2025-11-20"),
  ];
  const P = (id: string, description: string, category: string, eccn: string | null, hts: string | null, origin: string, cd: string | null): Product => ({
    id, description, category, manufacturer: "Northgate Semiconductor (fictional)", eccn, hts, origin,
    classificationDate: cd, classificationSource: eccn ? "Internal review (synthetic)" : "Unknown",
  });
  // ECCN/HTS values are illustrative placeholders, not real classifications.
  const products: Product[] = [
    P("P-001", "Vireon X100 Accelerator Card", "Accelerator", "3A991", "8473.30.1180", "TW", "2025-11-02"),
    P("P-002", "Vireon X200 Accelerator Card", "Accelerator", "4A994", "8473.30.1180", "TW", "2026-01-20"),
    P("P-003", "Halcyon G4 Graphics Processor", "GPU", "3A991", "8542.31.0000", "TW", "2025-12-12"),
    P("P-004", "Halcyon Edge Inference Module", "Edge module", null, "8471.50.0150", "MY", null),
    P("P-005", "Northgate NV-Link Switch", "Networking", "5A991", "8517.62.0090", "US", "2026-02-14"),
    P("P-006", "Northgate Server Board S9", "Server board", "4A994", "8471.50", "MY", "2026-03-01"),
    P("P-007", "Cinder Memory Module 64GB", "Memory", "3A991", "8473.30.1180", "MY", "2024-09-10"),
    P("P-008", "Cinder Memory Module 64 GB", "Memory", null, null, "MY", null),
    P("P-009", "Kestrel Liquid Cooling Kit", "Cooling", "EAR99", "8419.50.5000", "US", "2026-01-15"),
    P("P-010", "Kestrel Firmware License Pack", "Software", "5D992", "8523.49.1000", "US", "2026-04-09"),
  ];
  const L = (n: number, customerId: string, destination: string, validFrom: string, expiry: string, quantityLimit: number, ev: boolean): License => ({
    id: `LIC-DEMO-${String(n).padStart(3, "0")}`, customerId, destination, validFrom, expiry, quantityLimit,
    evidenceRef: ev ? `DEMO-DOC-${String(n).padStart(4, "0")}` : null,
  });
  const licenses: License[] = [
    L(1, "C-012", "AE", "2025-07-01", "2026-03-31", 80, true),
    L(2, "C-013", "AE", "2026-01-01", "2027-01-31", 60, true),
    L(3, "C-006", "SG", "2026-01-01", "2026-12-31", 400, true),
    L(4, "C-011", "TW", "2026-02-01", "2026-08-15", 150, true),
    L(5, "C-009", "IL", "2025-01-01", "2025-12-31", 100, true),
    L(6, "C-005", "JP", "2026-03-01", "2027-03-01", 120, true),
    L(7, "C-001", "GB", "2026-01-01", "2026-12-31", 90, true),
    L(8, "C-014", "CA", "2026-04-01", "2027-03-31", 50, false),
  ];
  const unit: Record<string, number> = { "P-001": 9200, "P-002": 14800, "P-003": 3100, "P-004": 1900, "P-005": 4200, "P-006": 6700, "P-007": 640, "P-008": 640, "P-009": 520, "P-010": 150 };
  const reviewers = ["A. Rivera (demo)", "J. Okafor (demo)", "M. Lindqvist (demo)"];
  const r = rng(20260630);
  const transactions: Transaction[] = [];
  const total = 84;
  for (let i = 0; i < total; i++) {
    const cust = customers[Math.floor(r() * customers.length)];
    const prod = products[Math.floor(r() * products.length)];
    const qty = 1 + Math.floor(r() * r() * 120);
    const diverted = r() < 0.12;
    const alt = ["TR", "VN", "SG", "DE"][Math.floor(r() * 4)];
    const origin = ["US", "TW", "MY"][Math.floor(r() * 3)];
    const hasLic = r() < 0.75;
    const rev = reviewers[Math.floor(r() * reviewers.length)];
    const lic = hasLic ? licenses.find((l) => l.customerId === cust.id) : undefined;
    transactions.push({
      id: `TX-${1001 + i}`, orderRef: `SO-26-${1000 + i}`, date: addDays("2026-01-05", Math.min(175, Math.floor(i * 2.05))),
      customerId: cust.id, productId: prod.id, quantity: qty, unitValue: unit[prod.id],
      destination: diverted ? alt : cust.country, origin, licenseId: lic ? lic.id : null, reviewer: rev,
    });
  }
  transactions[30].orderRef = transactions[12].orderRef; // seeded duplicate order reference
  transactions[55].customerId = "C-099"; // seeded orphan customer reference
  return { customers, products, licenses, transactions };
}
