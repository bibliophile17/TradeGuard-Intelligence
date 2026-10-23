"use client";
import { useMemo } from "react";
import { Btn, Card, PageHeader, fmtMoney } from "@/components/ui";
import { downloadCsv, toCsv } from "@/lib/csv";
import { CUSTOMERS, DATA, DQ, PRODUCTS, RESULTS, txnValue } from "@/lib/demo";
import { useStore } from "@/lib/store";

export default function Reports() {
  const { cases, notify } = useStore();
  const m = useMemo(() => {
    const byStatus: Record<string, number> = {}, byRule = new Map<string, { n: number; cat: string }>();
    let flaggedValue = 0, totalValue = 0;
    for (const t of DATA.transactions) {
      const r = RESULTS[t.id];
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      totalValue += txnValue(t);
      if (r.status !== "Clear") flaggedValue += txnValue(t);
      r.findings.forEach((f) => byRule.set(f.ruleId, { n: (byRule.get(f.ruleId)?.n ?? 0) + 1, cat: f.category }));
    }
    return { byStatus, rules: [...byRule].sort((a, b) => b[1].n - a[1].n), flaggedValue, totalValue };
  }, []);
  const total = DATA.transactions.length;
  const pct = (n: number) => `${((n / total) * 100).toFixed(1)}%`;

  const exportTxns = () => {
    downloadCsv("transactions.csv", toCsv(DATA.transactions.map((t) => { const r = RESULTS[t.id]; return {
      transaction_id: t.id, order_ref: t.orderRef, date: t.date, customer: CUSTOMERS.get(t.customerId)?.legalName ?? "(missing)", product: PRODUCTS.get(t.productId)?.description ?? "(missing)",
      destination: t.destination, quantity: t.quantity, value_usd: txnValue(t), screening_status: r.status, rule_ids: r.findings.map((f) => f.ruleId).join(" | "), synthetic: "yes" }; })));
    notify("Exported transactions.csv");
  };
  const exportCases = () => {
    if (cases.length === 0) { notify("There are no cases to export.", "err"); return; }
    downloadCsv("cases.csv", toCsv(cases.map((c) => ({ case_id: c.id, transaction_id: c.transactionId, category: c.category, priority: c.priority, status: c.status, reviewer: c.reviewer, created: c.createdAt, updated: c.updatedAt, notes: c.notes.length, synthetic: "yes" }))));
    notify("Exported cases.csv");
  };
  const exportDq = () => { downloadCsv("data-quality-issues.csv", toCsv(DQ.map((i) => ({ ...i })))); notify("Exported data-quality-issues.csv"); };

  return (
    <>
      <PageHeader title="Reports" subtitle="Summary metrics are calculated from the synthetic demo data and are illustrative only."
        actions={<><Btn onClick={exportTxns}>Transactions CSV</Btn><Btn onClick={exportCases}>Cases CSV</Btn><Btn onClick={exportDq}>Data-quality CSV</Btn></>} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-slate-800">Screening outcomes</h2>
          <table className="mt-2 w-full text-sm"><tbody className="divide-y divide-slate-100">
            {["Clear", "Review Required", "Data Hold", "Potential Match"].map((s) => <tr key={s}><td className="py-1.5">{s}</td><td className="py-1.5 text-right tabular-nums">{m.byStatus[s] ?? 0}</td><td className="py-1.5 text-right tabular-nums text-slate-500">{pct(m.byStatus[s] ?? 0)}</td></tr>)}
          </tbody></table>
          <p className="mt-3 text-xs text-slate-500">Flagged value {fmtMoney(m.flaggedValue)} of {fmtMoney(m.totalValue)} total (synthetic).</p>
        </Card>
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-slate-800">Case summary</h2>
          <table className="mt-2 w-full text-sm"><tbody className="divide-y divide-slate-100">
            {["Open", "In Review", "Escalated", "Resolved"].map((s) => <tr key={s}><td className="py-1.5">{s}</td><td className="py-1.5 text-right tabular-nums">{cases.filter((c) => c.status === s).length}</td></tr>)}
          </tbody></table>
          <p className="mt-3 text-xs text-slate-500">{DQ.length} data-quality issues across {DATA.customers.length} customers, {DATA.products.length} products and {DATA.licenses.length} license records.</p>
        </Card>
        <Card className="p-4 md:col-span-2">
          <h2 className="text-sm font-semibold text-slate-800">Findings by rule</h2>
          <table className="mt-2 w-full text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-1 text-left font-medium">Rule</th><th className="py-1 text-left font-medium">Category</th><th className="py-1 text-right font-medium">Findings</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{m.rules.map(([id, v]) => <tr key={id}><td className="py-1.5 font-medium">{id}</td><td className="py-1.5 text-slate-600">{v.cat}</td><td className="py-1.5 text-right tabular-nums">{v.n}</td></tr>)}</tbody></table>
        </Card>
      </div>
    </>
  );
}
