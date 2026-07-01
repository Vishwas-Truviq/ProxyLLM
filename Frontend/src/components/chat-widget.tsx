import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, RotateCcw } from "lucide-react";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What are the fees for a Cayman Islands fund?",
  "How long to set up a BVI company?",
  "What are FATCA/CRS requirements?",
  "Which entity suits wealth protection?",
];

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

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hello. I'm your Amicorp advisory assistant. Ask me anything about entities, jurisdictions, or compliance." },
  ]);
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = async (text: string) => {
    if (!text.trim() || streaming) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages((m) => [...m, userMsg, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content, conversation_id: conversationId, stream: true }),
      });
      if (!res.ok || !res.body) throw new Error(`Chat failed (${res.status})`);

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
          const delta = parsed.delta;
          if (delta) {
            setMessages((m) => {
              const copy = [...m];
              const last = copy[copy.length - 1];
              if (last?.role === "assistant") {
                copy[copy.length - 1] = { ...last, content: last.content + delta };
              }
              return copy;
            });
          }
        }
      }
    } catch (err) {
      toast.error("Assistant unavailable", { description: (err as Error).message });
      setMessages((m) => {
        const copy = [...m];
        if (copy[copy.length - 1]?.role === "assistant" && !copy[copy.length - 1].content) {
          copy[copy.length - 1] = { role: "assistant", content: "Sorry — I couldn't reach the advisory service. Please try again shortly." };
        }
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  };

  const reset = () => {
    setConversationId(null);
    setMessages([{ role: "assistant", content: "New conversation started. How can I help?" }]);
    toast("Conversation reset");
  };

  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="animate-scale-in flex w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-navy-950/10">
          <div className="flex items-center justify-between bg-navy-900 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-widest text-white">Advisory Assistant</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={reset} aria-label="Reset" className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white">
                <RotateCcw className="size-3.5" />
              </button>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white">
                <X className="size-4" />
              </button>
            </div>
          </div>

          {messages.length === 1 && (
            <div className="flex flex-wrap gap-1.5 border-b border-navy-950/5 p-3">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-navy-950/10 px-2.5 py-1 text-[11px] text-zinc-600 transition-colors hover:border-amber-600 hover:text-navy-950"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div ref={scrollRef} className="max-h-80 min-h-[16rem] space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={`animate-fade-in-up ${m.role === "user" ? "text-right" : ""}`}>
                <span className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-navy-900 text-white"
                    : "bg-zinc-100 text-zinc-800"
                }`}>
                  {m.content ? formatMarkdown(m.content) : (streaming ? <span className="shimmer-text">Thinking…</span> : "…")}
                </span>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 border-t border-navy-950/5 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a follow-up…"
              className="flex-1 bg-transparent text-sm placeholder:text-zinc-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className="rounded bg-amber-600 p-2 text-white transition-all hover:brightness-110 disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="size-3.5" />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Chat"
        className="flex size-14 items-center justify-center rounded-full bg-navy-900 text-white shadow-xl transition-all hover:scale-105 hover:bg-amber-600 active:scale-95"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </button>
    </div>
  );
}
