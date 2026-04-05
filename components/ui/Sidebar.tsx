"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
import { formatBRL } from "@/lib/utils";
import {
  LayoutDashboard,
  ArrowUpDown,
  PieChart,
  Target,
  Star,
  BarChart2,
  MessageCircle,
  LogOut,
  DollarSign,
  TrendingUp,
} from "lucide-react";

const NAV_MAIN = [
  { href: "/dashboard",    Icon: LayoutDashboard, label: "Início" },
  { href: "/transactions", Icon: ArrowUpDown,      label: "Transações" },
  { href: "/budget",       Icon: PieChart,         label: "Orçamento" },
  { href: "/goals",        Icon: Target,           label: "Metas" },
  { href: "/wishlist",     Icon: Star,             label: "Desejos" },
  { href: "/reports",      Icon: BarChart2,        label: "Relatórios" },
];

const NAV_BOTTOM = [
  { href: "/ai", Icon: MessageCircle, label: "Consultor" },
];

export default function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const { profile, reset } = useAppStore();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    reset();
    router.push("/login");
  }

  const firstName = profile?.full_name?.split(" ")[0] ?? profile?.email?.split("@")[0] ?? "Usuário";

  const NavItem = ({ href, Icon, label }: { href: string; Icon: React.ElementType; label: string }) => {
    const active = path === href || (href !== "/dashboard" && path.startsWith(href));
    return (
      <Link
        href={href}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          fontSize: 13.5,
          textDecoration: "none",
          borderRadius: 8,
          marginBottom: 1,
          color: active ? "var(--text)" : "var(--text2)",
          background: active ? "var(--bg4)" : "transparent",
          border: active ? "1px solid var(--border2)" : "1px solid transparent",
          transition: "all 0.15s ease",
          fontWeight: active ? 500 : 400,
          position: "relative",
        }}
        onMouseEnter={(e) => { if (!active) { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.background = "var(--bg3)"; } }}
        onMouseLeave={(e) => { if (!active) { e.currentTarget.style.color = "var(--text2)"; e.currentTarget.style.background = "transparent"; } }}
      >
        {active && (
          <span style={{
            position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
            width: 3, height: 18, background: "var(--accent)", borderRadius: "0 3px 3px 0",
          }} />
        )}
        <Icon
          size={16}
          strokeWidth={active ? 2.2 : 1.8}
          color={active ? "var(--accent)" : "currentColor"}
          style={{ flexShrink: 0 }}
        />
        {label}
      </Link>
    );
  };

  return (
    <aside style={{
      width: 230,
      background: "var(--bg2)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      position: "sticky",
      top: 0,
      flexShrink: 0,
    }}>

      {/* Logo */}
      <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <TrendingUp size={17} color="#052e16" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.5, color: "var(--text)" }}>
              Grana
            </div>
            <div style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.3px" }}>
              finanças pessoais
            </div>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav style={{ padding: "10px 8px", flex: 1, overflowY: "auto" }}>
        <div style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.8px", textTransform: "uppercase", padding: "4px 12px 8px", fontWeight: 500 }}>
          Menu
        </div>
        {NAV_MAIN.map((item) => <NavItem key={item.href} {...item} />)}

        <div style={{ margin: "14px 0 8px", borderTop: "1px solid var(--border)" }} />

        <div style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.8px", textTransform: "uppercase", padding: "4px 12px 8px", fontWeight: 500 }}>
          Ferramentas
        </div>
        {NAV_BOTTOM.map((item) => <NavItem key={item.href} {...item} />)}
      </nav>

      {/* Salary card */}
      {profile && (
        <div style={{ margin: "0 10px 10px" }}>
          <div style={{
            padding: "12px 14px",
            background: "var(--bg3)",
            border: "1px solid var(--border)",
            borderRadius: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <DollarSign size={11} color="var(--text3)" strokeWidth={2} />
              <span style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.3px", fontWeight: 500 }}>
                salário mensal
              </span>
            </div>
            <div style={{
              fontSize: 18, fontWeight: 700,
              fontFamily: "var(--font-dm-mono), monospace",
              color: "var(--text)", letterSpacing: -0.5,
            }}>
              {formatBRL(profile.salary)}
            </div>
          </div>
        </div>
      )}

      {/* User */}
      {profile && (
        <div style={{
          padding: "12px 14px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              style={{ width: 28, height: 28, borderRadius: "50%", border: "1.5px solid var(--border2)", flexShrink: 0 }}
              alt={firstName}
            />
          ) : (
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "linear-gradient(135deg, var(--purple), var(--blue))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 600, color: "#fff", flexShrink: 0,
            }}>
              {firstName[0]?.toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }}>
              {firstName}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {profile.email}
            </div>
          </div>
          <button
            onClick={logout}
            title="Sair"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text3)", padding: 4, borderRadius: 6,
              display: "flex", alignItems: "center", transition: "color 0.15s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--red)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text3)")}
          >
            <LogOut size={14} strokeWidth={1.8} />
          </button>
        </div>
      )}
    </aside>
  );
}
