import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, Phone, MapPin } from "lucide-react";
import { AppLayout } from "@/components/app-layout";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Amicorp AI" },
      { name: "description", content: "Speak with an Amicorp advisor. Confidential replies within one business day." },
      { property: "og:title", content: "Contact — Amicorp AI" },
      { property: "og:description", content: "Get in touch with our global corporate services team." },
    ],
  }),
  component: ContactPage,
});

const OFFICES = [
  { city: "Singapore", addr: "One Raffles Quay, North Tower" },
  { city: "London", addr: "12 St James's Square" },
  { city: "Dubai (DIFC)", addr: "Gate Village Building 10" },
  { city: "Zürich", addr: "Bahnhofstrasse 22" },
];

function ContactPage() {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      (e.target as HTMLFormElement).reset();
      toast.success("Message sent", { description: "An advisor will respond within one business day." });
    }, 700);
  };

  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="max-w-3xl">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-600">Contact</p>
          <h1 className="font-serif text-5xl font-medium leading-tight text-navy-950">Speak with an advisor.</h1>
          <p className="mt-4 max-w-2xl text-lg text-zinc-500">
            Every enquiry is reviewed personally by a partner-level advisor. Confidential responses within 24 hours.
          </p>
        </div>

        <div className="mt-12 grid gap-10 md:grid-cols-5">
          <form onSubmit={handleSubmit} className="col-span-3 space-y-4 rounded-lg bg-white p-8 ring-1 ring-navy-950/5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full name" name="name" required />
              <Field label="Company" name="company" />
            </div>
            <Field label="Work email" name="email" type="email" required />
            <Field label="Phone" name="phone" type="tel" />
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Message</label>
              <textarea
                required
                rows={5}
                placeholder="Briefly describe your structuring interest…"
                className="w-full rounded-sm border border-navy-950/10 bg-white px-3 py-2.5 text-sm focus:border-amber-600 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-sm bg-navy-900 py-3 text-sm font-medium uppercase tracking-widest text-white transition-all hover:bg-amber-600 disabled:opacity-60"
            >
              {submitting ? "Sending…" : "Send Enquiry"}
            </button>
          </form>

          <aside className="col-span-2 space-y-8">
            <div className="rounded-lg bg-navy-900 p-6 text-white">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Direct</p>
              <div className="mt-4 space-y-3 text-sm">
                <a href="mailto:advisors@amicorp.ai" className="flex items-center gap-3 hover:text-amber-500">
                  <Mail className="size-4" /> advisors@amicorp.ai
                </a>
                <a href="tel:+6565550100" className="flex items-center gap-3 hover:text-amber-500">
                  <Phone className="size-4" /> +65 6555 0100
                </a>
              </div>
            </div>

            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Offices</p>
              <ul className="space-y-3">
                {OFFICES.map((o) => (
                  <li key={o.city} className="flex items-start gap-3 text-sm text-zinc-700">
                    <MapPin className="mt-0.5 size-4 text-amber-600" />
                    <div>
                      <p className="font-medium text-navy-950">{o.city}</p>
                      <p className="text-zinc-500">{o.addr}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </AppLayout>
  );
}

function Field({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full rounded-sm border border-navy-950/10 bg-white px-3 py-2.5 text-sm focus:border-amber-600 focus:outline-none"
      />
    </div>
  );
}
