import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/app-layout";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Advisor — Amicorp AI Structuring Assistant" },
      { name: "description", content: "Describe your structuring goal and get real-time AI advisory reports from our database." },
    ],
  }),
  component: DashboardPage,
});

function formatMarkdown(text: string) {
  if (!text) return "";
  const parts = text.split("**");
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i} className="font-bold text-navy-950">{part}</strong>;
    }
    return part;
  });
}

function parseChunkContent(dataStr: string): { delta?: string; conversation_id?: string } {
  try {
    const chunk = JSON.parse(dataStr);
    return {
      delta: chunk.choices?.[0]?.delta?.content,
      conversation_id: chunk.conversation_id,
    };
  } catch (err) {
    let delta: string | undefined = undefined;
    let conversation_id: string | undefined = undefined;

    try {
      const normalizedStr = dataStr.replace(/'/g, '"');
      const chunk = JSON.parse(normalizedStr);
      delta = chunk.choices?.[0]?.delta?.content;
      conversation_id = chunk.conversation_id;
      if (delta || conversation_id) {
        return { delta, conversation_id };
      }
    } catch {
      // ignore
    }

    const contentMatch = dataStr.match(/"content":\s*'([\s\S]*?)'\s*\}\s*\]\s*\}/);
    if (contentMatch) {
      const rawContent = contentMatch[1];
      delta = rawContent
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"')
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\\\/g, "\\");
    }

    return { delta, conversation_id };
  }
}

function DashboardPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const analyze = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setAdvice("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query.trim(), conversation_id: conversationId, stream: true }),
      });
      
      if (!res.ok || !res.body) throw new Error(`Analysis failed (${res.status})`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;

          const parsed = parseChunkContent(data);
          if (parsed.conversation_id && !conversationId) {
            setConversationId(parsed.conversation_id);
          }
          if (parsed.delta) {
            setAdvice((prev) => (prev ?? "") + parsed.delta);
          }
        }
      }
    } catch (err) {
      toast.error("Analysis failed", { description: (err as Error).message });
      setAdvice((prev) => (prev ? prev : "Sorry — I couldn't reach the advisory service. Please check your connection and try again."));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setQuery("");
    setAdvice(null);
    setConversationId(null);
    toast("Analysis cleared");
  };

  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid grid-cols-12 gap-8">
          {/* Sidebar */}
          <aside className="col-span-12 space-y-6 lg:col-span-3">
            <div className="space-y-3">
              <h3 className="font-serif text-lg font-medium text-navy-950">Parameters</h3>
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Region</label>
                <div className="flex flex-wrap gap-2">
                  {["Global", "Caribbean", "Asia Pacific", "EMEA"].map((r, i) => (
                    <span
                      key={r}
                      className={`rounded-full px-3 py-1 text-xs transition-colors ${
                        i === 0
                          ? "bg-navy-900 text-white"
                          : "border border-navy-950/10 text-zinc-600 hover:bg-white"
                      }`}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Intent</label>
                <div className="flex flex-wrap gap-2">
                  {["Wealth", "Funds", "Holding", "Trading"].map((r) => (
                    <span key={r} className="rounded-full border border-navy-950/10 px-3 py-1 text-xs text-zinc-600 hover:bg-white">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-navy-900 p-5 text-white shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Market Pulse</p>
              <p className="mt-2 text-sm leading-relaxed text-white/80">
                VCC registrations in Singapore rose 14% this quarter following new regulatory clarity around sub-fund segregation.
              </p>
            </div>
          </aside>

          {/* Main */}
          <div className="col-span-12 space-y-10 lg:col-span-9">
            <section className="space-y-5">
              <h1 className="max-w-[30ch] text-balance font-serif text-4xl font-medium leading-tight text-navy-950 lg:text-5xl">
                Describe your goal.
              </h1>
              <p className="max-w-2xl text-sm text-zinc-500">
                Tell us what you want to achieve. Our engine matches your intent against jurisdictions, entities, and compliance regimes worldwide.
              </p>

              <div className="relative">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) analyze();
                  }}
                  disabled={loading}
                  placeholder="e.g. I need to protect family assets across generations in the Middle East…"
                  rows={3}
                  className="w-full resize-none rounded-md border-none bg-white p-6 text-lg text-navy-950 shadow-sm ring-1 ring-navy-950/5 transition-shadow placeholder:text-zinc-400 focus:outline-none focus:ring-amber-600/30 disabled:opacity-75"
                />
                <div className="absolute bottom-4 right-4 flex gap-2">
                  {advice !== null && (
                    <button
                      onClick={reset}
                      className="inline-flex items-center gap-1.5 rounded border border-navy-950/10 bg-white py-2 px-3 text-sm font-medium text-navy-950 transition-all hover:bg-zinc-50 active:scale-[0.98]"
                    >
                      <RefreshCw className="size-4" />
                      Clear
                    </button>
                  )}
                  <button
                    onClick={analyze}
                    disabled={loading || !query.trim()}
                    className="inline-flex items-center gap-1.5 rounded bg-amber-600 py-2 pl-2 pr-3 text-sm font-medium text-white transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    {loading ? "Analyzing…" : "Generate Analysis"}
                  </button>
                </div>
              </div>
            </section>

            {loading && !advice && (
              <div className="flex items-center gap-3 text-sm text-zinc-500">
                <Loader2 className="size-4 animate-spin text-amber-600" />
                <span className="shimmer-text font-medium">Analyzing your objective across 40+ jurisdictions…</span>
              </div>
            )}

            {advice !== null && (
              <section className="space-y-6">
                <div className="flex items-end justify-between border-b border-navy-950/5 pb-4">
                  <h2 className="font-serif text-2xl font-medium text-navy-950">AI Structuring Report</h2>
                  {loading && (
                    <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
                      <Loader2 className="size-3 animate-spin text-amber-600" />
                      Streaming Response...
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-navy-950/5 bg-white p-6 md:p-8 shadow-sm">
                  <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-700 font-sans">
                    {advice ? formatMarkdown(advice) : (loading ? "Generating report..." : "")}
                  </div>
                </div>
              </section>
            )}

            {advice === null && !loading && (
              <div className="rounded-lg border border-dashed border-navy-950/10 bg-white/50 p-10 text-center">
                <p className="font-serif text-lg text-navy-950">Ready when you are.</p>
                <p className="mt-1 text-sm text-zinc-500">Enter your objective above to see structured advice from our RAG engine.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
