"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Card, Empty, PageHeader, cx, fmtMoney, fmtTime } from "@/components/ui";
import { DATA, DQ, RESULTS, txnValue } from "@/lib/demo";
import { outcomeRank } from "@/lib/rules";
import { useStore } from "@/lib/store";

function Kpi({ label, value, href, hint }: { label: string; value: number | string; href: string; hint: string }) {
  return (
    <Link href={href} className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-400">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
      <div className="mt-0.5 text-xs text-slate-500 group-hover:text-emerald-700">{hint}</div>
    </Link>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { cases, ready } = useStore();
  const m = useMemo(() => {
    const results = Object.values(RESULTS);
    const flagged = results.filter((r) => r.status !== "Clear").length;
    const monthly = new Map<string, { month: string; transactions: number; flagged: number }>();
    for (const t of DATA.transactions) {
      const k = t.date.slice(0, 7);
      const row = monthly.get(k) ?? { month: k, transactions: 0, flagged: 0 };
      row.transactions++;
      if (RESULTS[t.id].status !== "Clear") row.flagged++;
      monthly.set(k, row);
    }
    const cat = new Map<string, number>();
    results.forEach((r) => new Set(r.findings.map((f) => f.category)).forEach((c) => cat.set(c, (cat.get(c) ?? 0) + 1)));
    const attention = DATA.transactions.filter((t) => RESULTS[t.id].status !== "Clear")
      .sort((a, b) => outcomeRank(RESULTS[b.id].status) - outcomeRank(RESULTS[a.id].status) || txnValue(b) - txnValue(a)).slice(0, 6);
    return { flagged, monthly: [...monthly.values()].sort((a, b) => a.month.localeCompare(b.month)), cat: [...cat].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count), attention };
  }, []);
  const open = cases.filter((c) => c.status !== "Resolved").length;
  const activity = cases.flatMap((c) => c.history.map((h) => ({ ...h, caseId: c.id }))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 7);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Metrics are calculated from the synthetic demo dataset (as-of 2026-06-30)." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Transactions" value={DATA.transactions.length} href="/transactions" hint="View all" />
        <Kpi label="Flagged" value={m.flagged} href="/transactions?status=flagged" hint="Not Clear" />
        <Kpi label="Open cases" value={ready ? open : "–"} href="/cases?status=open" hint="Unresolved" />
        <Kpi label="Data-quality issues" value={DQ.length} href="/data" hint="Master data" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Transactions by month</h2>
          <div className="h-64"><ResponsiveContainer width="100%" height="100%">
            <LineChart data={m.monthly}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="month" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip /><Legend />
              <Line type="monotone" dataKey="transactions" stroke="#0f766e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="flagged" stroke="#e11d48" strokeWidth={2} dot={false} />
            </LineChart></ResponsiveContainer></div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-1 text-sm font-semibold text-slate-800">Exceptions by category</h2>
          <p className="mb-2 text-xs text-slate-500">Transactions with at least one finding. Click a bar to filter.</p>
          <div className="h-60"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={m.cat} layout="vertical" margin={{ left: 40 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" allowDecimals={false} fontSize={12} /><YAxis type="category" dataKey="name" width={130} fontSize={12} /><Tooltip />
              <Bar dataKey="count" fill="#10b981" cursor="pointer" onClick={(d: unknown) => { const name = (d as { name?: string }).name; if (name) router.push(`/transactions?category=${encodeURIComponent(name)}`); }} />
            </BarChart></ResponsiveContainer></div>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">Requiring review</h2>
          {m.attention.length === 0 ? <Empty title="Nothing to review" /> : (
            <ul className="divide-y divide-slate-100">{m.attention.map((t) => (
              <li key={t.id}><Link href={`/transactions?id=${t.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-slate-50">
                <span><span className="font-medium text-slate-900">{t.id}</span> <span className="text-slate-500">· {fmtMoney(txnValue(t))} · {t.destination}</span></span>
                <Badge label={RESULTS[t.id].status} /></Link></li>))}</ul>)}
        </Card>
        <Card>
          <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">Recent case activity</h2>
          {activity.length === 0 ? <Empty title="No activity yet" hint="Create a case from a flagged transaction." /> : (
            <ul className="divide-y divide-slate-100">{activity.map((a, i) => (
              <li key={i} className={cx("px-4 py-2.5 text-sm")}><Link href={`/cases?id=${a.caseId}`} className="font-medium text-slate-900 hover:text-emerald-700">{a.caseId}</Link>
                <span className="text-slate-600"> — {a.action}</span><div className="text-xs text-slate-400">{a.actor} · {fmtTime(a.at)}</div></li>))}</ul>)}
        </Card>
      </div>
    </>
  );
}
