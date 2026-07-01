import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppHeader } from "./app-header";
import { AppFooter } from "./app-footer";
import { ChatWidget } from "./chat-widget";
import { isAuthed } from "@/lib/auth";

export function AppLayout({ children, requireAuth = true }: { children: ReactNode; requireAuth?: boolean }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (requireAuth && !isAuthed()) {
      navigate({ to: "/auth" });
      return;
    }
    setReady(true);
  }, [navigate, requireAuth]);

  if (requireAuth && !ready) {
    return (
      <div className="min-h-screen bg-off-white" />
    );
  }

  return (
    <div className="min-h-screen bg-off-white font-sans text-zinc-900">
      <AppHeader />
      <div key={typeof window !== "undefined" ? window.location.pathname : "root"} className="animate-fade-in-up">
        {children}
      </div>
      <AppFooter />
      <ChatWidget />
    </div>
  );
}
