"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TrendingUp, Shield, Sparkles, Target } from "lucide-react";

const FEATURES = [
  { icon: TrendingUp, label: "Baldes do Ramit Sethi", sub: "4 baldes automáticos do seu salário" },
  { icon: Target,     label: "Metas visuais",         sub: "Projeção de 12 meses em tempo real" },
  { icon: Sparkles,   label: "Wishlist inteligente",  sub: "Análise automática de viabilidade" },
  { icon: Shield,     label: "Dados seguros",         sub: "Row-level security por usuário" },
];

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function loginWithGoogle() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "24px 16px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background orbs */}
      <div style={{
        position: "absolute", top: "15%", left: "10%",
        width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "15%", right: "10%",
        width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", top: "50%", right: "20%",
        width: 300, height: 300, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(167,139,250,0.04) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div
        className="fade-up"
        style={{
          width: "100%",
          maxWidth: 420,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "var(--accent)",
            boxShadow: "0 8px 32px var(--accent-glow)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <TrendingUp size={28} color="#052e16" strokeWidth={2.5} />
          </div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: -1.5,
              background: "linear-gradient(135deg, #f0f0f8 0%, #8888a8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: 8,
            }}
          >
            grana.app
          </h1>
          <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.6 }}>
            Finanças pessoais com os baldes do Ramit Sethi,<br />
            a mentalidade de Housel e o caixa do Kiyosaki.
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--border2)",
            borderRadius: 20,
            padding: "28px 28px 24px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
          }}
        >
          {/* Features */}
          <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            {FEATURES.map(({ icon: Icon, label, sub }) => (
              <div
                key={label}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 12px", borderRadius: 10,
                  background: "var(--bg3)", border: "1px solid var(--border)",
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: "var(--accent-dim)", border: "1px solid var(--accent-glow)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={15} color="var(--green)" strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{label}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Google button */}
          <button
            onClick={loginWithGoogle}
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px 20px",
              borderRadius: 12,
              background: loading ? "var(--bg4)" : "var(--bg3)",
              border: "1px solid var(--border2)",
              color: "var(--text)",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              transition: "all 0.2s ease",
              fontFamily: "var(--font-dm-sans)",
              opacity: loading ? 0.7 : 1,
              boxShadow: "none",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "var(--bg4)";
                e.currentTarget.style.borderColor = "var(--border3)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.3)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg3)";
              e.currentTarget.style.borderColor = "var(--border2)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.2)",
                  borderTopColor: "var(--green)",
                  animation: "spin 0.7s linear infinite",
                }} />
                Conectando...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.4 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.7 6.5 29.1 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5c11 0 20.5-8 20.5-20.5 0-1.2-.1-2.4-.4-3.5-.2-.9-.5-1.5-.5-2z"/>
                  <path fill="#FF3D00" d="M6.3 15.7l6.6 4.8C14.6 17 19 14.5 24 14.5c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.7 8.5 29.1 6.5 24 6.5c-7.3 0-13.6 4-17.7 9.2z"/>
                  <path fill="#4CAF50" d="M24 45.5c5 0 9.5-1.9 12.9-5l-6-4.9C29.2 37.4 26.7 38.5 24 38.5c-5.2 0-9.5-2.5-11.2-6.1l-6.6 5.1C9.8 42.3 16.5 45.5 24 45.5z"/>
                  <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.5-4.8 5.9l6 4.9c3.5-3.2 5.5-8 5.5-13.8 0-1.4-.2-2.7-.4-4z"/>
                </svg>
                Entrar com Google
              </>
            )}
          </button>

          <p style={{ textAlign: "center", fontSize: 11, color: "var(--text3)", marginTop: 16, lineHeight: 1.6 }}>
            Seus dados são protegidos com row-level security.<br />
            Nenhum dado é compartilhado com terceiros.
          </p>
        </div>
      </div>
    </div>
  );
}
