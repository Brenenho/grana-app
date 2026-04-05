"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
import { formatBRL } from "@/lib/utils";
import { TrendingUp, MessageCircle, LogOut } from "lucide-react";

const NAV = [
  { href: "/dashboard",    label: "Início" },
  { href: "/transactions", label: "Transações" },
  { href: "/budget",       label: "Orçamento" },
  { href: "/goals",        label: "Metas" },
  { href: "/wishlist",     label: "Desejos" },
  { href: "/reports",      label: "Relatórios" },
];

export default function TopNav() {
  const path = usePathname();
  const router = useRouter();
  const { profile, reset } = useAppStore();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    reset();
    router.push("/login");
  }

  const firstName = profile?.full_name?.split(" ")[0] ?? profile?.email?.split("@")[0] ?? "U";

  return (
    <header
      style={{
        position: "fixed",
        top: 12,
        left: 20,
        right: 20,
        height: 48,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        background: "rgba(10,10,12,0.82)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 14,
        padding: "0 14px",
        gap: 0,
        boxShadow: "0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
        animation: "slideDown 0.3s cubic-bezier(0.16,1,0.3,1) both",
      }}
    >
      {/* Logo */}
      <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", flexShrink: 0, marginRight: 20 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: "var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <TrendingUp size={14} color="#052e16" strokeWidth={2.5} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.5, color: "var(--text)" }}>
          Grana
        </span>
      </Link>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: "var(--border2)", marginRight: 14, flexShrink: 0 }} />

      {/* Nav links */}
      <nav style={{ display: "flex", alignItems: "center", gap: 1, flex: 1, height: "100%" }}>
        {NAV.map(({ href, label }) => {
          const active = path === href || (href !== "/dashboard" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              style={{
                fontSize: 12.5,
                fontWeight: active ? 500 : 400,
                padding: "5px 11px",
                borderRadius: 8,
                textDecoration: "none",
                color: active ? "var(--text)" : "var(--text3)",
                background: active ? "rgba(255,255,255,0.06)" : "transparent",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => { if (!active) { e.currentTarget.style.color = "var(--text2)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; } }}
              onMouseLeave={(e) => { if (!active) { e.currentTarget.style.color = "var(--text3)"; e.currentTarget.style.background = "transparent"; } }}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 8 }}>
        <Link href="/ai" style={{
          display: "flex", alignItems: "center", gap: 5,
          fontSize: 12, color: path.startsWith("/ai") ? "var(--accent)" : "var(--text3)",
          textDecoration: "none", padding: "4px 9px", borderRadius: 7,
          background: path.startsWith("/ai") ? "var(--accent-dim)" : "transparent",
          transition: "all 0.15s",
        }}
          onMouseEnter={(e) => { if (!path.startsWith("/ai")) { e.currentTarget.style.color = "var(--text2)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; } }}
          onMouseLeave={(e) => { if (!path.startsWith("/ai")) { e.currentTarget.style.color = "var(--text3)"; e.currentTarget.style.background = "transparent"; } }}
        >
          <MessageCircle size={12} strokeWidth={2} /> Consultor
        </Link>

        <div style={{ width: 1, height: 16, background: "var(--border)", flexShrink: 0 }} />

        {profile && (
          <span style={{
            fontSize: 12, fontWeight: 600,
            fontFamily: "var(--font-dm-mono), monospace",
            color: "var(--accent)",
            padding: "3px 9px",
            background: "var(--accent-dim)",
            borderRadius: 20,
            border: "1px solid rgba(74,222,128,0.15)",
            whiteSpace: "nowrap",
          }}>
            {formatBRL(profile.salary)}
          </span>
        )}

        {profile && (
          <div style={{
            width: 26, height: 26, borderRadius: "50%",
            background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 600, color: "#fff", flexShrink: 0,
          }}>
            {firstName[0]?.toUpperCase() ?? "U"}
          </div>
        )}

        <button onClick={logout} title="Sair" style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text3)", padding: 4, borderRadius: 6,
          display: "flex", alignItems: "center", transition: "color 0.15s",
        }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--red)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text3)")}
        >
          <LogOut size={13} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
}
