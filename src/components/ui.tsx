"use client";
import { ButtonHTMLAttributes, ReactNode, useEffect } from "react";

export const cx = (...a: (string | false | undefined | null)[]) => a.filter(Boolean).join(" ");
export const inputCls = "h-9 rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-lg border border-slate-200 bg-white shadow-sm", className)}>{children}</div>;
}
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
const BADGE: Record<string, string> = {
  Clear: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "Review Required": "bg-amber-50 text-amber-800 ring-amber-600/20",
  "Data Hold": "bg-orange-50 text-orange-800 ring-orange-600/20",
  "Potential Match": "bg-rose-50 text-rose-700 ring-rose-600/20",
  Open: "bg-sky-50 text-sky-700 ring-sky-600/20",
  "In Review": "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  Escalated: "bg-rose-50 text-rose-700 ring-rose-600/20",
  Resolved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  high: "bg-rose-50 text-rose-700 ring-rose-600/20", High: "bg-rose-50 text-rose-700 ring-rose-600/20",
  medium: "bg-amber-50 text-amber-800 ring-amber-600/20", Medium: "bg-amber-50 text-amber-800 ring-amber-600/20",
  low: "bg-slate-100 text-slate-600 ring-slate-500/20", Low: "bg-slate-100 text-slate-600 ring-slate-500/20",
};
export function Badge({ label }: { label: string }) {
  return <span className={cx("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", BADGE[label] ?? "bg-slate-100 text-slate-600 ring-slate-500/20")}>{label}</span>;
}
export function Btn({ variant = "secondary", className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const v = { primary: "bg-emerald-600 text-white hover:bg-emerald-700", secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50", danger: "bg-rose-600 text-white hover:bg-rose-700" }[variant];
  return <button {...p} className={cx("inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50", v, className)} />;
}
export function Empty({ title, hint }: { title: string; hint?: string }) {
  return <div className="px-4 py-12 text-center"><p className="text-sm font-medium text-slate-700">{title}</p>{hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}</div>;
}
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
export function Pager({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 text-sm text-slate-500">
      <span>{total} record{total === 1 ? "" : "s"}</span>
      <div className="flex items-center gap-2">
        <Btn onClick={() => onPage(page - 1)} disabled={page <= 1}>Previous</Btn>
        <span>Page {Math.min(page, pages)} of {pages}</span>
        <Btn onClick={() => onPage(page + 1)} disabled={page >= pages}>Next</Btn>
      </div>
    </div>
  );
}
export const fmtMoney = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
export const fmtTime = (iso: string) => iso.replace("T", " ").slice(0, 16) + " UTC";
