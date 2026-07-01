import { Mail } from "lucide-react";

export function NoMatchState({ query }: { query: string }) {
  return (
    <div className="animate-fade-in-up rounded-lg border border-dashed border-amber-600/30 bg-white p-10 text-center">
      <div className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <Mail className="size-5" />
      </div>
      <h3 className="font-serif text-2xl text-navy-950">Your request is with our advisors</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
        We couldn't find an automatic structural match for <em>"{query}"</em>. Your enquiry has been forwarded to our
        senior advisory team for a bespoke response. You'll hear back within one business day.
      </p>
    </div>
  );
}
