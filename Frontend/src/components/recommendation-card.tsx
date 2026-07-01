import { useState } from "react";
import { Check, TrendingUp, ChevronRight } from "lucide-react";
import type { Recommendation } from "@/lib/rec-types";
import { EstimateModal } from "./estimate-modal";
import { DiagramModal } from "./diagram-modal";

export function RecommendationCard({ rec, index = 0 }: { rec: Recommendation; index?: number }) {
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [diagramOpen, setDiagramOpen] = useState(false);

  const benefits = [rec.benefit1, rec.benefit2, rec.benefit3].filter(Boolean) as string[];

  return (
    <div
      className="group animate-fade-in-up flex flex-col gap-6 rounded-lg bg-white p-6 ring-1 ring-navy-950/5 transition-all hover:ring-navy-950/15 md:p-8"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-navy-900 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
              {rec.jurisdiction}
            </span>
            {rec.categories?.slice(0, 1).map((c) => (
              <span key={c} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                {c}
              </span>
            ))}
          </div>
          <h3 className="font-serif text-2xl font-medium text-navy-950">{rec.entityName}</h3>
          {rec.desc && <p className="max-w-[60ch] text-pretty text-sm text-zinc-500">{rec.desc}</p>}
        </div>
        <div className="text-right">
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-4xl font-medium text-amber-600">{rec.score}</span>
            <span className="text-lg text-amber-600">%</span>
          </div>
          <div className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-tighter text-zinc-400">
            <TrendingUp className="size-3" /> Match
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 border-y border-navy-950/5 py-5 md:grid-cols-4">
        <Meta label="Setup Time" value={rec.setupTime} />
        <Meta label="Setup Cost" value={rec.setupCost} highlight />
        <Meta label="Annual Cost" value={rec.annualCost} highlight />
        <Meta label="Public Register" value={rec.publicRegister} />
      </div>

      {benefits.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Key Benefits</p>
            <ul className="space-y-1.5">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-zinc-700">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            {rec.legalFramework && (
              <MiniRow label="Legal Framework" value={rec.legalFramework} />
            )}
            {rec.liabilityProtection && (
              <MiniRow label="Liability" value={rec.liabilityProtection} />
            )}
            {rec.idealFor && rec.idealFor.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Ideal For</p>
                <div className="flex flex-wrap gap-1.5">
                  {rec.idealFor.map((i) => (
                    <span key={i} className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">{i}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {rec.categories?.map((c) => (
            <span key={c} className="rounded bg-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-600">{c}</span>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEstimateOpen(true)}
            className="rounded-sm border border-navy-950/10 px-4 py-2 text-sm font-medium text-navy-950 transition-all hover:bg-navy-950/5 hover:scale-[1.02] active:scale-[0.98]"
          >
            Estimate
          </button>
          <button
            onClick={() => setDiagramOpen(true)}
            className="inline-flex items-center gap-1 rounded-sm bg-navy-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-navy-950 hover:scale-[1.02] active:scale-[0.98]"
          >
            Diagram <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      <EstimateModal open={estimateOpen} onOpenChange={setEstimateOpen} rec={rec} />
      <DiagramModal open={diagramOpen} onOpenChange={setDiagramOpen} rec={rec} />
    </div>
  );
}

function Meta({ label, value, highlight }: { label: string; value?: string; highlight?: boolean }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-bold uppercase tracking-tighter text-zinc-400">{label}</span>
      <p className={`text-sm font-medium ${highlight ? "text-navy-950" : "text-zinc-700"}`}>{value ?? "—"}</p>
    </div>
  );
}

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-navy-950/5 pb-1.5 text-sm">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
      <span className="text-right text-sm text-zinc-700">{value}</span>
    </div>
  );
}
