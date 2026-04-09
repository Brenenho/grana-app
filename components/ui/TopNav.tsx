"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
import { formatBRL } from "@/lib/utils";
import { TrendingUp, MessageCircle, LogOut } from "lucide-react";
import { useState } from "react";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    reset();
    router.push("/login");
  }

  const firstName = profile?.full_name?.split(" ")[0] ?? profile?.email?.split("@")[0] ?? "U";

  return (
    <header
      className="sticky top-3 z-[200] flex items-center bg-[#0a0a0c]/90 backdrop-blur-xl border border-white/10 rounded-xl px-3 md:px-[14px] mx-3 md:mx-5 mb-6 h-12 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.04)] slide-down relative"
      style={{
        animation: "slideDown 0.3s cubic-bezier(0.16,1,0.3,1) both",
      }}
    >
      {/* Logo Desktop */}
      <Link href="/dashboard" className="hidden md:flex items-center gap-2 no-underline shrink-0 mr-5">
        <div className="w-[26px] h-[26px] rounded-[7px] bg-[var(--accent)] flex items-center justify-center">
          <TrendingUp size={14} color="#052e16" strokeWidth={2.5} />
        </div>
        <span className="text-[14px] font-bold tracking-[-0.5px] text-[var(--text)]">Grana</span>
      </Link>

      {/* Logo Mobile (Menu Toggle) */}
      <button 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden flex items-center shrink-0"
      >
        <div className="w-[26px] h-[26px] rounded-[7px] bg-[var(--accent)] flex items-center justify-center transition-transform" style={{ transform: isMobileMenuOpen ? 'rotate(180deg)' : 'none' }}>
           <TrendingUp size={14} color="#052e16" strokeWidth={2.5} />
        </div>
      </button>

      {/* Divider Desktop Only */}
      <div className="hidden md:block w-[1px] h-[20px] bg-[var(--border2)] mr-[14px] shrink-0" />

      {/* Spacer pushing right elements to the end on mobile */}
      <div className="flex-1 md:hidden" />

      {/* Nav links Desktop */}
      <nav className="hidden md:flex items-center gap-[1px] flex-1 h-full overflow-x-auto min-w-0 pr-4 no-scrollbar">
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
          <MessageCircle size={12} strokeWidth={2} /> <span>Consultor</span>
        </Link>

        {/* Keeping divider visible on all sizes */}
        <div className="w-[1px] h-[16px] bg-[var(--border)] shrink-0" />

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
          <div className="w-[26px] h-[26px] rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-[11px] font-semibold text-white shrink-0 hidden md:flex">
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

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="absolute top-[115%] left-0 w-[200px] bg-[#0a0a0c]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-2 flex flex-col gap-1 md:hidden slide-down">
          {NAV.map(({ href, label }) => {
            const active = path === href || (href !== "/dashboard" && path.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-3 py-2.5 rounded-lg text-sm transition-colors ${active ? 'bg-white/10 text-white font-medium' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
