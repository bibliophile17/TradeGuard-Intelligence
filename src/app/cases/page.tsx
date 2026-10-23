"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Badge, Btn, Card, Empty, Modal, PageHeader, fmtTime, inputCls } from "@/components/ui";
import { CUSTOMERS, RESULTS, TXNS } from "@/lib/demo";
import { REVIEWERS, useStore } from "@/lib/store";
import type { CaseStatus } from "@/lib/types";

function Inner() {
  const sp = useSearchParams();
  const { cases, ready, setStatus, addNote, reassign, notify } = useStore();
  const [filter, setFilter] = useState(sp.get("status") ?? "all");
  const [selId, setSelId] = useState<string | null>(sp.get("id"));
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<CaseStatus | null>(null);
  const [reason, setReason] = useState("");
  const [modalErr, setModalErr] = useState("");

  const list = cases.filter((c) => (filter === "all" ? true : filter === "open" ? c.status !== "Resolved" : c.status === filter));
  const sel = cases.find((c) => c.id === selId) ?? null;
  const txn = sel ? TXNS.get(sel.transactionId) : undefined;
  const result = sel ? RESULTS[sel.transactionId] : undefined;

  const change = (next: CaseStatus) => {
    if (!sel) return;
    if (next === "Escalated" || next === "Resolved") { setPending(next); setReason(""); setModalErr(""); return; }
    const r = setStatus(sel.id, next);
    r.ok ? notify(`${sel.id} set to ${next}.`) : notify(r.error, "err");
  };
  const confirm = () => {
    if (!sel || !pending) return;
    const r = setStatus(sel.id, pending, reason);
    if (r.ok) { notify(`${sel.id} set to ${pending}.`); setPending(null); } else setModalErr(r.error);
  };
  const submitNote = () => {
    if (!sel) return;
    const r = addNote(sel.id, note);
    if (r.ok) { setNote(""); notify("Note added."); } else notify(r.error, "err");
  };

  return (
    <>
      <PageHeader title="Compliance Cases" subtitle="Create cases from flagged transactions on the Transaction Screening page. Resolution requires a documented rationale." />
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <div className="border-b border-slate-200 p-3">
            <select className={inputCls + " w-full"} aria-label="Filter by status" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All cases</option><option value="open">Unresolved</option>
              {["Open", "In Review", "Escalated", "Resolved"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          {!ready ? <Empty title="Loading…" /> : list.length === 0 ? <Empty title="No cases" hint="Open a flagged transaction and choose “Create compliance case”." /> : (
            <ul className="divide-y divide-slate-100">{list.map((c) => (
              <li key={c.id}><button onClick={() => setSelId(c.id)} className={"flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm hover:bg-slate-50 " + (c.id === selId ? "bg-emerald-50/60" : "")}>
                <span><span className="font-medium text-slate-900">{c.id}</span><span className="block text-xs text-slate-500">{c.transactionId} · {c.category}</span></span>
                <span className="flex flex-col items-end gap-1"><Badge label={c.status} /><Badge label={c.priority} /></span>
              </button></li>))}</ul>)}
        </Card>

        <Card className="p-5 lg:col-span-3">
          {!sel ? <Empty title="Select a case" hint="Choose a case on the left to review it." /> : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h2 className="text-lg font-semibold text-slate-900">{sel.id}</h2>
                  <p className="text-sm text-slate-500">Transaction <Link className="text-emerald-700 hover:underline" href={`/transactions?id=${sel.transactionId}`}>{sel.transactionId}</Link>{txn && ` · ${CUSTOMERS.get(txn.customerId)?.legalName ?? "missing customer"}`}</p></div>
                <div className="flex gap-2"><Badge label={sel.status} /><Badge label={sel.priority} /></div>
              </div>
              {result && <p className="mt-3 text-sm text-slate-600"><strong>Triggered rules:</strong> {result.findings.map((f) => f.ruleId).join(", ") || "none"}. Screening status: {result.status}.</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <label className="text-sm text-slate-500" htmlFor="reviewer">Reviewer</label>
                <select id="reviewer" className={inputCls} value={sel.reviewer} onChange={(e) => { const r = reassign(sel.id, e.target.value); r.ok ? notify("Reviewer reassigned.") : notify(r.error, "err"); }}>
                  {[...new Set([...REVIEWERS, sel.reviewer])].map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {sel.status === "Resolved" ? <Btn onClick={() => change("Open")}>Reopen case</Btn> : (<>
                  <Btn onClick={() => change("In Review")} disabled={sel.status === "In Review"}>Mark In Review</Btn>
                  <Btn onClick={() => change("Escalated")} disabled={sel.status === "Escalated"}>Escalate…</Btn>
                  <Btn variant="primary" onClick={() => change("Resolved")}>Resolve…</Btn></>)}
              </div>
              <p className="mt-2 text-xs text-slate-400">Resolving a case records a rationale only. It does not authorize or release any shipment.</p>

              <h3 className="mt-5 text-sm font-semibold text-slate-800">Reviewer notes</h3>
              {sel.notes.length === 0 ? <p className="mt-1 text-sm text-slate-500">No notes yet.</p> : (
                <ul className="mt-2 space-y-2">{sel.notes.map((n, i) => <li key={i} className="rounded-md bg-slate-50 p-2.5 text-sm"><p className="whitespace-pre-wrap text-slate-700">{n.text}</p><p className="mt-1 text-xs text-slate-400">{n.author} · {fmtTime(n.at)}</p></li>)}</ul>)}
              <div className="mt-3 flex gap-2">
                <textarea className={inputCls + " h-20 flex-1 py-2"} aria-label="New note" placeholder="Add a reviewer note…" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
                <Btn onClick={submitNote} disabled={!note.trim()} className="self-end">Add note</Btn>
              </div>

              <h3 className="mt-5 text-sm font-semibold text-slate-800">Activity history</h3>
              <ol className="mt-2 space-y-1.5 border-l border-slate-200 pl-4">{[...sel.history].reverse().map((h, i) => (
                <li key={i} className="text-sm text-slate-700">{h.action}<span className="block text-xs text-slate-400">{h.actor} · {fmtTime(h.at)}</span></li>))}</ol>
            </>)}
        </Card>
      </div>
      {pending && sel && (
        <Modal title={pending === "Resolved" ? `Resolve ${sel.id}?` : `Escalate ${sel.id}?`} onClose={() => setPending(null)}>
          <label className="block text-sm text-slate-600" htmlFor="reason">{pending === "Resolved" ? "Resolution rationale" : "Escalation reason"} (min. 10 characters)</label>
          <textarea id="reason" className={inputCls + " mt-1 h-24 w-full py-2"} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
          {modalErr && <p role="alert" className="mt-1 text-sm text-rose-600">{modalErr}</p>}
          <div className="mt-4 flex justify-end gap-2"><Btn onClick={() => setPending(null)}>Cancel</Btn><Btn variant="primary" onClick={confirm}>Confirm</Btn></div>
        </Modal>)}
    </>
  );
}
export default function Page() { return <Suspense fallback={null}><Inner /></Suspense>; }
