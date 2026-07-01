import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Amicorp AI" },
      { name: "description", content: "Amicorp: three decades of cross-border corporate advisory, now enhanced by AI." },
      { property: "og:title", content: "About — Amicorp AI" },
      { property: "og:description", content: "A senior advisory team combined with a proprietary AI structuring engine." },
    ],
  }),
  component: AboutPage,
});

const STATS = [
  { k: "30+", v: "Years advising" },
  { k: "40+", v: "Jurisdictions" },
  { k: "8,000+", v: "Structures managed" },
  { k: "24h", v: "Advisor response" },
];

function AboutPage() {
  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl px-6 py-16">
        <section className="grid gap-12 md:grid-cols-5">
          <div className="md:col-span-3">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-600">About</p>
            <h1 className="font-serif text-5xl font-medium leading-tight text-navy-950">
              Three decades of quiet, considered advisory.
            </h1>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-zinc-600">
              <p>
                Amicorp was founded on a simple belief: cross-border structuring should feel like private banking, not a paperwork exercise.
              </p>
              <p>
                Today we combine a senior advisory team with a proprietary AI structuring engine that surfaces the optimal jurisdiction and entity within seconds — grounded in real regulatory data, not marketing copy.
              </p>
              <p>
                Our clients are family offices, funds, and founders who value discretion, precision, and outcomes that hold up under scrutiny.
              </p>
            </div>
          </div>
          <aside className="space-y-4 md:col-span-2">
            <div className="rounded-lg bg-navy-900 p-8 text-white">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Our engine</p>
              <p className="mt-3 font-serif text-2xl leading-snug">
                "Structuring intelligence, not structuring paperwork."
              </p>
              <p className="mt-4 text-sm text-white/70">
                The Advisor system is trained on our full corpus of jurisdictional analysis, compliance regimes, and thirty years of advisory notes.
              </p>
            </div>
          </aside>
        </section>

        <section className="mt-16 grid grid-cols-2 gap-6 border-t border-navy-950/5 pt-10 md:grid-cols-4">
          {STATS.map((s, i) => (
            <div key={s.k} className="animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="font-serif text-4xl font-medium text-amber-600">{s.k}</div>
              <p className="mt-1 text-sm text-zinc-500">{s.v}</p>
            </div>
          ))}
        </section>
      </main>
    </AppLayout>
  );
}
