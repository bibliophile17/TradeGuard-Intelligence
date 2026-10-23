import { Card, PageHeader } from "@/components/ui";

interface Source { title: string; authority: string; topic: string; url: string; summary: string }
// Manually maintained. Summaries were written for this project and NOT synchronized with the live pages.
const SOURCES: Source[] = [
  { title: "Export Administration Regulations (EAR)", authority: "U.S. Bureau of Industry and Security (BIS)", topic: "EAR fundamentals", url: "https://www.bis.gov/regulations/ear",
    summary: "BIS administers the EAR, which govern exports, reexports and in-country transfers of most commercial and “dual-use” items. Start here to understand scope, structure and how requirements apply to an item, destination, end user and end use." },
  { title: "Classify your item", authority: "U.S. Bureau of Industry and Security (BIS)", topic: "ECCN classification", url: "https://www.bis.gov/licensing/classify-your-item",
    summary: "Guidance on determining whether an item is described by an Export Control Classification Number (ECCN) or falls under EAR99. Classification is a reviewed decision by an authorized person; this demo never infers an ECCN from a product name." },
  { title: "Consolidated Screening List", authority: "U.S. International Trade Administration (trade.gov)", topic: "Restricted-party screening", url: "https://www.trade.gov/consolidated-screening-list",
    summary: "A consolidated search of several U.S. government lists of parties subject to restrictions. A name similarity is only a potential match and needs human review of addresses and other identifiers before any decision." },
  { title: "Harmonized Tariff Schedule search", authority: "U.S. International Trade Commission (USITC)", topic: "HTS classification", url: "https://hts.usitc.gov/",
    summary: "The tariff-classification system used for imports and duties. HTS codes are a separate data element from ECCNs and are stored in a separate field in this demo." },
];

export default function ReferencePage() {
  return (
    <>
      <PageHeader title="Regulatory Reference Library" subtitle="Links to official resources with short educational summaries." />
      <Card className="mb-4 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Manually maintained.</strong> Summaries are educational paraphrases written for this project. They are not live, not synchronized with the linked pages, and may be out of date. Always rely on the official source and qualified advisers. Screening rules in this app are <strong>synthetic demo rules</strong>, not legal requirements.
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {SOURCES.map((s) => (
          <Card key={s.url} className="flex flex-col p-4">
            <span className="text-xs font-medium uppercase tracking-wide text-emerald-700">{s.topic}</span>
            <h2 className="mt-1 text-base font-semibold text-slate-900">{s.title}</h2>
            <p className="text-xs text-slate-500">{s.authority}</p>
            <p className="mt-2 flex-1 text-sm text-slate-700">{s.summary}</p>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>Summary type: manually authored</span>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-700 hover:underline">Open official source ↗</a>
            </div>
          </Card>))}
      </div>
    </>
  );
}
