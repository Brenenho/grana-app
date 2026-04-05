"use client";
import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { calcBuckets, bucketUsagePct, detectAlerts } from "@/lib/finance-logic";
import { formatBRL, formatDate } from "@/lib/utils";
import { BucketBadge } from "@/components/ui/Badge";
import { CAT_COLORS } from "@/types";
import { AlertTriangle, XCircle, ArrowRight, TrendingDown, TrendingUp } from "lucide-react";

// ── SVG Ring ────────────────────────────────────────────────────
function Ring({ pct, color, size = 68, stroke = 6 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const [filled, setFilled] = useState(0);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dashFilled = (filled / 100) * circ;

  useEffect(() => {
    const t = setTimeout(() => setFilled(Math.min(100, pct)), 120);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <svg width={size} height={size} style={{ flexShrink: 0, transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dashFilled} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1.1s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </svg>
  );
}

// ── Count-up number ────────────────────────────────────────────
function CountUp({ value, prefix = "", duration = 900 }: { value: number; prefix?: string; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    ref.current = 0;
    const start = Date.now();
    const step = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      ref.current = value * eased;
      setDisplay(Math.round(ref.current));
      if (progress < 1) requestAnimationFrame(step);
    };
    const frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  const formatted = display.toLocaleString("pt-BR", { minimumFractionDigits: 0 });
  return <>{prefix}{formatted}</>;
}

const BUCKET_ICONS = ["💳", "🛡", "💼", "🎯"];

const SAVINGS_BUCKETS = new Set(["reserva", "empreendedor"]);

export default function Dashboard() {
  const { profile, transactions, goals, categories } = useAppStore();
  const salary = profile?.salary ?? 0;

  const buckets = useMemo(() => calcBuckets(salary, transactions, categories), [salary, transactions, categories]);
  // Exclude livre bucket from alerts — free spending shouldn't trigger limit warnings
  const limits = useMemo(() => {
    const m: Record<string, number> = {};
    categories.filter(c => c.bucket !== "livre").forEach((c) => { m[c.name] = c.monthly_limit; });
    return m;
  }, [categories]);

  // Savings trackers for reserva/empreendedor
  const savingsThisMonth = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of transactions) {
      if (SAVINGS_BUCKETS.has(t.bucket) && t.type === "receita") {
        m[t.bucket] = (m[t.bucket] ?? 0) + Math.abs(t.amount);
      }
    }
    return m;
  }, [transactions]);

  const goalsByName = useMemo(() => {
    const m: Record<string, typeof goals[0]> = {};
    for (const g of goals) m[g.name] = g;
    return m;
  }, [goals]);

  const reservaGoal = goalsByName["Reserva de Emergência"];
  const empreendedorGoal = goalsByName["Caixa Empreendedor"];

  const alerts = useMemo(() => detectAlerts(transactions, limits), [transactions, limits]);

  const { totalGasto, totalReceita } = useMemo(() => ({
    totalGasto: transactions.filter(t => t.type === "despesa").reduce((s, t) => s + Math.abs(t.amount), 0),
    totalReceita: transactions.filter(t => t.type === "receita").reduce((s, t) => s + Math.abs(t.amount), 0),
  }), [transactions]);

  // saldo = soma dos remainders de todos os baldes — já considera fixo committed
  // como auto-debitado (calcBuckets usa max(txSpent, committed) para o balde fixo)
  const saldo = useMemo(() => buckets.reduce((s, b) => s + b.remaining, 0), [buckets]);
  const usedPct = salary > 0 ? Math.round(((salary - saldo) / salary) * 100) : 0;

  const h = new Date().getHours();
  const greeting = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const firstName = profile?.full_name?.split(" ")[0] ?? "";
  const month = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const statusColor = usedPct > 100 ? "var(--red)" : usedPct > 80 ? "var(--yellow)" : "var(--accent)";

  return (
    <div className="fade-up">

      {/* ── Hero ───────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 4 }}>
              {greeting}{firstName ? `, ${firstName}` : ""} · {month.charAt(0).toUpperCase() + month.slice(1)}
            </div>
            <div style={{
              fontSize: 13,
              color: "var(--text3)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <TrendingDown size={12} color="var(--red)" strokeWidth={2} />
              {formatBRL(totalGasto)} gastos
              {totalReceita > 0 && (
                <><span style={{ opacity: 0.3 }}>·</span>
                  <TrendingUp size={12} color="var(--accent)" strokeWidth={2} />
                  {formatBRL(totalReceita)} entradas</>
              )}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 2, letterSpacing: "0.4px", textTransform: "uppercase" }}>
              saldo disponível
            </div>
            <div style={{
              fontSize: 36,
              fontWeight: 700,
              fontFamily: "var(--font-dm-mono), monospace",
              letterSpacing: -1.5,
              color: saldo < 0 ? "var(--red)" : statusColor,
              animation: "numberReveal 0.5s cubic-bezier(0.16,1,0.3,1) both",
              lineHeight: 1,
            }}>
              {saldo < 0 ? "-" : ""}R$&nbsp;
              <CountUp value={Math.abs(saldo)} duration={900} />
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
              {usedPct}% do salário utilizado
            </div>
          </div>
        </div>

        {/* Multi-bucket allocation bar */}
        {salary > 0 && (
          <div>
            <div style={{ display: "flex", height: 5, borderRadius: 99, overflow: "hidden", gap: 2 }}>
              {buckets.map((b) => (
                <div
                  key={b.bucket}
                  style={{
                    width: `${b.pct * 100}%`,
                    background: b.color,
                    opacity: 0.7,
                    borderRadius: 99,
                  }}
                />
              ))}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              {buckets.map((b) => (
                <div key={b.bucket} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "var(--text3)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: 2, background: b.color, display: "inline-block", opacity: 0.8 }} />
                  {b.label} {Math.round(b.pct * 100)}%
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Alerts ────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 6 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{
              padding: "9px 14px", borderRadius: 10,
              display: "flex", alignItems: "center", gap: 9, fontSize: 12.5,
              background: a.type === "danger" ? "rgba(248,113,113,0.07)" : "rgba(250,204,21,0.07)",
              border: `1px solid ${a.type === "danger" ? "rgba(248,113,113,0.15)" : "rgba(250,204,21,0.15)"}`,
              color: a.type === "danger" ? "var(--red)" : "var(--yellow)",
            }}>
              {a.type === "danger"
                ? <XCircle size={13} strokeWidth={2} style={{ flexShrink: 0 }} />
                : <AlertTriangle size={13} strokeWidth={2} style={{ flexShrink: 0 }} />}
              {a.message}
            </div>
          ))}
        </div>
      )}

      {/* ── Projeção de sobra ─────────────────────────────── */}
      {salary > 0 && (() => {
        const fixoBucket = buckets.find(b => b.bucket === "fixo");
        const reservaBucket = buckets.find(b => b.bucket === "reserva");
        const empreendedorBucket = buckets.find(b => b.bucket === "empreendedor");
        const livreBucket = buckets.find(b => b.bucket === "livre");
        const fixoVal = fixoBucket?.total ?? 0;
        const reservaVal = reservaBucket?.total ?? 0;
        const empreendedorVal = empreendedorBucket?.total ?? 0;
        const livreVal = livreBucket?.total ?? 0;

        const rows: { label: string; value: number; color: string; sign: string; pct: number }[] = [
          { label: "Custos Fixos", value: fixoVal, color: "#3b82f6", sign: "−", pct: 50 },
          { label: "Reserva de Emergência", value: reservaVal, color: "#22c55e", sign: "−", pct: 10 },
          { label: "Caixa Empreendedor", value: empreendedorVal, color: "#a78bfa", sign: "−", pct: 15 },
        ];

        return (
          <div style={{
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: "20px 22px",
            marginBottom: 24,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 16 }}>
              O que sobra no mês
            </div>

            {/* Salário */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 500 }}>Salário</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", color: "var(--accent)", letterSpacing: -0.5 }}>
                {formatBRL(salary)}
              </span>
            </div>

            {/* Deduções */}
            {rows.map((row) => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 2, background: row.color, display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "var(--text3)" }}>{row.label}</span>
                  <span style={{ fontSize: 10, color: "var(--text3)", opacity: 0.5 }}>{row.pct}%</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-dm-mono), monospace", color: "var(--text3)", letterSpacing: -0.3 }}>
                  {row.sign} {formatBRL(row.value)}
                </span>
              </div>
            ))}

            {/* Divisor */}
            <div style={{ height: 1, background: "var(--border)", margin: "12px 0" }} />

            {/* Resultado */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: 2, background: "#f97316", display: "inline-block", flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Livre pra gastar</span>
                <span style={{ fontSize: 10, color: "var(--text3)", opacity: 0.5 }}>25%</span>
              </div>
              <span style={{
                fontSize: 20, fontWeight: 700,
                fontFamily: "var(--font-dm-mono), monospace",
                color: livreVal > 0 ? "#f97316" : "var(--red)",
                letterSpacing: -0.8,
              }}>
                {formatBRL(livreVal)}
              </span>
            </div>

            {/* Mini barra visual */}
            <div style={{ display: "flex", height: 4, borderRadius: 99, overflow: "hidden", gap: 2, marginTop: 14 }}>
              {rows.map((row) => (
                <div key={row.label} style={{ flex: row.pct, background: row.color, opacity: 0.6, borderRadius: 99 }} />
              ))}
              <div style={{ flex: 25, background: "#f97316", opacity: 0.6, borderRadius: 99 }} />
            </div>
          </div>
        );
      })()}

      {/* ── 4 Bucket cards ────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 24 }}>
        {buckets.map((b, i) => {
          const isSavings = SAVINGS_BUCKETS.has(b.bucket);
          const goal = b.bucket === "reserva" ? reservaGoal : b.bucket === "empreendedor" ? empreendedorGoal : undefined;
          const savedThisMonth = savingsThisMonth[b.bucket] ?? 0;
          const savedPct = b.total > 0 ? Math.min(100, Math.round((savedThisMonth / b.total) * 100)) : 0;
          const goalPct = goal && goal.target_amount > 0 ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100)) : 0;
          const didSave = savedThisMonth >= b.total;

          const spendPct = bucketUsagePct(b);
          const ringPct = isSavings ? savedPct : spendPct;
          const statusClr = isSavings
            ? (didSave ? b.color : savedThisMonth > 0 ? "var(--yellow)" : "var(--red)")
            : (spendPct > 100 ? "var(--red)" : spendPct > 80 ? "var(--yellow)" : b.color);
          const statusMsg = isSavings
            ? (didSave ? "GUARDOU" : savedThisMonth > 0 ? "PARCIAL" : "NÃO GUARDOU")
            : (spendPct > 100 ? "ESTOURADO" : spendPct > 80 ? "ATENÇÃO" : spendPct > 50 ? "EM USO" : "OK");
          const statusBg = isSavings
            ? (didSave ? "rgba(74,222,128,0.08)" : savedThisMonth > 0 ? "rgba(250,204,21,0.1)" : "rgba(248,113,113,0.1)")
            : (spendPct > 100 ? "rgba(248,113,113,0.1)" : spendPct > 80 ? "rgba(250,204,21,0.1)" : "rgba(74,222,128,0.08)");

          return (
            <div
              key={b.bucket}
              className={`fade-up stagger-${i + 1}`}
              style={{
                background: "var(--bg2)",
                border: `1px solid var(--border)`,
                borderRadius: 16,
                padding: "20px 22px",
                transition: "border-color 0.2s, box-shadow 0.2s",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${b.color}40`;
                e.currentTarget.style.boxShadow = `0 0 30px ${b.color}10`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Ambient glow */}
              <div style={{
                position: "absolute", top: -40, right: -40,
                width: 120, height: 120, borderRadius: "50%",
                background: `radial-gradient(circle, ${b.color}12 0%, transparent 70%)`,
                pointerEvents: "none",
              }} />

              <div style={{ display: "flex", gap: 16, alignItems: "flex-start", position: "relative" }}>
                {/* Ring */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <Ring pct={ringPct} color={statusClr} size={72} stroke={6} />
                  <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <div style={{ fontSize: 15, lineHeight: 1 }}>{BUCKET_ICONS[i]}</div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: statusClr, lineHeight: 1.2 }}>
                      {ringPct}%
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{b.label}</div>
                    <span style={{
                      fontSize: 9.5, fontWeight: 700, letterSpacing: "0.5px",
                      textTransform: "uppercase", color: statusClr,
                      background: statusBg, padding: "1px 6px", borderRadius: 4,
                    }}>{statusMsg}</span>
                  </div>

                  <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 10 }}>
                    {Math.round(b.pct * 100)}% do salário
                  </div>

                  {isSavings ? (
                    <div style={{ display: "flex", gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 1 }}>meta/mês</div>
                        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", color: b.color, letterSpacing: -0.5 }}>
                          {formatBRL(b.total)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 1 }}>guardado</div>
                        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", color: didSave ? b.color : savedThisMonth > 0 ? "var(--yellow)" : "var(--text3)", letterSpacing: -0.5 }}>
                          {formatBRL(savedThisMonth)}
                        </div>
                      </div>
                      {goal && (
                        <div>
                          <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 1 }}>reserva</div>
                          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", color: goalPct >= 100 ? "var(--accent)" : b.color, letterSpacing: -0.5 }}>
                            {goalPct}%
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 1 }}>orçado</div>
                        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", color: b.color, letterSpacing: -0.5 }}>
                          {formatBRL(b.total)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 1 }}>gasto</div>
                        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", color: spendPct > 100 ? "var(--red)" : "var(--text)", letterSpacing: -0.5 }}>
                          {formatBRL(b.spent)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 1 }}>livre</div>
                        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", color: b.remaining > 0 ? "var(--accent)" : "var(--red)", letterSpacing: -0.5 }}>
                          {formatBRL(b.remaining)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Recent transactions ───────────────────────────── */}
      <div style={{
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", letterSpacing: "0.4px", textTransform: "uppercase" }}>
            Últimas transações
          </div>
          <Link href="/transactions" style={{
            fontSize: 12, color: "var(--text3)", textDecoration: "none",
            display: "flex", alignItems: "center", gap: 4, transition: "color 0.15s",
          }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text3)")}
          >
            ver todas <ArrowRight size={12} strokeWidth={2} />
          </Link>
        </div>

        {transactions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text3)" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>📭</div>
            <div style={{ fontSize: 13, marginBottom: 6 }}>Nenhuma transação este mês</div>
            <Link href="/transactions" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>
              Adicionar primeira transação →
            </Link>
          </div>
        ) : (
          <div>
            {transactions.slice(0, 7).map((t, idx) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "11px 22px",
                  borderBottom: idx < 6 && idx < transactions.length - 1 ? "1px solid var(--border)" : "none",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.015)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {/* Color dot */}
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: CAT_COLORS[t.category] ?? "#888",
                  flexShrink: 0,
                }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.description}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1, display: "flex", gap: 8, alignItems: "center" }}>
                    {formatDate(t.date)}
                    <span style={{ opacity: 0.4 }}>·</span>
                    {t.category}
                  </div>
                </div>

                <BucketBadge bucket={t.bucket} />

                <div style={{
                  fontSize: 13, fontWeight: 700,
                  fontFamily: "var(--font-dm-mono), monospace",
                  color: t.type === "receita" ? "var(--accent)" : "var(--text)",
                  whiteSpace: "nowrap",
                  minWidth: 90,
                  textAlign: "right",
                }}>
                  {t.type === "receita" ? "+" : "-"}{formatBRL(Math.abs(t.amount))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
