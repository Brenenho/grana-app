"use client";
import { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { calcBuckets, bucketUsagePct } from "@/lib/finance-logic";
import { formatBRL } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { FormErrorAlert } from "@/components/ui/FormErrorAlert";
import { Bucket, BUCKET_CONFIG } from "@/types";
import { Plus, Trash2, Edit2, Pencil, AlertCircle, CheckCircle2 } from "lucide-react";

const CAT_ICONS = ["🏠","💡","💧","📱","📺","🛒","🚗","🚌","💊","🏋️","📚","🎓","🎮","🍔","☕","✈️","👕","💈","🐾","💰","🔧","💻","🎵","🎬","🏦","📦","🌐","💅","🧹","🧾"];
const CAT_COLORS = ["#3b82f6","#22c55e","#a78bfa","#f97316","#eab308","#06b6d4","#ec4899","#14b8a6","#f43f5e","#84cc16","#8b5cf6","#fb923c"];

const BUCKET_LABELS: Record<Bucket, string> = {
  fixo: "Custos Fixos",
  reserva: "Reserva de Emergência",
  empreendedor: "Caixa Empreendedor",
  livre: "Gastos Livres",
};

const INIT_CAT = {
  name: "",
  monthly_limit: "",
  bucket: "fixo" as Bucket,
  icon: "🏠",
  color: "#3b82f6",
};

export default function Budget() {
  const { profile, transactions, goals, categories, addCategory, updateCategory, deleteCategory, updateProfile } = useAppStore();
  const salary = profile?.salary ?? 0;
  const buckets = useMemo(() => calcBuckets(salary, transactions, categories), [salary, transactions, categories]);

  // Salary modal
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [newSalary, setNewSalary] = useState("");
  const [salarySaving, setSalarySaving] = useState(false);
  const [salaryStatus, setSalaryStatus] = useState<"idle" | "ok" | "error">("idle");
  const [salaryError, setSalaryError] = useState("");

  function openSalaryModal() {
    setNewSalary(String(profile?.salary ?? ""));
    setSalaryStatus("idle");
    setSalaryError("");
    setSalaryOpen(true);
  }

  async function saveSalary() {
    const val = parseFloat(newSalary.replace(",", "."));
    if (isNaN(val) || val <= 0) return;
    setSalarySaving(true);
    setSalaryStatus("idle");
    setSalaryError("");
    try {
      const supabase = createClient();
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) { setSalaryError("Sessão expirada."); setSalaryStatus("error"); return; }
      const { error } = await supabase.from("profiles").upsert(
        { id: user.id, salary: val, email: user.email,
          full_name: profile?.full_name ?? null, avatar_url: profile?.avatar_url ?? null },
        { onConflict: "id" }
      );
      if (error) { setSalaryError(`Erro: ${error.message}`); setSalaryStatus("error"); }
      else { updateProfile({ salary: val }); setSalaryStatus("ok"); setTimeout(() => { setSalaryStatus("idle"); setSalaryOpen(false); }, 900); }
    } catch (err: unknown) {
      setSalaryError(`Erro: ${err instanceof Error ? err.message : String(err)}`);
      setSalaryStatus("error");
    } finally { setSalarySaving(false); }
  }

  // Category modal
  const [catModal, setCatModal] = useState<"add" | "edit" | null>(null);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [catForm, setCatForm] = useState(INIT_CAT);
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState("");
  const [deletingCat, setDeletingCat] = useState<string | null>(null);

  function openAddCat(bucket?: Bucket) {
    setCatForm({ ...INIT_CAT, bucket: bucket ?? "fixo" });
    setCatError("");
    setEditingCat(null);
    setCatModal("add");
  }

  function openEditCat(id: string) {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    setCatForm({
      name: cat.name,
      monthly_limit: String(cat.monthly_limit),
      bucket: cat.bucket,
      icon: cat.icon,
      color: cat.color,
    });
    setCatError("");
    setEditingCat(id);
    setCatModal("edit");
  }

  async function handleSaveCat() {
    if (!catForm.name.trim() || !catForm.monthly_limit) {
      setCatError("Nome e limite mensal são obrigatórios.");
      return;
    }
    const limit = parseFloat(catForm.monthly_limit);
    if (isNaN(limit) || limit <= 0) {
      setCatError("Limite deve ser maior que zero.");
      return;
    }
    setCatLoading(true);
    setCatError("");
    try {
      const supabase = createClient();
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) { setCatError("Sessão expirada."); return; }

      if (catModal === "add") {
        const { data, error } = await supabase
          .from("budget_categories")
          .insert({
            user_id: user.id,
            name: catForm.name.trim(),
            monthly_limit: limit,
            bucket: catForm.bucket,
            icon: catForm.icon,
            color: catForm.color,
          })
          .select()
          .single();
        if (error) { setCatError(`Erro: ${error.message}`); return; }
        if (data) addCategory(data);
      } else if (catModal === "edit" && editingCat) {
        const { error } = await supabase
          .from("budget_categories")
          .update({
            name: catForm.name.trim(),
            monthly_limit: limit,
            bucket: catForm.bucket,
            icon: catForm.icon,
            color: catForm.color,
          })
          .eq("id", editingCat);
        if (error) { setCatError(`Erro: ${error.message}`); return; }
        updateCategory(editingCat, {
          name: catForm.name.trim(),
          monthly_limit: limit,
          bucket: catForm.bucket,
          icon: catForm.icon,
          color: catForm.color,
        });
      }
      setCatModal(null);
    } catch (err: unknown) {
      setCatError(`Erro: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setCatLoading(false);
    }
  }

  async function handleDeleteCat(id: string) {
    setDeletingCat(id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("budget_categories").delete().eq("id", id);
      if (!error) deleteCategory(id);
      else console.error("[deleteCategory]", error);
    } finally {
      setDeletingCat(null);
    }
  }

  // Total committed across all categories
  const totalCommitted = useMemo(
    () => categories.reduce((s, c) => s + c.monthly_limit, 0),
    [categories]
  );

  // Spending per category from transactions
  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type === "despesa") {
        map[t.category] = (map[t.category] ?? 0) + Math.abs(t.amount);
      }
    }
    return map;
  }, [transactions]);

  // Total transaction spending
  const totalTxSpent = useMemo(
    () => transactions.filter((t) => t.type === "despesa").reduce((s, t) => s + Math.abs(t.amount), 0),
    [transactions]
  );

  // Group categories by bucket
  const catsByBucket = useMemo(() => {
    const map: Record<Bucket, typeof categories> = { fixo: [], reserva: [], empreendedor: [], livre: [] };
    for (const c of categories) map[c.bucket].push(c);
    return map;
  }, [categories]);

  // Transactions by bucket (for livre detail)
  const txByBucket = useMemo(() => {
    const map: Record<string, typeof transactions> = {};
    for (const t of transactions) {
      if (!map[t.bucket]) map[t.bucket] = [];
      map[t.bucket].push(t);
    }
    return map;
  }, [transactions]);

  // Spending by category within livre bucket
  const livreCatSpend = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of transactions) {
      if (t.bucket === "livre" && t.type === "despesa") {
        map[t.category] = (map[t.category] ?? 0) + Math.abs(t.amount);
      }
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  // Reserva & empreendedor goals
  const reservaGoal = goals.find(g => g.name === "Reserva de Emergência");
  const empreendedorGoal = goals.find(g => g.name === "Caixa Empreendedor");

  // Day of month progress (how far through the month are we)
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayProgress = Math.round((today.getDate() / daysInMonth) * 100);

  const parsedLimit = parseFloat(catForm.monthly_limit) || 0;

  return (
    <div className="fade-up">
      {/* Page header */}
      <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.4, color: "var(--text)", marginBottom: 3 }}>
            Orçamento
          </h1>
          <p style={{ fontSize: 12.5, color: "var(--text3)" }}>
            Distribua o salário antes de gastar, categoria a categoria
          </p>
        </div>
        <Button onClick={openSalaryModal}>
          <Pencil size={13} strokeWidth={2} /> Editar salário
        </Button>
      </div>

      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Salário", value: formatBRL(salary), sub: "base mensal", color: "var(--text)" },
          { label: "Comprometido", value: formatBRL(totalCommitted), sub: `${categories.length} categorias fixas`, color: "var(--blue)" },
          { label: "Gasto real", value: formatBRL(totalTxSpent), sub: `${transactions.filter(t => t.type === "despesa").length} transações`, color: "var(--orange)" },
          {
            label: "Disponível",
            value: formatBRL(Math.max(0, salary - Math.max(totalCommitted, totalTxSpent))),
            sub: salary > 0 ? `${Math.max(0, 100 - Math.round((Math.max(totalCommitted, totalTxSpent) / salary) * 100))}% do salário` : "—",
            color: salary - Math.max(totalCommitted, totalTxSpent) < 0 ? "var(--red)" : "var(--accent)",
          },
        ].map(({ label, value, sub, color }) => (
          <Card key={label}>
            <div style={{ fontSize: 10.5, color: "var(--text3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px", fontWeight: 600 }}>
              {label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", letterSpacing: -0.8, color, lineHeight: 1.2 }}>
              {value}
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>{sub}</div>
          </Card>
        ))}
      </div>

      {/* ── CUSTOS FIXOS ─────────────────────────────── */}
      {(() => {
        const b = buckets.find(x => x.bucket === "fixo")!;
        const cfg = BUCKET_CONFIG.fixo;
        const committed = b.committed ?? 0;
        const commitPct = b.total > 0 ? Math.min(100, Math.round((committed / b.total) * 100)) : 0;
        const statusColor = commitPct > 100 ? "var(--red)" : commitPct > 85 ? "var(--yellow)" : cfg.color;
        const cats = catsByBucket.fixo;
        return (
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ padding: "18px 22px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: cfg.color }} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{cfg.label}</span>
                  <span style={{ fontSize: 11, color: "var(--text3)" }}>{Math.round(cfg.pct * 100)}% · {formatBRL(b.total)}/mês</span>
                </div>
                <Button size="sm" variant="primary" onClick={() => openAddCat("fixo")}>
                  <Plus size={12} strokeWidth={2.5} /> Adicionar custo
                </Button>
              </div>

              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
                {[
                  { label: "Orçado", value: formatBRL(b.total), color: cfg.color },
                  { label: "Comprometido", value: formatBRL(committed), color: committed > b.total ? "var(--red)" : "var(--blue)" },
                  { label: "Sobra do balde", value: formatBRL(Math.max(0, b.total - committed)), color: b.total - committed < 0 ? "var(--red)" : "var(--accent)" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: "var(--bg2)", padding: "10px 14px" }}>
                    <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", color, letterSpacing: -0.4 }}>{value}</div>
                  </div>
                ))}
              </div>

              <ProgressBar pct={commitPct} color={statusColor} height={4} />
              <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 4 }}>
                {committed === 0 ? "Adicione seus custos fixos — eles contam automaticamente sem precisar lançar transação" : `${commitPct}% do balde comprometido automaticamente todo mês`}
              </div>
            </div>

            {cats.length > 0 && (
              <div style={{ borderTop: "1px solid var(--border)" }}>
                {cats.map((cat, idx) => (
                  <div key={cat.id} style={{
                    padding: "11px 22px", display: "flex", alignItems: "center", gap: 12,
                    borderTop: idx > 0 ? "1px solid var(--border)" : "none",
                    transition: "background 0.1s",
                  }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.015)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ fontSize: 18, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", background: `${cat.color}14`, borderRadius: 8, flexShrink: 0 }}>{cat.icon}</span>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{cat.name}</div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: cfg.color, background: `${cfg.color}14`, border: `1px solid ${cfg.color}30`, padding: "1px 6px", borderRadius: 4, letterSpacing: "0.5px", textTransform: "uppercase" }}>FIXO</span>
                    <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", color: cfg.color, minWidth: 90, textAlign: "right" }}>{formatBRL(cat.monthly_limit)}<div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 400 }}>/ mês</div></div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Button size="sm" onClick={() => openEditCat(cat.id)}><Edit2 size={11} strokeWidth={2} /></Button>
                      <Button size="sm" variant="danger" disabled={deletingCat === cat.id} onClick={() => handleDeleteCat(cat.id)}><Trash2 size={11} strokeWidth={2} /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── RESERVA + EMPREENDEDOR lado a lado ────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        {(["reserva", "empreendedor"] as Bucket[]).map(bucketKey => {
          const b = buckets.find(x => x.bucket === bucketKey)!;
          const cfg = BUCKET_CONFIG[bucketKey];
          const goal = bucketKey === "reserva" ? reservaGoal : empreendedorGoal;
          const goalPct = goal && goal.target_amount > 0 ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100)) : 0;
          const monthsLeft = goal && goal.monthly_contribution > 0 && goal.target_amount > (goal.current_amount ?? 0)
            ? Math.ceil((goal.target_amount - (goal.current_amount ?? 0)) / goal.monthly_contribution)
            : 0;
          const savedThisMonth = transactions
            .filter(t => t.bucket === bucketKey && t.type === "receita")
            .reduce((s, t) => s + Math.abs(t.amount), 0);
          const targetMonthly = b.total;
          const savedPct = targetMonthly > 0 ? Math.min(100, Math.round((savedThisMonth / targetMonthly) * 100)) : 0;
          const didSave = savedThisMonth >= targetMonthly;

          return (
            <div key={bucketKey} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px", position: "relative", overflow: "hidden" }}>
              {/* Glow */}
              <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: `radial-gradient(circle, ${cfg.color}15 0%, transparent 70%)`, pointerEvents: "none" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <div style={{ width: 7, height: 7, borderRadius: 2, background: cfg.color }} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{cfg.label}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>{Math.round(cfg.pct * 100)}% do salário · meta: {formatBRL(targetMonthly)}/mês</div>
                </div>
                {/* Saved badge */}
                <div style={{
                  padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: didSave ? "rgba(74,222,128,0.12)" : savedThisMonth > 0 ? "rgba(250,204,21,0.1)" : "rgba(248,113,113,0.08)",
                  color: didSave ? "var(--accent)" : savedThisMonth > 0 ? "var(--yellow)" : "var(--red)",
                  border: `1px solid ${didSave ? "rgba(74,222,128,0.2)" : savedThisMonth > 0 ? "rgba(250,204,21,0.2)" : "rgba(248,113,113,0.15)"}`,
                }}>
                  {didSave ? "✓ Guardou" : savedThisMonth > 0 ? "Parcial" : "Não guardou"}
                </div>
              </div>

              {/* Meta total (from goals) */}
              {goal && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text3)", marginBottom: 6 }}>
                    <span>Reserva acumulada</span>
                    <span style={{ fontFamily: "var(--font-dm-mono), monospace" }}>{formatBRL(goal.current_amount)} / {formatBRL(goal.target_amount)}</span>
                  </div>
                  <div style={{ height: 8, background: "rgba(255,255,255,0.04)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${goalPct}%`,
                      background: cfg.color,
                      borderRadius: 99,
                      transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text3)", marginTop: 4 }}>
                    <span style={{ color: cfg.color, fontWeight: 600 }}>{goalPct}% da meta</span>
                    {monthsLeft > 0 && <span>{monthsLeft} {monthsLeft === 1 ? "mês" : "meses"} para concluir</span>}
                    {goalPct >= 100 && <span style={{ color: "var(--accent)" }}>✓ Meta atingida!</span>}
                  </div>
                </div>
              )}

              {/* Este mês */}
              <div style={{ background: "var(--bg3)", borderRadius: 10, padding: "12px 14px", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginBottom: 8 }}>Este mês</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", color: savedThisMonth > 0 ? cfg.color : "var(--text3)" }}>
                      {formatBRL(savedThisMonth)}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text3)" }}>guardado de {formatBRL(targetMonthly)}</div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: didSave ? cfg.color : savedThisMonth > 0 ? "var(--yellow)" : "var(--text3)" }}>
                    {savedPct}%
                  </div>
                </div>
                <ProgressBar pct={savedPct} color={didSave ? cfg.color : savedThisMonth > 0 ? "#facc15" : "var(--text3)"} height={3} />
                <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 6 }}>
                  {didSave ? "✓ Meta mensal atingida!" : savedThisMonth === 0 ? "Lance uma transação tipo Receita no balde para registrar que guardou" : `Faltam ${formatBRL(targetMonthly - savedThisMonth)} para bater a meta`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── GASTOS LIVRES ─────────────────────────────── */}
      {(() => {
        const b = buckets.find(x => x.bucket === "livre")!;
        const cfg = BUCKET_CONFIG.livre;
        const spent = b.spent;
        const pct = b.total > 0 ? Math.min(100, Math.round((spent / b.total) * 100)) : 0;
        const remaining = Math.max(0, b.total - spent);
        const statusColor = pct > 100 ? "var(--red)" : pct > 85 ? "var(--yellow)" : cfg.color;
        const livreTransactions = (txByBucket["livre"] ?? []).filter(t => t.type === "despesa").slice(0, 8);
        const velocityOk = dayProgress > 0 && pct <= dayProgress; // spending slower than days passed

        return (
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "18px 22px 16px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: cfg.color }} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{cfg.label}</span>
                    <span style={{ fontSize: 11, color: "var(--text3)" }}>{Math.round(cfg.pct * 100)}% do salário</span>
                    {/* Velocity indicator */}
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 4,
                      background: velocityOk ? "rgba(74,222,128,0.1)" : "rgba(251,146,60,0.1)",
                      color: velocityOk ? "var(--accent)" : "var(--orange)",
                      border: `1px solid ${velocityOk ? "rgba(74,222,128,0.2)" : "rgba(251,146,60,0.2)"}`,
                    }}>
                      {velocityOk ? "ritmo ok" : "ritmo alto"}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>Dia {today.getDate()} de {daysInMonth} — {dayProgress}% do mês passou</div>
                </div>
              </div>

              {/* Main metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
                {[
                  { label: "Disponível no mês", value: formatBRL(b.total), color: cfg.color },
                  { label: "Já gastou", value: formatBRL(spent), color: pct > 85 ? "var(--red)" : "var(--orange)" },
                  { label: "Ainda tem", value: formatBRL(remaining), color: remaining === 0 ? "var(--red)" : "var(--accent)" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: "var(--bg2)", padding: "10px 14px" }}>
                    <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", color, letterSpacing: -0.5 }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Progress: spending vs days elapsed */}
              <div style={{ position: "relative", marginBottom: 4 }}>
                <ProgressBar pct={pct} color={statusColor} height={6} />
                {/* Day marker */}
                <div style={{
                  position: "absolute", top: 0, bottom: 0,
                  left: `${dayProgress}%`,
                  width: 2, background: "rgba(255,255,255,0.3)",
                  borderRadius: 99,
                  transition: "left 0.3s",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text3)" }}>
                <span style={{ color: statusColor }}>{pct}% gasto</span>
                <span>▲ dia {today.getDate()} ({dayProgress}% do mês)</span>
              </div>
            </div>

            {/* Category breakdown */}
            {livreCatSpend.length > 0 && (
              <div style={{ padding: "14px 22px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.6px", fontWeight: 600, marginBottom: 10 }}>por categoria</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {livreCatSpend.slice(0, 5).map(([cat, amount]) => {
                    const catPct = b.total > 0 ? Math.min(100, Math.round((amount / b.total) * 100)) : 0;
                    return (
                      <div key={cat} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: cfg.color, flexShrink: 0, opacity: 0.7 }} />
                        <div style={{ fontSize: 12, color: "var(--text2)", flex: 1 }}>{cat}</div>
                        <div style={{ flex: 2, height: 4, background: "rgba(255,255,255,0.04)", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${catPct}%`, background: cfg.color, borderRadius: 99, opacity: 0.7 }} />
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--font-dm-mono), monospace", minWidth: 80, textAlign: "right", color: "var(--text2)" }}>
                          {formatBRL(amount)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent transactions in livre */}
            {livreTransactions.length > 0 && (
              <div>
                <div style={{ padding: "12px 22px 0", fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.6px", fontWeight: 600 }}>
                  últimas transações
                </div>
                {livreTransactions.map((t, i) => (
                  <div key={t.id} style={{
                    padding: "10px 22px", display: "flex", alignItems: "center", gap: 12,
                    borderTop: i > 0 ? "1px solid var(--border)" : "none",
                    transition: "background 0.1s",
                  }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.015)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-dm-mono), monospace", whiteSpace: "nowrap", minWidth: 60 }}>
                      {new Date(t.date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </div>
                    <div style={{ flex: 1, fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.description}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>{t.category}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", color: "var(--text)", whiteSpace: "nowrap" }}>
                      -{formatBRL(Math.abs(t.amount))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {livreTransactions.length === 0 && (
              <div style={{ padding: "24px 22px", textAlign: "center", color: "var(--text3)", fontSize: 12 }}>
                Nenhuma despesa neste balde ainda — adicione transações para rastrear seus gastos livres
              </div>
            )}
          </div>
        );
      })()}

      {/* Category add/edit modal */}
      <Modal
        open={catModal !== null}
        onClose={() => setCatModal(null)}
        title={catModal === "add" ? "Nova categoria" : "Editar categoria"}
      >
        {/* Fixo hint */}
        {catForm.bucket === "fixo" && (
          <div style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(59,130,246,0.07)",
            border: "1px solid rgba(59,130,246,0.2)",
            fontSize: 12,
            color: "#60a5fa",
          }}>
            Este custo será contado automaticamente todo mês — sem precisar lançar transação.
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label>Nome da categoria *</label>
          <input
            placeholder="Ex: Aluguel, Internet, Mercado"
            value={catForm.name}
            onChange={(e) => { setCatForm((f) => ({ ...f, name: e.target.value })); setCatError(""); }}
            autoFocus
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label>Limite mensal (R$) *</label>
            <input
              type="number"
              placeholder="0"
              value={catForm.monthly_limit}
              onChange={(e) => { setCatForm((f) => ({ ...f, monthly_limit: e.target.value })); setCatError(""); }}
              min="0.01"
              step="10"
            />
          </div>
          <div>
            <label>Balde</label>
            <select
              value={catForm.bucket}
              onChange={(e) => setCatForm((f) => ({ ...f, bucket: e.target.value as Bucket }))}
            >
              {(Object.entries(BUCKET_LABELS) as [Bucket, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Ícone</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {CAT_ICONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setCatForm((f) => ({ ...f, icon: ic }))}
                style={{
                  width: 36, height: 36, borderRadius: 8, fontSize: 18,
                  border: catForm.icon === ic ? "2px solid var(--accent)" : "2px solid var(--border)",
                  background: catForm.icon === ic ? "var(--accent-dim)" : "var(--bg3)",
                  cursor: "pointer", transition: "all 0.15s",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Cor</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            {CAT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setCatForm((f) => ({ ...f, color: c }))}
                style={{
                  width: 28, height: 28, borderRadius: "50%", background: c,
                  border: catForm.color === c ? "3px solid rgba(255,255,255,0.8)" : "3px solid transparent",
                  cursor: "pointer", outline: "none", transition: "all 0.15s",
                  transform: catForm.color === c ? "scale(1.2)" : "scale(1)",
                  boxShadow: catForm.color === c ? `0 0 10px ${c}60` : "none",
                }}
              />
            ))}
          </div>
        </div>

        {/* Preview */}
        {catForm.name && parsedLimit > 0 && (
          <div style={{
            marginBottom: 16, padding: "10px 14px", borderRadius: 10,
            background: "var(--bg4)", border: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 10, fontSize: 13,
          }}>
            <span style={{
              fontSize: 20, width: 34, height: 34, display: "flex",
              alignItems: "center", justifyContent: "center",
              background: `${catForm.color}18`, borderRadius: 8,
            }}>{catForm.icon}</span>
            <div>
              <span style={{ fontWeight: 600 }}>{catForm.name}</span>
              <span style={{ color: "var(--text3)", marginLeft: 8 }}>
                {formatBRL(parsedLimit)} / mês
              </span>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                {BUCKET_LABELS[catForm.bucket]}
              </div>
            </div>
          </div>
        )}

        <FormErrorAlert message={catError} />

        <div style={{ display: "flex", gap: 10 }}>
          <Button
            variant="primary"
            onClick={handleSaveCat}
            disabled={catLoading}
            style={{ flex: 1, justifyContent: "center" }}
          >
            {catLoading ? "Salvando..." : catModal === "add" ? "Criar categoria" : "Salvar alterações"}
          </Button>
          <Button onClick={() => setCatModal(null)}>Cancelar</Button>
        </div>
      </Modal>

      {/* Salary modal */}
      <Modal open={salaryOpen} onClose={() => setSalaryOpen(false)} title="Salário mensal">
        <div style={{ marginBottom: 16 }}>
          <label>Salário mensal (R$)</label>
          <input
            type="number"
            value={newSalary}
            onChange={(e) => { setNewSalary(e.target.value); setSalaryStatus("idle"); setSalaryError(""); }}
            onKeyDown={(e) => e.key === "Enter" && !salarySaving && saveSalary()}
            placeholder={String(profile?.salary ?? "4000")}
            autoFocus
            min="1"
            step="100"
          />
        </div>

        {newSalary && parseFloat(newSalary) > 0 && (
          <div style={{ marginBottom: 16, padding: "12px 14px", background: "var(--bg4)", borderRadius: 10, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>distribuição automática</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { label: "Custos Fixos 50%", color: "#60a5fa", pct: 0.5 },
                { label: "Reserva 10%", color: "#4ade80", pct: 0.1 },
                { label: "Empreendedor 15%", color: "#a78bfa", pct: 0.15 },
                { label: "Gastos Livres 25%", color: "#fb923c", pct: 0.25 },
              ].map((b) => (
                <div key={b.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "var(--text2)" }}>{b.label}</span>
                  <span style={{ fontFamily: "var(--font-dm-mono), monospace", color: b.color }}>
                    {formatBRL(parseFloat(newSalary) * b.pct)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {salaryStatus === "error" && (
          <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--red)" }}>
            <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
            {salaryError}
          </div>
        )}
        {salaryStatus === "ok" && (
          <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--accent)" }}>
            <CheckCircle2 size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
            Salário atualizado!
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="primary" onClick={saveSalary} disabled={salarySaving || !newSalary || parseFloat(newSalary) <= 0} style={{ flex: 1, justifyContent: "center" }}>
            {salarySaving ? "Salvando..." : "Salvar"}
          </Button>
          <Button onClick={() => setSalaryOpen(false)}>Cancelar</Button>
        </div>
      </Modal>
    </div>
  );
}
