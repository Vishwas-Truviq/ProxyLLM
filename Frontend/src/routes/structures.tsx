import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";

export const Route = createFileRoute("/structures")({
  head: () => ({
    meta: [
      { title: "Structures — Amicorp AI" },
      { name: "description", content: "Catalog of corporate structures: IBC, VCC, exempted company, trust, foundation, LLC and more." },
      { property: "og:title", content: "Structures — Amicorp AI" },
      { property: "og:description", content: "Compare corporate structures side-by-side across setup, tax, and privacy." },
    ],
  }),
  component: StructuresPage,
});

const STRUCTURES = [
  { name: "International Business Company (IBC)", jur: "BVI", setup: "3–5 days", tax: "0% local", privacy: "High" },
  { name: "Variable Capital Company (VCC)", jur: "Singapore", setup: "4–6 weeks", tax: "17% (incentives)", privacy: "Restricted register" },
  { name: "Exempted Company", jur: "Cayman", setup: "2–3 weeks", tax: "0% local", privacy: "High" },
  { name: "Discretionary Trust", jur: "Jersey / BVI", setup: "2–4 weeks", tax: "N/A", privacy: "Very High" },
  { name: "Private Interest Foundation", jur: "Panama / Liechtenstein", setup: "3–5 weeks", tax: "0% on foreign income", privacy: "Very High" },
  { name: "Limited Liability Company", jur: "Delaware", setup: "1 week", tax: "Pass-through", privacy: "Medium" },
];

function StructuresPage() {
  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="max-w-3xl">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-600">Structures</p>
          <h1 className="font-serif text-5xl font-medium leading-tight text-navy-950">Every structure, engineered on purpose.</h1>
          <p className="mt-4 max-w-2xl text-lg text-zinc-500">
            From single-purpose SPVs to multi-tier holding architectures — pick the right vehicle for your intent.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-lg bg-white ring-1 ring-navy-950/5">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-900 text-white">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Structure</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Jurisdiction</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Setup</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Tax</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Privacy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-950/5">
              {STRUCTURES.map((s, i) => (
                <tr
                  key={s.name}
                  className="animate-fade-in-up transition-colors hover:bg-off-white"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <td className="px-6 py-5 font-serif text-base text-navy-950">{s.name}</td>
                  <td className="px-6 py-5 text-zinc-600">{s.jur}</td>
                  <td className="px-6 py-5 text-zinc-600">{s.setup}</td>
                  <td className="px-6 py-5 text-zinc-600">{s.tax}</td>
                  <td className="px-6 py-5">
                    <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600">{s.privacy}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </AppLayout>
  );
}
