import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { signOut, isAuthed } from "@/lib/auth";
import { BookCallModal } from "@/components/book-call-modal";
import { useState } from "react";

const NAV = [
  { to: "/", label: "Advisor" },
  { to: "/services", label: "Services" },
  { to: "/jurisdictions", label: "Jurisdictions" },
  { to: "/structures", label: "Structures" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function AppHeader() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [bookOpen, setBookOpen] = useState(false);

  const handleLogout = () => {
    signOut();
    toast.success("Signed out", { description: "See you soon." });
    navigate({ to: "/auth" });
  };

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-navy-950/5 bg-off-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-10">
            <Link to="/" className="font-serif text-xl font-semibold tracking-tight text-navy-950">
              Amicorp <span className="text-amber-600">AI</span>
            </Link>
            <div className="hidden gap-6 md:flex">
              {NAV.map((item) => {
                const active = pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`story-link text-sm font-medium transition-colors ${
                      active ? "text-navy-950" : "text-zinc-500 hover:text-navy-950"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBookOpen(true)}
              className="inline-flex items-center rounded-sm bg-navy-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-navy-950 hover:scale-[1.02] active:scale-[0.98]"
            >
              Book a Call
            </button>
            {isAuthed() && (
              <button
                onClick={handleLogout}
                aria-label="Logout"
                className="inline-flex items-center gap-1.5 rounded-sm px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:text-navy-950"
              >
                <LogOut className="size-4" />
              </button>
            )}
          </div>
        </div>
      </nav>
      <BookCallModal open={bookOpen} onOpenChange={setBookOpen} />
    </>
  );
}
