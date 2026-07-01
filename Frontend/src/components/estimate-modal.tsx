import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Recommendation } from "@/lib/rec-types";

export function EstimateModal({ open, onOpenChange, rec }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rec: Recommendation | null;
}) {
  if (!rec) return null;
  const rows: Array<[string, string | undefined]> = [
    ["Setup Fee", rec.fees?.setupFee],
    ["Corporate Director Fee", rec.fees?.corporateDirectorFee],
    ["Registered Office Fee", rec.fees?.registeredOfficeFee],
    ["Corporate Secretary Fee", rec.fees?.corporateSecretaryFee],
    ["Government Fee", rec.fees?.governmentFee],
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Fee Estimate</DialogTitle>
          <p className="text-sm text-zinc-500">{rec.entityName} · {rec.jurisdiction}</p>
        </DialogHeader>
        <div className="mt-2 divide-y divide-navy-950/5 rounded-md border border-navy-950/5 bg-white">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-zinc-600">{label}</span>
              <span className="text-sm font-medium text-navy-950">{value ?? "—"}</span>
            </div>
          ))}
          <div className="flex items-center justify-between bg-amber-50 px-4 py-3">
            <span className="text-sm font-semibold text-navy-950">Annual Fee Total</span>
            <span className="font-serif text-lg font-semibold text-amber-600">{rec.fees?.annualFeeTotal ?? rec.annualCost}</span>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-zinc-500">
          Estimates are indicative. Final quotes are provided upon KYC and scope confirmation.
        </p>
      </DialogContent>
    </Dialog>
  );
}
