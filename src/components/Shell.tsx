"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import { useStore } from "@/lib/store";
import { cx } from "./ui";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Transaction Screening" },
  { href: "/cases", label: "Compliance Cases" },
  { href: "/data", label: "Product & Customer Data" },
  { href: "/reference", label: "Regulatory Reference" },
  { href: "/reports", label: "Reports" },
];

export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { toasts, reset } = useStore();
  const nav = (
    <nav aria-label="Primary" className="flex flex-col gap-0.5 px-3">
      {NAV.map((n) => {
        const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
            className={cx("rounded-md border-l-2 px-3 py-2 text-sm transition-colors", active ? "border-emerald-400 bg-white/10 font-medium text-white" : "border-transparent text-slate-300 hover:bg-white/5 hover:text-white")}>
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
  const brand = (
    <div className="px-5 py-5">
      <div className="text-base font-semibold tracking-tight text-white"><span className="text-emerald-400">Trade</span>Guard Intelligence</div>
      <div className="mt-0.5 text-xs text-slate-400">Synthetic demo workspace</div>
    </div>
  );
  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-60 shrink-0 bg-navy-900 lg:block">
        <div className="sticky top-0 flex h-screen flex-col">
          {brand}{nav}
          <div className="mt-auto p-4">
            <button onClick={() => { if (window.confirm("Reset all demo cases and notes to the seed state?")) reset(); }} className="w-full rounded-md border border-white/15 px-3 py-2 text-xs text-slate-300 hover:bg-white/5">Reset demo data</button>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between bg-navy-900 px-4 py-3 lg:hidden">
          <span className="text-sm font-semibold text-white"><span className="text-emerald-400">Trade</span>Guard</span>
          <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle navigation" className="rounded-md border border-white/20 px-3 py-1 text-sm text-white">{open ? "Close" : "Menu"}</button>
        </header>
        {open && <div className="bg-navy-900 pb-3 lg:hidden">{nav}<div className="px-3 pt-2"><button onClick={() => { if (window.confirm("Reset all demo cases and notes?")) reset(); }} className="w-full rounded-md border border-white/15 px-3 py-2 text-xs text-slate-300">Reset demo data</button></div></div>}
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          <strong>Educational simulation.</strong> All records, rules and lists are synthetic. This is not an export-control compliance system, not connected to any government or ERP system, and nothing here is legal advice or authorization.
        </div>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">{children}</main>
      </div>
      <div aria-live="polite" className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        {toasts.map((t) => <div key={t.id} className={cx("max-w-sm rounded-md px-4 py-2.5 text-sm text-white shadow-lg", t.tone === "ok" ? "bg-emerald-700" : "bg-rose-700")}>{t.msg}</div>)}
      </div>
    </div>
  );
}
