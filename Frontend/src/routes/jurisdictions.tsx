import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { useState } from "react";

export const Route = createFileRoute("/jurisdictions")({
  head: () => ({
    meta: [
      { title: "Jurisdictions — Amicorp AI" },
      { name: "description", content: "Explore corporate jurisdictions across the Caribbean, Asia Pacific, EMEA, and Americas." },
      { property: "og:title", content: "Jurisdictions — Amicorp AI" },
      { property: "og:description", content: "40+ jurisdictions, ranked by suitability for your structuring intent." },
    ],
  }),
  component: JurisdictionsPage,
});

const REGIONS = ["All", "Caribbean", "Asia Pacific", "EMEA", "Americas"] as const;

const JURISDICTIONS = [
  { name: "British Virgin Islands", code: "BVI", region: "Caribbean", tag: "Speed", setup: "3–5 days", best: "Holding & IP" },
  { name: "Cayman Islands", code: "KY", region: "Caribbean", tag: "Funds", setup: "2–3 weeks", best: "Investment funds" },
  { name: "Singapore", code: "SG", region: "Asia Pacific", tag: "Substance", setup: "4–6 weeks", best: "Family office & VCC" },
  { name: "Hong Kong", code: "HK", region: "Asia Pacific", tag: "Treaty", setup: "2–4 weeks", best: "APAC trading" },
  { name: "Luxembourg", code: "LU", region: "EMEA", tag: "Institutional", setup: "6–8 weeks", best: "Private equity SPVs" },
  { name: "UAE (DIFC/ADGM)", code: "AE", region: "EMEA", tag: "Regional HQ", setup: "3–5 weeks", best: "Middle East wealth" },
  { name: "Netherlands", code: "NL", region: "EMEA", tag: "Treaties", setup: "3–4 weeks", best: "IP holding" },
  { name: "Delaware, USA", code: "US", region: "Americas", tag: "Legal depth", setup: "1–2 weeks", best: "US-facing ops" },
];

function JurisdictionsPage() {
  const [region, setRegion] = useState<(typeof REGIONS)[number]>("All");
  const filtered = region === "All" ? JURISDICTIONS : JURISDICTIONS.filter((j) => j.region === region);

  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="max-w-3xl">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-600">Jurisdictions</p>
          <h1 className="font-serif text-5xl font-medium leading-tight text-navy-950">A curated global footprint.</h1>
          <p className="mt-4 max-w-2xl text-lg text-zinc-500">
            Each jurisdiction has been vetted for regulatory quality, banking access, treaty depth, and long-term stability.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-2">
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                region === r
                  ? "bg-navy-900 text-white"
                  : "border border-navy-950/10 text-zinc-600 hover:bg-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((j, i) => (
            <div
              key={j.code}
              className="group animate-fade-in-up flex flex-col gap-4 rounded-lg bg-white p-6 ring-1 ring-navy-950/5 transition-all hover:-translate-y-1 hover:ring-navy-950/15"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{j.region}</p>
                  <h3 className="font-serif text-xl text-navy-950">{j.name}</h3>
                </div>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-600">{j.tag}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-navy-950/5 pt-4 text-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-tighter text-zinc-400">Setup</p>
                  <p className="text-navy-950">{j.setup}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-tighter text-zinc-400">Best For</p>
                  <p className="text-navy-950">{j.best}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </AppLayout>
  );
}
