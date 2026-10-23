"use client";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { RESULTS, SEED_CASES, TXNS, priorityOf, topFinding } from "./demo";
import type { CaseStatus, ComplianceCase } from "./types";

const KEY = "tradeguard.demo.cases.v1";
const ACTOR = "Demo user";
export interface Toast { id: number; msg: string; tone: "ok" | "err" }
type Result = { ok: true; id?: string } | { ok: false; error: string };

interface Store {
  cases: ComplianceCase[]; ready: boolean; toasts: Toast[];
  notify: (msg: string, tone?: Toast["tone"]) => void;
  createCase: (txnId: string) => Result;
  setStatus: (id: string, next: CaseStatus, reason?: string) => Result;
  addNote: (id: string, text: string) => Result;
  reassign: (id: string, reviewer: string) => Result;
  reset: () => void;
}
const Ctx = createContext<Store | null>(null);
export const useStore = (): Store => {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
};
const now = () => new Date().toISOString();
const isCase = (x: unknown): x is ComplianceCase =>
  !!x && typeof x === "object" && typeof (x as ComplianceCase).id === "string" && typeof (x as ComplianceCase).status === "string" && Array.isArray((x as ComplianceCase).notes) && Array.isArray((x as ComplianceCase).history);

export const REVIEWERS = ["A. Rivera (demo)", "J. Okafor (demo)", "M. Lindqvist (demo)"];

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cases, setCases] = useState<ComplianceCase[]>(SEED_CASES);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((msg: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every(isCase)) setCases(parsed);
      }
    } catch {
      notify("Saved demo data could not be read; using the default seed.", "err");
    }
    setReady(true);
  }, [notify]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(cases)); }
    catch { notify("Browser storage is unavailable; changes will not persist after reload.", "err"); }
  }, [cases, ready, notify]);

  const update = (id: string, fn: (c: ComplianceCase) => ComplianceCase) =>
    setCases((all) => all.map((c) => (c.id === id ? fn(c) : c)));

  const createCase = useCallback((txnId: string): Result => {
    const t = TXNS.get(txnId), r = RESULTS[txnId];
    if (!t || !r) return { ok: false, error: "Transaction not found." };
    if (r.status === "Clear") return { ok: false, error: "Only flagged transactions can have a case." };
    if (cases.some((c) => c.transactionId === txnId && c.status !== "Resolved")) return { ok: false, error: "An unresolved case already exists for this transaction." };
    const n = Math.max(0, ...cases.map((c) => parseInt(c.id.replace(/\D/g, ""), 10) || 0)) + 1;
    const at = now();
    const c: ComplianceCase = {
      id: `CASE-${String(n).padStart(4, "0")}`, transactionId: txnId, category: topFinding(r)?.category ?? "General",
      priority: priorityOf(r), status: "Open", reviewer: t.reviewer, createdAt: at, updatedAt: at, notes: [],
      history: [{ at, actor: ACTOR, action: `Case created from ${txnId} (${r.status})` }],
    };
    setCases((all) => [c, ...all]);
    return { ok: true, id: c.id };
  }, [cases]);

  const setStatus = useCallback((id: string, next: CaseStatus, reason?: string): Result => {
    const c = cases.find((x) => x.id === id);
    if (!c) return { ok: false, error: "Case not found." };
    if (c.status === next) return { ok: false, error: `Case is already ${next}.` };
    if (c.status === "Resolved" && next !== "Open") return { ok: false, error: "A resolved case can only be reopened (set to Open)." };
    const needsReason = next === "Escalated" || next === "Resolved";
    const text = reason?.trim() ?? "";
    if (needsReason && text.length < 10) return { ok: false, error: `${next === "Resolved" ? "A resolution rationale" : "An escalation reason"} of at least 10 characters is required.` };
    if (text.length > 1000) return { ok: false, error: "Reason must be 1000 characters or fewer." };
    const at = now();
    update(id, (x) => ({
      ...x, status: next, updatedAt: at,
      notes: needsReason ? [...x.notes, { at, author: ACTOR, text: `[${next === "Resolved" ? "Resolution rationale" : "Escalation reason"}] ${text}` }] : x.notes,
      history: [...x.history, { at, actor: ACTOR, action: `Status changed from ${x.status} to ${next}` }],
    }));
    return { ok: true };
  }, [cases]);

  const addNote = useCallback((id: string, raw: string): Result => {
    const text = raw.trim();
    if (!text) return { ok: false, error: "Note cannot be empty." };
    if (text.length > 1000) return { ok: false, error: "Note must be 1000 characters or fewer." };
    const at = now();
    update(id, (x) => ({ ...x, updatedAt: at, notes: [...x.notes, { at, author: ACTOR, text }], history: [...x.history, { at, actor: ACTOR, action: "Reviewer note added" }] }));
    return { ok: true };
  }, []);

  const reassign = useCallback((id: string, reviewer: string): Result => {
    if (!REVIEWERS.includes(reviewer)) return { ok: false, error: "Unknown reviewer." };
    const at = now();
    update(id, (x) => ({ ...x, reviewer, updatedAt: at, history: [...x.history, { at, actor: ACTOR, action: `Reassigned to ${reviewer}` }] }));
    return { ok: true };
  }, []);

  const reset = useCallback(() => { setCases(SEED_CASES); notify("Demo data reset to the seed state."); }, [notify]);

  const value = useMemo(() => ({ cases, ready, toasts, notify, createCase, setStatus, addNote, reassign, reset }),
    [cases, ready, toasts, notify, createCase, setStatus, addNote, reassign, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
