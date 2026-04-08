"use client";
import { useEffect, useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { formatBRL, monthLabel, getLocalISOString } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LineChartWidget } from "@/components/charts/LineChartWidget";
import { CAT_COLORS } from "@/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { BarChart3 } from "lucide-react";

interface MonthData {
  month: string;
  total: number;
  byCategory: Record<string, number>;
}

export default function Reports() {
  const { profile } = useAppStore();
  const [history, setHistory] = useState<MonthData[]>([]);
  const [reservaHistory, setReservaHistory] = useState<{ month: string; reserva: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);

      const { data: txs } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", getLocalISOString(sixMonthsAgo))
        .order("date");

      if (!txs) { setLoading(false); return; }

      const grouped: Record<string, MonthData> = {};
      for (let i = 5; i >= 0; i--) {
        const key = monthLabel(-i);
        grouped[key] = { month: key, total: 0, byCategory: {} };
      }

      txs
        .filter((t) => t.type === "despesa")
        .forEach((t) => {
          const d = new Date(t.date + "T00:00:00");
          const key = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
          if (grouped[key]) {
            grouped[key].total += Math.abs(t.amount);
            grouped[key].byCategory[t.category] =
              (grouped[key].byCategory[t.category] ?? 0) + Math.abs(t.amount);
          }
        });

      setHistory(Object.values(grouped));

      const { data: goals } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id);
      const reserva = goals?.find((g) => g.name === "Reserva de Emergência");
      if (reserva) {
        const hist = [];
        for (let i = 5; i >= 0; i--) {
          hist.push({
            month: monthLabel(-i),
            reserva: Math.max(0, Math.round(reserva.current_amount - reserva.monthly_contribution * i)),
          });
        }
        setReservaHistory(hist);
      }
      setLoading(false);
    }
    load();
  }, []);

  const topCategories = useMemo(() => {
    const map: Record<string, number> = {};
    history.forEach((m) => {
      Object.entries(m.byCategory).forEach(([cat, v]) => {
        map[cat] = (map[cat] ?? 0) + v;
      });
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [history]);

  const stackedData = useMemo(() => {
    const cats = topCategories.map(([c]) => c);
    return history.map((m) => {
      const row: Record<string, number | string> = { month: m.month };
      cats.forEach((c) => { row[c] = Math.round(m.byCategory[c] ?? 0); });
      return row;
    });
  }, [history, topCategories]);

  const salary = profile?.salary ?? 0;

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ height: 28, width: 200 }} className="skeleton" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[0, 1].map((i) => (
            <div key={i} style={{ height: 260, borderRadius: 16 }} className="skeleton" />
          ))}
        </div>
        <div style={{ height: 320, borderRadius: 16 }} className="skeleton" />
      </div>
    );
  }

  const totalSpent6m = history.reduce((s, m) => s + m.total, 0);
  const avgMonthly = history.length > 0 ? Math.round(totalSpent6m / history.length) : 0;

  return (
    <div className="fade-up">
      <PageHeader
        title="Relatórios"
        subtitle="Últimos 6 meses — Housel: torne visível o que você não vê"
      />

      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
        <Card>
          <CardTitle>total 6 meses</CardTitle>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-dm-mono)" }}>
            {formatBRL(totalSpent6m)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>em despesas</div>
        </Card>
        <Card>
          <CardTitle>média mensal</CardTitle>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-dm-mono)" }}>
            {formatBRL(avgMonthly)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>por mês</div>
        </Card>
        <Card>
          <CardTitle>maior categoria</CardTitle>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-dm-mono)" }}>
            {topCategories[0]?.[0] ?? "—"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
            {topCategories[0] ? formatBRL(topCategories[0][1]) : ""}
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        <Card>
          <CardTitle style={{ marginBottom: 16 }}>gasto mensal total</CardTitle>
          <LineChartWidget
            data={history.map((m) => ({ month: m.month, gasto: Math.round(m.total) }))}
            lines={[{ key: "gasto", color: "#3b82f6", label: "Total gasto" }]}
            height={180}
          />
        </Card>
        <Card>
          <CardTitle style={{ marginBottom: 16 }}>crescimento da reserva</CardTitle>
          <LineChartWidget
            data={reservaHistory}
            lines={[{ key: "reserva", color: "#22c55e", label: "Reserva" }]}
            height={180}
          />
        </Card>
      </div>

      {/* Stacked bar */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <CardTitle style={{ marginBottom: 0 }}>comparativo por categoria (top 5)</CardTitle>
          <BarChart3 size={14} color="var(--text3)" strokeWidth={2} />
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={stackedData} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="month"
              tick={{ fill: "var(--text3)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--text3)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `R$${v}`}
            />
            <Tooltip
              formatter={(v: number, name: string) => [formatBRL(v), name]}
              contentStyle={{
                background: "var(--bg3)",
                border: "1px solid var(--border2)",
                borderRadius: 10,
                color: "var(--text)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              }}
            />
            {topCategories.map(([cat]) => (
              <Bar
                key={cat}
                dataKey={cat}
                stackId="a"
                fill={CAT_COLORS[cat] ?? "#888"}
                radius={cat === topCategories[topCategories.length - 1][0] ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 14 }}>
          {topCategories.map(([cat, total]) => (
            <span
              key={cat}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text2)" }}
            >
              <span
                style={{
                  width: 10, height: 10, borderRadius: 3,
                  background: CAT_COLORS[cat] ?? "#888",
                  display: "inline-block",
                }}
              />
              {cat} — {formatBRL(total)}
            </span>
          ))}
        </div>
      </Card>

      {/* Monthly summary table */}
      <Card>
        <CardTitle style={{ marginBottom: 16 }}>resumo mensal</CardTitle>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["mês", "gasto total", "maior categoria", "vs salário"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    fontSize: 10,
                    color: "var(--text3)",
                    fontFamily: "var(--font-dm-mono)",
                    textTransform: "uppercase",
                    letterSpacing: "0.6px",
                    paddingBottom: 12,
                    borderBottom: "1px solid var(--border)",
                    paddingRight: 16,
                    fontWeight: 500,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map((m) => {
              const top = Object.entries(m.byCategory).sort((a, b) => b[1] - a[1])[0];
              const pct = salary > 0 ? Math.round((m.total / salary) * 100) : 0;
              return (
                <tr
                  key={m.month}
                  style={{ transition: "background 0.1s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "12px 16px 12px 0", borderBottom: "1px solid var(--border)", fontWeight: 600, textTransform: "capitalize" }}>
                    {m.month}
                  </td>
                  <td style={{ padding: "12px 16px 12px 0", borderBottom: "1px solid var(--border)", fontFamily: "var(--font-dm-mono)", fontSize: 13 }}>
                    {formatBRL(m.total)}
                  </td>
                  <td style={{ padding: "12px 16px 12px 0", borderBottom: "1px solid var(--border)", fontSize: 12.5, color: "var(--text2)" }}>
                    {top ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: CAT_COLORS[top[0]] ?? "#888", display: "inline-block" }} />
                        {top[0]} — {formatBRL(top[1])}
                      </span>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                    <Badge variant={pct > 100 ? "red" : pct > 80 ? "yellow" : "green"}>
                      {pct}%
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
