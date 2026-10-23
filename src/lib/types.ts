export interface Customer {
  id: string; legalName: string; normalizedName: string; country: string; city: string;
  address: string; type: string; screeningStatus: string; lastScreened: string; source: string;
}
export interface Product {
  id: string; description: string; category: string; manufacturer: string;
  eccn: string | null; hts: string | null; origin: string;
  classificationDate: string | null; classificationSource: string;
}
export interface License {
  id: string; customerId: string; destination: string; validFrom: string; expiry: string;
  quantityLimit: number; evidenceRef: string | null;
}
export interface Transaction {
  id: string; orderRef: string; date: string; customerId: string; productId: string;
  quantity: number; unitValue: number; destination: string; origin: string;
  licenseId: string | null; reviewer: string;
}
export interface PartyListEntry { id: string; name: string }

export type Outcome = "Clear" | "Review Required" | "Data Hold" | "Potential Match";
export type Severity = "high" | "medium" | "low";
export type RuleCategory = "Party Screening" | "Product Data" | "License" | "Destination" | "Transaction Integrity";

export interface Finding {
  ruleId: string; ruleVersion: string; category: RuleCategory; severity: Severity;
  outcome: Exclude<Outcome, "Clear">; fields: string[]; explanation: string; action: string; source: string;
}
export interface ScreeningResult { transactionId: string; status: Outcome; findings: Finding[]; }

export interface DemoData {
  customers: Customer[]; products: Product[]; licenses: License[]; transactions: Transaction[];
}
export type CaseStatus = "Open" | "In Review" | "Escalated" | "Resolved";
export interface CaseNote { at: string; author: string; text: string }
export interface CaseHistory { at: string; actor: string; action: string }
export interface ComplianceCase {
  id: string; transactionId: string; category: string; priority: "High" | "Medium" | "Low";
  status: CaseStatus; reviewer: string; createdAt: string; updatedAt: string;
  notes: CaseNote[]; history: CaseHistory[];
}
export interface DqIssue {
  id: string; entity: "Customer" | "Product" | "License" | "Transaction"; entityId: string;
  severity: Severity; issue: string; action: string;
}
