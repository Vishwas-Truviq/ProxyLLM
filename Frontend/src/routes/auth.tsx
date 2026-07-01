import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock, User } from "lucide-react";
import { signIn, isAuthed } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Amicorp AI" },
      { name: "description", content: "Sign in to access the Amicorp AI Structuring Assistant." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthed()) navigate({ to: "/" });
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (signIn(username, password)) {
        toast.success("Welcome back", { description: "Loading your advisory workspace…" });
        navigate({ to: "/" });
      } else {
        toast.error("Invalid credentials", { description: "Please check your username and password." });
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy-950 px-6">
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage: "radial-gradient(circle at 20% 20%, rgba(224,90,43,0.15), transparent 40%), radial-gradient(circle at 80% 80%, rgba(224,90,43,0.08), transparent 40%)",
      }} />
      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        <div className="mb-8 text-center">
          <div className="font-serif text-3xl font-semibold text-white">
            Amicorp <span className="text-amber-600">AI</span>
          </div>
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-white/50">Global Corporate Services</p>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-2xl ring-1 ring-white/10">
          <h1 className="font-serif text-2xl text-navy-950">Advisor sign-in</h1>
          <p className="mt-1 text-sm text-zinc-500">Enter your credentials to continue.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full rounded-sm border border-navy-950/10 bg-white py-3 pl-10 pr-3 text-sm focus:border-amber-600 focus:outline-none"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-sm border border-navy-950/10 bg-white py-3 pl-10 pr-3 text-sm focus:border-amber-600 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-sm bg-navy-900 py-3 text-sm font-medium uppercase tracking-widest text-white transition-all hover:bg-amber-600 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] text-zinc-400">
            Demo credentials: <span className="font-mono text-zinc-600">amicorp</span> / <span className="font-mono text-zinc-600">Admin@123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
