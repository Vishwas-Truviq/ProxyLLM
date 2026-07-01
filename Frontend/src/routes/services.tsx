import { createFileRoute } from "@tanstack/react-router";
import { Building2, Landmark, ShieldCheck, Scale, Wallet, Globe2 } from "lucide-react";
import { AppLayout } from "@/components/app-layout";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — Amicorp AI" },
      { name: "description", content: "Corporate services across entity formation, fund administration, trust & fiduciary, tax structuring, and compliance." },
      { property: "og:title", content: "Services — Amicorp AI" },
      { property: "og:description", content: "End-to-end corporate services for family offices, funds, and multinationals." },
    ],
  }),
  component: ServicesPage,
});

const SERVICES = [
  { icon: Building2, title: "Entity Formation", desc: "Incorporation and lifecycle management across 40+ jurisdictions with fast, compliant onboarding." },
  { icon: Landmark, title: "Fund Administration", desc: "NAV calculation, investor services, and regulatory reporting for VCC, SPC, and master–feeder structures." },
  { icon: ShieldCheck, title: "Trust & Fiduciary", desc: "Discretionary trusts, purpose trusts, and private trust companies engineered for succession." },
  { icon: Scale, title: "Compliance & KYC", desc: "AML, FATCA/CRS, economic substance and beneficial-ownership reporting handled end-to-end." },
  { icon: Wallet, title: "Tax Structuring", desc: "Cross-border tax planning aligned with treaty networks, BEPS 2.0, and substance requirements." },
  { icon: Globe2, title: "Global Expansion", desc: "Local nominee directors, registered offices, and payroll for scaling into new markets." },
];

function ServicesPage() {
  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="max-w-3xl">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-600">Services</p>
          <h1 className="font-serif text-5xl font-medium leading-tight text-navy-950">
            Full-spectrum corporate services, delivered with discretion.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-zinc-500">
            From incorporation to complex multi-jurisdictional restructures — our advisors integrate legal, tax, and operational execution under one roof.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s, i) => (
            <div
              key={s.title}
              className="group animate-fade-in-up rounded-lg bg-white p-8 ring-1 ring-navy-950/5 transition-all hover:-translate-y-1 hover:ring-navy-950/15"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="mb-5 inline-flex size-11 items-center justify-center rounded-md bg-amber-50 text-amber-600 transition-colors group-hover:bg-navy-900 group-hover:text-amber-500">
                <s.icon className="size-5" />
              </div>
              <h3 className="font-serif text-xl text-navy-950">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </AppLayout>
  );
}
