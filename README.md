# TradeGuard Intelligence

A portfolio project simulating a **trade-compliance operations workbench** for a fictional semiconductor / AI-hardware company. It demonstrates a deterministic rules engine, ECCN/HTS master-data governance, restricted-party name-match review, license tracking, case management, data-quality checks, SQL analysis and Excel reporting.

> ## ⚠️ Educational simulation
>
> Every customer, product, license, screening-list entry and rule is **synthetic**. This is **not** an export-control compliance system, is **not** connected to any government list, SAP GTS or other ERP, and nothing in it is legal advice or authorization.
> A _Potential Match_ is never a confirmed match, and _Clear_ is never permission to ship.

**Live demo:** _add your Vercel URL here after deploying_  
**Screenshots:** _add images to `docs/` and link them here_

## Why I built it

To show how trade-compliance requirements can be translated into explainable, testable system rules: classifying data, screening parties, checking licenses, routing exceptions to human review, and keeping an audit trail.

## Features

| Area                    | What it does                                                                                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard               | KPIs, monthly trend, exceptions by category, review queue, recent case activity. Everything is computed from the dataset; KPIs and chart bars link to filtered views.                                                                       |
| Transaction Screening   | 84 synthetic transactions with search, sort, filters and pagination. The detail panel shows each rule's ID, version, category, severity, triggering fields, explanation, recommended action and source. Create a case; export filtered CSV. |
| Compliance Cases        | Open / In Review / Escalated / Resolved, notes, reviewer reassignment, activity history, confirmation dialogs. Escalation and resolution require a written reason; resolved cases can be reopened.                                          |
| Product & Customer Data | Separate tables with ECCN and HTS as **separate fields**; warnings for missing, invalid, stale and duplicate records; a validate-a-record form (nothing saved).                                                                             |
| Regulatory Reference    | Links to official BIS, trade.gov and USITC resources with manually written summaries, clearly labelled as not live.                                                                                                                         |
| Reports                 | Summary metrics computed from data; CSV exports with spreadsheet-formula-injection protection.                                                                                                                                              |
| SQL & Excel             | 10 SQL queries cross-checked against the rules engine, and a multi-sheet Excel report built with Python.                                                                                                                                    |

## Screening rules (synthetic, version 1.0.0)

| Rule                      | Checks                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| PARTY-001 / 002           | Normalized exact / fuzzy (≥ 0.85) name similarity to a synthetic training list → _Potential Match_                                   |
| PROD-001 / 002            | Missing / invalid-format ECCN → _Data Hold_                                                                                          |
| PROD-003                  | Missing / invalid HTS → _Data Hold_                                                                                                  |
| PROD-004                  | Missing or stale (> 365 days) classification date → _Review Required_                                                                |
| DEST-001                  | Destination on a synthetic review list → _Review Required_                                                                           |
| LIC-001 / 002 / 003 / 004 | Outside license validity / no license for review destination / cumulative quantity over limit / unknown or inconsistent license link |
| INT-001 – 004             | Orphan customer or product, duplicate order reference, invalid amounts                                                               |

Outcomes are workflow states, not legal determinations: `Clear` → `Review Required` → `Data Hold` → `Potential Match` (increasing precedence). The dataset uses a fixed as-of date (**2026-06-30**) and a seeded generator, so results never change.

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS · Recharts · Vitest · SQL (SQLite-compatible) · Python (pandas, xlsxwriter). No paid services, API keys, database or environment variables required.

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # rules, data quality, CSV, determinism
npm run typecheck
npm run build
```

### SQL and Excel reporting (optional)

```bash
npm run export:csv                  # dataset + rules-engine output -> analytics/data/*.csv
python3 sql/run_sqlite.py           # runs sql/queries.sql and cross-checks against the rules engine
pip install pandas xlsxwriter
python3 analytics/report.py         # -> analytics/output/tradeguard_report.xlsx
```

The SQL is written independently of the TypeScript rules; `run_sqlite.py` asserts the two agree (e.g. SQL date-window logic vs `LIC-001`). This is a consistency check on synthetic data, not validation of real compliance logic.

## Deploy to Vercel (free)

1. Push this repository to GitHub.
2. In Vercel: **Add New → Project**, import the repo, keep the auto-detected Next.js settings.
3. Click **Deploy**. No environment variables are needed.

## Architecture

```
src/lib/types.ts    shared types            src/lib/rules.ts   pure rule modules + screenAll()
src/lib/data.ts     seeded data generator   src/lib/dq.ts      data-quality scan + validation
src/lib/demo.ts     dataset + results       src/lib/csv.ts     injection-safe CSV export
src/lib/store.tsx   cases in React state, persisted to localStorage
src/app/*           pages (client components)      src/components/*  shell + UI primitives
sql/                schema, queries, SQLite runner  analytics/      Excel report + exported CSVs
scripts/            CSV export from the rules engine
```

Rules are pure functions of the data. Screening results are **derived**, never stored, so they always agree with the dataset. Only case changes (cases, notes, history) are saved, in the browser's `localStorage`; "Reset demo data" restores the seed.

## Regulatory sources (official)

- [BIS – Export Administration Regulations](https://www.bis.gov/regulations/ear)
- [BIS – Classify your item](https://www.bis.gov/licensing/classify-your-item)
- [Consolidated Screening List (trade.gov)](https://www.trade.gov/consolidated-screening-list)
- [USITC – Harmonized Tariff Schedule](https://hts.usitc.gov/)

Summaries in the app are manually written, not live, and may be out of date.

## Simulated vs. implemented

| Implemented                                        | Simulated / out of scope                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Rules engine, status precedence, explanations      | The screening list, review-destination list, licenses and classifications are all synthetic |
| Master-data validation and duplicate detection     | No real classification decisions; the app never infers an ECCN from a product name          |
| Case workflow with history and required rationales | No authentication, roles or real audit-grade logging                                        |
| SQL queries and Excel reporting                    | No SAP GTS, AES, customs or government-system integration                                   |

## Known limitations

- Single browser, no accounts, no backend; clearing site data resets cases.
- No license-management page, audit-log page, CSV import or database layer in this version.
- Fuzzy matching is a simple normalized edit-distance ratio, illustrative only.
- ECCN/HTS values are placeholders. License utilization can exceed 100% because licenses are randomly linked in the synthetic data.
- New case actions use the browser clock while the dataset uses a fixed date.

## License

Choose a license (e.g. MIT) and add a `LICENSE` file before publishing.
