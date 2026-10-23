"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Badge, Btn, Card, Empty, Pager, PageHeader, fmtMoney, inputCls } from "@/components/ui";
import { downloadCsv, toCsv } from "@/lib/csv";
import { CUSTOMERS, DATA, LICENSES, PRODUCTS, RESULTS, TXNS, txnValue } from "@/lib/demo";
import { CLEAR_DISCLAIMER, outcomeRank } from "@/lib/rules";
import { useStore } from "@/lib/store";

const PAGE_SIZE = 12;
type SortKey = "id" | "date" | "customer" | "destination" | "value" | "status";

function Inner() {
  const sp = useSearchParams();
  const router = useRouter();
  const { cases, createCase, notify } = useStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(sp.get("status") ?? "all");
  const [category, setCategory] = useState(sp.get("category") ?? "all");
  const [dest, setDest] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "date", dir: -1 });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(sp.get("id"));

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = DATA.transactions.filter((t) => {
      const r = RESULTS[t.id], c = CUSTOMERS.get(t.customerId), p = PRODUCTS.get(t.productId);
      if (status === "flagged" ? r.status === "Clear" : status !== "all" && r.status !== status) return false;
      if (category !== "all" && !r.findings.some((f) => f.category === category)) return false;
      if (dest !== "all" && t.destination !== dest) return false;
      if (!needle) return true;
      return [t.id, t.orderRef, c?.legalName, p?.description, t.destination].some((x) => x?.toLowerCase().includes(needle));
    });
    const key = (t: (typeof list)[number]): string | number => ({
      id: t.id, date: t.date, customer: CUSTOMERS.get(t.customerId)?.legalName ?? "", destination: t.destination, value: txnValue(t), status: outcomeRank(RESULTS[t.id].status),
    })[sort.key];
    return list.sort((a, b) => { const x = key(a), y = key(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir; });
  }, [q, status, category, dest, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const shown = rows.slice((Math.min(page, pages) - 1) * PAGE_SIZE, Math.min(page, pages) * PAGE_SIZE);
  const setSortKey = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }));
  const reset = () => { setQ(""); setStatus("all"); setCategory("all"); setDest("all"); setPage(1); router.replace("/transactions"); };
  const Th = ({ k, children }: { k: SortKey; children: string }) => (
    <th className="px-3 py-2 text-left font-medium"><button onClick={() => setSortKey(k)} aria-label={`Sort by ${children}`} className="hover:text-slate-900">{children}{sort.key === k ? (sort.dir === 1 ? " ▲" : " ▼") : ""}</button></th>
  );
  const exportCsv = () => {
    downloadCsv("transactions-filtered.csv", toCsv(rows.map((t) => {
      const r = RESULTS[t.id];
      return { transaction_id: t.id, order_ref: t.orderRef, date: t.date, customer: CUSTOMERS.get(t.customerId)?.legalName ?? "(missing)", product: PRODUCTS.get(t.productId)?.description ?? "(missing)",
        destination: t.destination, quantity: t.quantity, value_usd: txnValue(t), screening_status: r.status, rule_ids: r.findings.map((f) => f.ruleId).join(" | "), explanations: r.findings.map((f) => f.explanation).join(" | "), synthetic: "yes" };
    })));
    notify(`Exported ${rows.length} transactions.`);
  };
  const sel = selected ? TXNS.get(selected) : undefined;
  const selResult = sel ? RESULTS[sel.id] : undefined;
  const existing = sel ? cases.find((c) => c.transactionId === sel.id && c.status !== "Resolved") : undefined;
  const onCreate = () => {
    if (!sel) return;
    const r = createCase(sel.id);
    r.ok ? notify(`Created ${r.id}.`) : notify(r.error, "err");
  };
  const destinations = [...new Set(DATA.transactions.map((t) => t.destination))].sort();

  return (
    <>
      <PageHeader title="Transaction Screening" subtitle="Deterministic synthetic rules. Statuses are workflow states, not legal determinations."
        actions={<Btn onClick={exportCsv} disabled={rows.length === 0}>Export CSV ({rows.length})</Btn>} />
      <Card className="mb-4 flex flex-wrap gap-2 p-3">
        <input className={inputCls + " min-w-[14rem] flex-1"} placeholder="Search ID, order, customer, product…" aria-label="Search transactions" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className={inputCls} aria-label="Screening status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="all">All statuses</option><option value="flagged">Flagged (not Clear)</option>
          {["Clear", "Review Required", "Data Hold", "Potential Match"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className={inputCls} aria-label="Finding category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="all">All categories</option>
          {["Party Screening", "Product Data", "License", "Destination", "Transaction Integrity"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className={inputCls} aria-label="Destination" value={dest} onChange={(e) => { setDest(e.target.value); setPage(1); }}>
          <option value="all">All destinations</option>{destinations.map((d) => <option key={d}>{d}</option>)}
        </select>
        <Btn onClick={reset}>Clear filters</Btn>
      </Card>
      <Card className="overflow-hidden">
        {shown.length === 0 ? <Empty title="No transactions match these filters" hint="Adjust or clear the filters." /> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[56rem] text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
              <Th k="id">Transaction</Th><Th k="date">Date</Th><Th k="customer">Customer</Th><th className="px-3 py-2 text-left font-medium">Product</th><Th k="destination">Dest.</Th><Th k="value">Value</Th><Th k="status">Screening</Th><th className="px-3 py-2 text-left font-medium">Rules</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">{shown.map((t) => {
              const r = RESULTS[t.id];
              return (
                <tr key={t.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelected(t.id)}>
                  <td className="px-3 py-2"><button className="font-medium text-slate-900 hover:text-emerald-700" onClick={(e) => { e.stopPropagation(); setSelected(t.id); }}>{t.id}</button><div className="text-xs text-slate-400">{t.orderRef}</div></td>
                  <td className="px-3 py-2 tabular-nums">{t.date}</td>
                  <td className="px-3 py-2">{CUSTOMERS.get(t.customerId)?.legalName ?? <span className="text-rose-600">Missing ({t.customerId})</span>}</td>
                  <td className="px-3 py-2">{PRODUCTS.get(t.productId)?.description ?? "Missing"}</td>
                  <td className="px-3 py-2">{t.destination}</td>
                  <td className="px-3 py-2 tabular-nums">{fmtMoney(txnValue(t))}</td>
                  <td className="px-3 py-2"><Badge label={r.status} /></td>
                  <td className="px-3 py-2 text-xs text-slate-500">{r.findings.map((f) => f.ruleId).join(", ") || "—"}</td>
                </tr>);
            })}</tbody></table></div>)}
        <Pager page={Math.min(page, pages)} pages={pages} total={rows.length} onPage={(p) => setPage(Math.max(1, Math.min(pages, p)))} />
      </Card>

      {sel && selResult && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40" onClick={() => setSelected(null)}>
          <aside className="h-full w-full max-w-lg overflow-y-auto bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Transaction ${sel.id}`}>
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-lg font-semibold text-slate-900">{sel.id}</h2><p className="text-sm text-slate-500">{sel.orderRef} · {sel.date}</p></div>
              <Btn onClick={() => setSelected(null)} aria-label="Close detail">Close</Btn>
            </div>
            <div className="mt-3"><Badge label={selResult.status} /></div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {[["Customer", CUSTOMERS.get(sel.customerId)?.legalName ?? `Missing (${sel.customerId})`], ["Product", PRODUCTS.get(sel.productId)?.description ?? "Missing"],
                ["ECCN", PRODUCTS.get(sel.productId)?.eccn ?? "— missing"], ["HTS", PRODUCTS.get(sel.productId)?.hts ?? "— missing"],
                ["Destination", sel.destination], ["Origin", sel.origin], ["Quantity", String(sel.quantity)], ["Value", fmtMoney(txnValue(sel))],
                ["License", sel.licenseId ? `${sel.licenseId}${LICENSES.get(sel.licenseId) ? ` (exp. ${LICENSES.get(sel.licenseId)!.expiry})` : ""}` : "None linked"], ["Reviewer", sel.reviewer]]
                .map(([k, v]) => <div key={k}><dt className="text-xs uppercase text-slate-400">{k}</dt><dd className="text-slate-800">{v}</dd></div>)}
            </dl>
            <h3 className="mt-5 text-sm font-semibold text-slate-800">Why it was flagged</h3>
            {selResult.findings.length === 0 ? <p className="mt-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{CLEAR_DISCLAIMER}</p> : (
              <ul className="mt-2 space-y-3">{selResult.findings.map((f, i) => (
                <li key={i} className="rounded-md border border-slate-200 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-900">{f.ruleId}</span><span className="text-xs text-slate-400">v{f.ruleVersion}</span><Badge label={f.severity} /><span className="text-xs text-slate-500">{f.category}</span></div>
                  <p className="mt-1.5 text-slate-700">{f.explanation}</p>
                  <p className="mt-1.5 text-xs text-slate-500"><strong>Triggering fields:</strong> {f.fields.join(", ")}</p>
                  <p className="mt-1 text-xs text-slate-500"><strong>Recommended action:</strong> {f.action}</p>
                  <p className="mt-1 text-xs text-slate-400">Source: {f.source}</p>
                </li>))}</ul>)}
            <div className="mt-5 flex flex-wrap gap-2">
              {existing ? <Link href={`/cases?id=${existing.id}`} className="inline-flex h-9 items-center rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700">Open {existing.id}</Link>
                : <Btn variant="primary" onClick={onCreate} disabled={selResult.status === "Clear"} title={selResult.status === "Clear" ? "Only flagged transactions can have a case" : undefined}>Create compliance case</Btn>}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
export default function Page() { return <Suspense fallback={null}><Inner /></Suspense>; }
