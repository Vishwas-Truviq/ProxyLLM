import { Link } from "@tanstack/react-router";

export function AppFooter() {
  return (
    <footer className="mt-24 border-t border-navy-950/5 bg-navy-950 text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-14 md:grid-cols-4">
        <div className="space-y-3">
          <div className="font-serif text-xl">Amicorp <span className="text-amber-600">AI</span></div>
          <p className="max-w-xs text-sm text-white/60">
            Global corporate services powered by a proprietary structuring intelligence engine.
          </p>
        </div>
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-amber-600">Company</p>
          <ul className="space-y-2 text-sm text-white/70">
            <li><Link to="/about" className="hover:text-white">About</Link></li>
            <li><Link to="/services" className="hover:text-white">Services</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-amber-600">Explore</p>
          <ul className="space-y-2 text-sm text-white/70">
            <li><Link to="/jurisdictions" className="hover:text-white">Jurisdictions</Link></li>
            <li><Link to="/structures" className="hover:text-white">Structures</Link></li>
            <li><Link to="/" className="hover:text-white">Advisor</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-amber-600">Legal</p>
          <ul className="space-y-2 text-sm text-white/70">
            <li><a href="#" className="hover:text-white">Privacy</a></li>
            <li><a href="#" className="hover:text-white">Terms</a></li>
            <li><a href="#" className="hover:text-white">Compliance</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-[11px] uppercase tracking-widest text-white/40">
        © {new Date().getFullYear()} Amicorp Group · Confidential & Proprietary
      </div>
    </footer>
  );
}
