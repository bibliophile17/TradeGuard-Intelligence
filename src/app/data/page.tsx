"use client";
import { useMemo, useState } from "react";
import { Badge, Btn, Card, Empty, PageHeader, cx, inputCls } from "@/components/ui";
import { DATA, DQ } from "@/lib/demo";
import { validateProduct } from "@/lib/dq";

export default function DataPage() {
  const [tab, setTab] = useState<"products" | "customers">("products");
  const [q, setQ] = useState("");
  const issuesBy = useMemo(() => {
    const m = new Map<string, string[]>();
    DQ.forEach((i) => m.set(i.entityId, [...(m.get(i.entityId) ?? []), i.issue]));
    return m;
  }, []);
  const [form, setForm] = useState({ description: "", category: "", eccn: "", hts: "" });
  const [errs, setErrs] = useState<{ field: string; message: string }[] | null>(null);
  const needle = q.trim().toLowerCase();
  const products = DATA.products.filter((p) => !needle || `${p.id} ${p.description} ${p.eccn ?? ""} ${p.hts ?? ""}`.toLowerCase().includes(needle));
  const customers = DATA.customers.filter((c) => !needle || `${c.id} ${c.legalName} ${c.country}`.toLowerCase().includes(needle));
  const Warn = ({ id }: { id: string }) => { const w = issuesBy.get(id); return w ? <ul className="mt-1 space-y-0.5 text-xs text-amber-700">{w.map((x, i) => <li key={i}>⚠ {x}</li>)}</ul> : null; };

  return (
    <>
      <PageHeader title="Product & Customer Data" subtitle="Fictional master data with validation, duplicate detection and quality warnings. ECCN and HTS are separate fields." />
      <div className="mb-3 flex flex-wrap gap-2">
        <div role="tablist" className="flex rounded-md border border-slate-300 bg-white p-0.5">
          {(["products", "customers"] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cx("rounded px-3 py-1 text-sm capitalize", tab === t ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-slate-100")}>{t}</button>)}
        </div>
        <input className={inputCls + " min-w-[14rem] flex-1"} placeholder="Search…" aria-label="Search master data" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Card className="overflow-x-auto">
        {tab === "products" ? (products.length === 0 ? <Empty title="No products match" /> : (
          <table className="w-full min-w-[48rem] text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{["ID", "Description", "ECCN", "HTS", "Origin", "Classified", "Source"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{products.map((p) => (
              <tr key={p.id} className="align-top"><td className="px-3 py-2 font-medium">{p.id}</td><td className="px-3 py-2">{p.description}<Warn id={p.id} /></td>
                <td className="px-3 py-2">{p.eccn ?? <span className="text-rose-600">missing</span>}</td><td className="px-3 py-2">{p.hts ?? <span className="text-rose-600">missing</span>}</td>
                <td className="px-3 py-2">{p.origin}</td><td className="px-3 py-2 tabular-nums">{p.classificationDate ?? "—"}</td><td className="px-3 py-2 text-xs text-slate-500">{p.classificationSource}</td></tr>))}</tbody></table>))
          : (customers.length === 0 ? <Empty title="No customers match" /> : (
          <table className="w-full min-w-[48rem] text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{["ID", "Legal name", "Normalized", "Country", "City", "Address", "Last screened"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{customers.map((c) => (
              <tr key={c.id} className="align-top"><td className="px-3 py-2 font-medium">{c.id}</td><td className="px-3 py-2">{c.legalName}<Warn id={c.id} /></td><td className="px-3 py-2 text-xs text-slate-500">{c.normalizedName}</td>
                <td className="px-3 py-2">{c.country}</td><td className="px-3 py-2">{c.city || <span className="text-rose-600">missing</span>}</td><td className="px-3 py-2">{c.address || <span className="text-rose-600">missing</span>}</td><td className="px-3 py-2 tabular-nums">{c.lastScreened}</td></tr>))}</tbody></table>))}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-slate-800">Validate a product record</h2>
          <p className="mb-3 text-xs text-slate-500">Runs the same checks as the data-quality scan. Nothing is saved. The app never guesses an ECCN.</p>
          <div className="grid grid-cols-2 gap-2">
            {(["description", "category", "eccn", "hts"] as const).map((k) => (
              <input key={k} className={cx(inputCls, k === "description" && "col-span-2")} placeholder={k === "hts" ? "HTS (NNNN.NN.NNNN)" : k === "eccn" ? "ECCN (e.g. 3A991)" : k[0].toUpperCase() + k.slice(1)} aria-label={k} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />))}
          </div>
          <Btn className="mt-3" variant="primary" onClick={() => setErrs(validateProduct(form, DATA.products))}>Validate</Btn>
          {errs && (errs.length === 0 ? <p className="mt-3 text-sm text-emerald-700">No data-quality issues found. This is not a classification decision.</p>
            : <ul className="mt-3 space-y-1 text-sm text-rose-700" role="alert">{errs.map((e, i) => <li key={i}>• <strong>{e.field}:</strong> {e.message}</li>)}</ul>)}
        </Card>
        <Card>
          <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">Data-quality issues ({DQ.length})</h2>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">{DQ.map((i) => (
            <li key={i.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm"><span><span className="font-medium">{i.entityId}</span> <span className="text-slate-600">{i.issue}</span><span className="block text-xs text-slate-400">{i.action}</span></span><Badge label={i.severity} /></li>))}</ul>
        </Card>
      </div>
    </>
  );
}
