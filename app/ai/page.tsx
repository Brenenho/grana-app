"use client";
import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { formatBRL } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Bot, Send, User, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CHIPS = [
  "Como tá minha reserva?",
  "Quanto posso gastar essa semana?",
  "Quais meus maiores gastos?",
  "Resumo dos baldes",
  "Dica de investimento",
  "Analisa minha wishlist",
];

export default function AI() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Olá! Sou o Grana, seu assistente financeiro pessoal. 💰\n\nPosso te ajudar a analisar seus baldes, verificar sua reserva, discutir itens da wishlist e dar conselhos baseados no Ramit Sethi, Morgan Housel e Kiyosaki.\n\nComo posso ajudar?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { transactions, goals, wishlist, profile } = useAppStore();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setLoading(true);

    setMessages((prev) => [...prev, { role: "user", content: msg }]);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          context: {
            salary: profile?.salary ?? 0,
            transactionsCount: transactions.length,
            totalSpent: transactions
              .filter((t) => t.type === "despesa")
              .reduce((s, t) => s + Math.abs(t.amount), 0),
            goals: goals.map((g) => ({
              name: g.name,
              current: g.current_amount,
              target: g.target_amount,
            })),
            wishlist: wishlist.map((w) => ({ name: w.name, price: w.price })),
            topCategories: (() => {
              const map: Record<string, number> = {};
              transactions
                .filter((t) => t.type === "despesa")
                .forEach((t) => {
                  map[t.category] = (map[t.category] ?? 0) + Math.abs(t.amount);
                });
              return Object.entries(map)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
            })(),
          },
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Erro ao conectar com a IA. Verifique se a GEMINI_API_KEY está configurada no .env.local.",
        },
      ]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  return (
    <div
      className="fade-up"
      style={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column" }}
    >
      <PageHeader
        title="Consultor Financeiro"
        subtitle="Analise seus gastos, baldes e metas em linguagem natural"
      />

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          paddingBottom: 12,
          paddingRight: 4,
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className="fade-in"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              flexDirection: m.role === "user" ? "row-reverse" : "row",
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background:
                  m.role === "assistant"
                    ? "var(--accent)"
                    : "var(--bg4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: "1px solid var(--border2)",
              }}
            >
              {m.role === "assistant" ? (
                <Bot size={15} color="#052e16" strokeWidth={2} />
              ) : (
                <User size={15} color="var(--text2)" strokeWidth={2} />
              )}
            </div>

            {/* Bubble */}
            <div
              style={{
                maxWidth: "72%",
                padding: "12px 16px",
                borderRadius:
                  m.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                background: m.role === "user" ? "var(--bg4)" : "var(--bg3)",
                border: `1px solid ${m.role === "user" ? "var(--border2)" : "var(--border)"}`,
                fontSize: 13.5,
                lineHeight: 1.75,
                whiteSpace: "pre-wrap",
                color: "var(--text)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, border: "1px solid var(--border2)",
              }}
            >
              <Bot size={15} color="#fff" strokeWidth={2} />
            </div>
            <div
              style={{
                padding: "14px 18px",
                borderRadius: "4px 16px 16px 16px",
                background: "var(--bg3)",
                border: "1px solid var(--border)",
                display: "flex",
                gap: 5,
                alignItems: "center",
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--green)",
                    display: "inline-block",
                    animation: `typing 1.3s ease-in-out ${i * 0.18}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick chips */}
      <div
        style={{
          marginBottom: 10,
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        {CHIPS.map((c) => (
          <button
            key={c}
            onClick={() => send(c)}
            disabled={loading}
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              border: "1px solid var(--border2)",
              background: "var(--bg3)",
              color: "var(--text2)",
              fontSize: 12,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.15s",
              fontFamily: "var(--font-dm-sans)",
              opacity: loading ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.borderColor = "var(--green)";
                e.currentTarget.style.color = "var(--green)";
                e.currentTarget.style.background = "var(--accent-dim)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border2)";
              e.currentTarget.style.color = "var(--text2)";
              e.currentTarget.style.background = "var(--bg3)";
            }}
          >
            <Sparkles size={11} strokeWidth={2} />
            {c}
          </button>
        ))}
      </div>

      {/* Input */}
      <div
        style={{
          display: "flex",
          gap: 10,
          borderTop: "1px solid var(--border)",
          paddingTop: 14,
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Digite ou use linguagem natural... (Enter para enviar)"
          disabled={loading}
          style={{ flex: 1, borderRadius: "12px" }}
          autoFocus
        />
        <Button
          variant="primary"
          onClick={() => send()}
          disabled={loading || !input.trim()}
          style={{ paddingLeft: 16, paddingRight: 16 }}
        >
          <Send size={15} strokeWidth={2.5} />
        </Button>
      </div>
    </div>
  );
}
