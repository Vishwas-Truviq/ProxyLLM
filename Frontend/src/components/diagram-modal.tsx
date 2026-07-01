import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Recommendation } from "@/lib/rec-types";
import { toast } from "sonner";

export function DiagramModal({ open, onOpenChange, rec }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rec: Recommendation | null;
}) {
  if (!rec) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Structure Diagram</DialogTitle>
          <p className="text-sm text-zinc-500">{rec.entityName} · Illustrative flow</p>
        </DialogHeader>

        <div className="rounded-lg border border-navy-950/5 bg-off-white p-6">
          <svg viewBox="0 0 600 380" className="h-auto w-full">
            <defs>
              <marker id="arr" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
                <path d="M0,0 L10,5 L0,10 Z" fill="#e05a2b" />
              </marker>
            </defs>

            {/* Client / UBO */}
            <g>
              <rect x="230" y="20" width="140" height="54" rx="6" fill="#0f1623" />
              <text x="300" y="45" textAnchor="middle" fill="#fff" fontSize="13" fontFamily="Inter" fontWeight="600">Client / UBO</text>
              <text x="300" y="62" textAnchor="middle" fill="#e05a2b" fontSize="10" fontFamily="Inter">Ultimate Beneficial Owner</text>
            </g>

            <line x1="300" y1="74" x2="300" y2="140" stroke="#e05a2b" strokeWidth="1.5" markerEnd="url(#arr)" />

            {/* Entity */}
            <g>
              <rect x="180" y="150" width="240" height="70" rx="8" fill="#fff" stroke="#e05a2b" strokeWidth="1.5" />
              <text x="300" y="180" textAnchor="middle" fill="#0a1019" fontSize="14" fontFamily="Playfair Display" fontWeight="600">{rec.entityName}</text>
              <text x="300" y="200" textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="Inter">{rec.jurisdiction}</text>
              <text x="300" y="214" textAnchor="middle" fill="#e05a2b" fontSize="10" fontFamily="Inter">Annual: {rec.annualCost}</text>
            </g>

            <line x1="240" y1="220" x2="120" y2="290" stroke="#0f1623" strokeOpacity="0.4" strokeWidth="1.2" markerEnd="url(#arr)" />
            <line x1="300" y1="220" x2="300" y2="290" stroke="#0f1623" strokeOpacity="0.4" strokeWidth="1.2" markerEnd="url(#arr)" />
            <line x1="360" y1="220" x2="480" y2="290" stroke="#0f1623" strokeOpacity="0.4" strokeWidth="1.2" markerEnd="url(#arr)" />

            {/* Leaves */}
            <g>
              <rect x="40" y="300" width="160" height="54" rx="6" fill="#fff" stroke="#0f1623" strokeOpacity="0.1" />
              <text x="120" y="322" textAnchor="middle" fill="#0a1019" fontSize="12" fontFamily="Inter" fontWeight="600">Subsidiary</text>
              <text x="120" y="340" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="Inter">Operating entity</text>
            </g>
            <g>
              <rect x="220" y="300" width="160" height="54" rx="6" fill="#fff" stroke="#0f1623" strokeOpacity="0.1" />
              <text x="300" y="322" textAnchor="middle" fill="#0a1019" fontSize="12" fontFamily="Inter" fontWeight="600">Bank Account</text>
              <text x="300" y="340" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="Inter">Tier-1 custodian</text>
            </g>
            <g>
              <rect x="400" y="300" width="160" height="54" rx="6" fill="#fff" stroke="#0f1623" strokeOpacity="0.1" />
              <text x="480" y="322" textAnchor="middle" fill="#0a1019" fontSize="12" fontFamily="Inter" fontWeight="600">Asset Holdings</text>
              <text x="480" y="340" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="Inter">IP · Equities · Real Estate</text>
            </g>
          </svg>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-[11px] text-zinc-500">Illustrative only. Actual structure depends on advisor review.</p>
          <button
            onClick={() => {
              toast.success("Specialist notified", { description: "You'll receive an intro within one business day." });
              onOpenChange(false);
            }}
            className="rounded-sm bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-all hover:brightness-110"
          >
            Contact Specialist
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
