import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function BookCallModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onOpenChange(false);
      toast.success("Call requested", {
        description: "A senior advisor will reach out within one business day.",
      });
    }, 700);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Book a private consultation</DialogTitle>
          <DialogDescription>
            Confidential. Answered by a partner-level advisor within 24 hours.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="Full name" className="rounded-sm border border-navy-950/10 bg-white px-3 py-2.5 text-sm focus:border-amber-600 focus:outline-none" />
            <input required placeholder="Company" className="rounded-sm border border-navy-950/10 bg-white px-3 py-2.5 text-sm focus:border-amber-600 focus:outline-none" />
          </div>
          <input required type="email" placeholder="Work email" className="w-full rounded-sm border border-navy-950/10 bg-white px-3 py-2.5 text-sm focus:border-amber-600 focus:outline-none" />
          <textarea rows={3} placeholder="Briefly describe your structuring interest…" className="w-full rounded-sm border border-navy-950/10 bg-white px-3 py-2.5 text-sm focus:border-amber-600 focus:outline-none" />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-sm bg-amber-600 py-3 text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? "Requesting…" : "Request Consultation"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
