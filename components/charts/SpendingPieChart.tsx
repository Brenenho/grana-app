"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Transaction, CAT_COLORS } from "@/types";
import { formatBRL } from "@/lib/utils";

export function SpendingPieChart({ transactions }: { transactions: Transaction[] }) {
  const map: Record<string, number> = {};
  transactions
    .filter((t) => t.type === "despesa")
    .forEach((t) => {
      map[t.category] = (map[t.category] ?? 0) + Math.abs(t.amount);
    });

  const data = Object.entries(map)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <div
        style={{
          height: 200,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text3)",
          gap: 8,
          fontSize: 13,
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.4 }}>📊</div>
        Nenhuma despesa este mês
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={82}
            dataKey="value"
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={CAT_COLORS[entry.name] ?? "#888"}
                opacity={0.9}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number) => [formatBRL(v), ""]}
            contentStyle={{
              background: "var(--bg3)",
              border: "1px solid var(--border2)",
              borderRadius: 10,
              color: "var(--text)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 6 }}>
        {data.map((d) => (
          <span
            key={d.name}
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text2)" }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: CAT_COLORS[d.name] ?? "#888",
                display: "inline-block",
              }}
            />
            {d.name}
            <span style={{ color: "var(--text3)", fontFamily: "var(--font-dm-mono)" }}>
              {total > 0 ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
