"use client";
import {
  LineChart as RC, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatBRL } from "@/lib/utils";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  lines: { key: string; color: string; label: string }[];
  height?: number;
}

export function LineChartWidget({ data, lines, height = 200 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RC data={data}>
        <defs>
          {lines.map((l) => (
            <linearGradient key={l.key} id={`gradient-${l.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={l.color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={l.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
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
            fontSize: 12,
          }}
          cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }}
        />
        {lines.map((l) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            stroke={l.color}
            strokeWidth={2.5}
            dot={{ fill: l.color, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: l.color, stroke: "var(--bg)", strokeWidth: 2 }}
            name={l.label}
          />
        ))}
      </RC>
    </ResponsiveContainer>
  );
}
