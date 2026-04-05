"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
} from "recharts";
import { BucketSummary } from "@/types";
import { formatBRL } from "@/lib/utils";

const BUCKET_LABELS: Record<string, string> = {
  fixo: "Fixos",
  reserva: "Reserva",
  empreendedor: "Empreend.",
  livre: "Livre",
};

export function BucketsBarChart({ buckets }: { buckets: BucketSummary[] }) {
  const data = buckets.map((b) => ({
    name: BUCKET_LABELS[b.bucket] ?? b.label.split(" ")[0],
    orçado: b.total,
    gasto: b.spent,
    color: b.color,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barGap={3} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="name"
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
            fontSize: 12,
          }}
        />
        <Bar dataKey="orçado" fill="rgba(255,255,255,0.06)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="gasto" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
