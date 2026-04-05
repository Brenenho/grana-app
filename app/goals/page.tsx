"use client";
import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { projectGoals } from "@/lib/finance-logic";
import { formatBRL, formatDate } from "@/lib/utils";
import type { Transaction } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LineChartWidget } from "@/components/charts/LineChartWidget";
import { FormErrorAlert } from "@/components/ui/FormErrorAlert";
import { syncGoalForBucket, GOAL_BUCKET_MAP } from "@/lib/goal-sync";
import { Plus, Target, Lock, Trash2, PlusCircle, CheckCircle2, Edit2 } from "lucide-react";

const FG = { marginBottom: 16 } as const;
const COLORS = ["#22c55e", "#3b82f6", "#a78bfa", "#f97316", "#eab308", "#06b6d4", "#ec4899"];

export default function Goals() {
  const { goals, transactions, addGoal, deleteGoal, updateGoal, addTransaction, updateTransaction, deleteTransaction } = useAppStore();
  const [open, setOpen] = useState(false);
  const [aportOpen, setAportOpen] = useState<string | null>(null);
  const [aporte, setAporte] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [aportError, setAportError] = useState("");

  // Edit aporte transaction
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [editTxForm, setEditTxForm] = useState({ description: "", amount: "" });
  const [editTxLoading, setEditTxLoading] = useState(false);
  const [editTxError, setEditTxError] = useState("");
  const [deletingTx, setDeletingTx] = useState<string | null>(null);

  // Adjust balance for custom (non-mapped) goals
  const [adjustGoalId, setAdjustGoalId] = useState<string | null>(null);
  const [adjustValue, setAdjustValue] = useState("");
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustError, setAdjustError] = useState("");
  const [form, setForm] = useState({
    name: "", subtitle: "", target_amount: "", monthly_contribution: "", color: "#22c55e",
  });

  const reserva = goals.find((g) => g.name === "Reserva de Emergência");
  const caixa   = goals.find((g) => g.name === "Caixa Empreendedor");

  const projection = useMemo(
    () =>
      projectGoals(
        reserva?.current_amount ?? 0,
        reserva?.target_amount ?? 12000,
        reserva?.monthly_contribution ?? 400,
        caixa?.current_amount ?? 0,
        caixa?.target_amount ?? 6000,
        caixa?.monthly_contribution ?? 600,
      ),
    [reserva, caixa]
  );

  async function handleAdd() {
    if (!form.name.trim() || !form.target_amount) {
      setFormError("Nome e valor alvo são obrigatórios.");
      return;
    }
    const target = parseFloat(form.target_amount);
    if (isNaN(target) || target <= 0) {
      setFormError("Valor alvo deve ser maior que zero.");
      return;
    }

    setLoading(true);
    setFormError("");
    try {
      const supabase = createClient();
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) { setFormError("Sessão expirada."); setLoading(false); return; }

      const { data, error } = await supabase
        .from("goals")
        .insert({
          user_id: user.id,
          name: form.name.trim(),
          subtitle: form.subtitle.trim() || null,
          target_amount: target,
          current_amount: 0,
          monthly_contribution: parseFloat(form.monthly_contribution) || 0,
          color: form.color,
          is_system: false,
        })
        .select()
        .single();

      if (error) {
        console.error("[addGoal]", error);
        setFormError(`Erro: ${error.message}`);
      } else if (data) {
        addGoal(data);
        setOpen(false);
        setForm({ name: "", subtitle: "", target_amount: "", monthly_contribution: "", color: "#22c55e" });
      }
    } catch (err: unknown) {
      setFormError(`Erro inesperado: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  function openEditTx(tx: Transaction) {
    setEditTx(tx);
    setEditTxForm({ description: tx.description, amount: String(Math.abs(tx.amount)) });
    setEditTxError("");
  }

  async function handleEditTx() {
    if (!editTx) return;
    const newVal = parseFloat(editTxForm.amount);
    if (isNaN(newVal) || newVal <= 0) { setEditTxError("Valor deve ser maior que zero."); return; }
    setEditTxLoading(true);
    setEditTxError("");
    try {
      const supabase = createClient();
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) { setEditTxError("Sessão expirada."); return; }
      const newAmount = -Math.abs(newVal); // despesa
      const { data, error } = await supabase
        .from("transactions")
        .update({ description: editTxForm.description.trim(), amount: newAmount })
        .eq("id", editTx.id).eq("user_id", user.id)
        .select().single();
      if (error) { setEditTxError(`Erro: ${error.message}`); return; }
      updateTransaction(editTx.id, data);
      const delta = newVal - Math.abs(editTx.amount);
      if (delta !== 0) await syncGoalForBucket(editTx.bucket, delta, goals, updateGoal);
      setEditTx(null);
    } catch (err: unknown) {
      setEditTxError(`Erro inesperado: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setEditTxLoading(false);
    }
  }

  async function handleDeleteTx(tx: Transaction) {
    setDeletingTx(tx.id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("transactions").delete().eq("id", tx.id);
      if (error) { console.error("[deleteTx]", error); return; }
      deleteTransaction(tx.id);
      await syncGoalForBucket(tx.bucket, -Math.abs(tx.amount), goals, updateGoal);
    } finally {
      setDeletingTx(null);
    }
  }

  async function handleAdjustBalance() {
    const goal = goals.find(g => g.id === adjustGoalId);
    if (!goal) return;
    const newVal = parseFloat(adjustValue);
    if (isNaN(newVal) || newVal < 0) { setAdjustError("Informe um valor válido."); return; }
    setAdjustLoading(true);
    setAdjustError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("goals")
        .update({ current_amount: newVal, updated_at: new Date().toISOString() })
        .eq("id", goal.id);
      if (error) { setAdjustError(`Erro: ${error.message}`); return; }
      updateGoal(goal.id, { current_amount: newVal });
      setAdjustGoalId(null);
    } catch (err: unknown) {
      setAdjustError(`Erro inesperado: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setAdjustLoading(false);
    }
  }

  async function handleAporte(goalId: string) {
    const val = parseFloat(aporte);
    if (isNaN(val) || val <= 0) {
      setAportError("Informe um valor válido maior que zero.");
      return;
    }
    setLoading(true);
    setAportError("");
    try {
      const supabase = createClient();
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) { setAportError("Sessão expirada."); setLoading(false); return; }

      const goal = goals.find((g) => g.id === goalId)!;
      const bucket = GOAL_BUCKET_MAP[goal.name];

      if (bucket) {
        // Mapped goal: create a transaction — syncGoalForBucket handles current_amount
        const today = new Date().toISOString().slice(0, 10);
        const { data: txData, error: txError } = await supabase
          .from("transactions")
          .insert({ user_id: user.id, description: `Aporte · ${goal.name}`,
            amount: val, category: "Poupança", bucket, type: "despesa", date: today })
          .select().single();
        if (txError) { setAportError(`Erro: ${txError.message}`); return; }
        addTransaction(txData);
        await syncGoalForBucket(bucket, val, goals, updateGoal);
      } else {
        // Custom goal: no bucket mapping, just update current_amount directly
        const newAmount = goal.current_amount + val;
        const { error } = await supabase
          .from("goals")
          .update({ current_amount: newAmount, updated_at: new Date().toISOString() })
          .eq("id", goalId);
        if (error) { setAportError(`Erro: ${error.message}`); return; }
        updateGoal(goalId, { current_amount: newAmount });
      }

      setAportOpen(null);
      setAporte("");
    } catch (err: unknown) {
      setAportError(`Erro inesperado: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (!error) deleteGoal(id);
    else console.error("[deleteGoal]", error);
  }

  return (
    <div className="fade-up">
      <PageHeader
        title="Metas financeiras"
        subtitle="Kiyosaki: pague a si mesmo primeiro. Housel: torne o progresso visível."
        action={
          <Button variant="primary" onClick={() => { setOpen(true); setFormError(""); }}>
            <Plus size={15} strokeWidth={2.5} /> Nova meta
          </Button>
        }
      />

      {goals.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text3)" }}>
          <Target size={44} style={{ margin: "0 auto 14px", opacity: 0.25 }} strokeWidth={1.5} />
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Nenhuma meta ainda</div>
          <div style={{ fontSize: 12 }}>Crie sua primeira meta financeira</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16, marginBottom: 24 }}>
          {goals.map((g) => {
            const pct = g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0;
            const meses = g.monthly_contribution > 0
              ? Math.ceil((g.target_amount - g.current_amount) / g.monthly_contribution)
              : null;
            const done = pct >= 100;

            return (
              <Card key={g.id} style={{ borderTop: `2px solid ${g.color}` }} hover>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      {g.is_system && (
                        <Lock size={12} color="var(--text3)" strokeWidth={2} style={{ flexShrink: 0 }} />
                      )}
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{g.name}</div>
                    </div>
                    {g.subtitle && (
                      <div style={{ fontSize: 12, color: "var(--text3)" }}>{g.subtitle}</div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {done && <CheckCircle2 size={15} color={g.color} strokeWidth={2} />}
                    <Badge variant="gray">{pct}%</Badge>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--font-dm-mono)", color: g.color, letterSpacing: -0.5 }}>
                    {formatBRL(g.current_amount)}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--text3)", fontFamily: "var(--font-dm-mono)" }}>
                    / {formatBRL(g.target_amount)}
                  </span>
                </div>

                <ProgressBar pct={pct} color={g.color} height={6} />

                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 10 }}>
                  Aporte mensal:{" "}
                  <span style={{ fontFamily: "var(--font-dm-mono)", color: "var(--text2)" }}>
                    {formatBRL(g.monthly_contribution)}
                  </span>
                  {meses && meses > 0 && !done && (
                    <> · <span style={{ color: g.color, fontWeight: 500 }}>{meses} {meses === 1 ? "mês" : "meses"} para concluir</span></>
                  )}
                  {done && <span style={{ color: g.color, fontWeight: 600 }}> · Meta concluída! 🎉</span>}
                </div>

                {/* Aportes do mês para metas mapeadas */}
                {(() => {
                  const bucket = GOAL_BUCKET_MAP[g.name];
                  if (!bucket) return null;
                  const aportes = transactions.filter(t => t.bucket === bucket && t.type === "despesa");
                  if (aportes.length === 0) return null;
                  return (
                    <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                      <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginBottom: 6 }}>aportes do mês</div>
                      {aportes.map(tx => (
                        <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                          <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-dm-mono)", whiteSpace: "nowrap" }}>{formatDate(tx.date)}</div>
                          <div style={{ flex: 1, fontSize: 12, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.description}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-dm-mono)", color: g.color, whiteSpace: "nowrap" }}>{formatBRL(Math.abs(tx.amount))}</div>
                          <Button size="sm" onClick={() => openEditTx(tx)}><Edit2 size={10} strokeWidth={2} /></Button>
                          <Button size="sm" variant="danger" disabled={deletingTx === tx.id} onClick={() => handleDeleteTx(tx)}><Trash2 size={10} strokeWidth={2} /></Button>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <Button size="sm" variant="primary" onClick={() => { setAportOpen(g.id); setAporte(""); setAportError(""); }}>
                    <PlusCircle size={12} strokeWidth={2.5} /> Aportar
                  </Button>
                  {!GOAL_BUCKET_MAP[g.name] && (
                    <Button size="sm" onClick={() => { setAdjustGoalId(g.id); setAdjustValue(String(g.current_amount)); setAdjustError(""); }}>
                      <Edit2 size={11} strokeWidth={2} /> Ajustar saldo
                    </Button>
                  )}
                  {!g.is_system && (
                    <Button size="sm" variant="danger" onClick={() => handleDelete(g.id)}>
                      <Trash2 size={12} strokeWidth={2} />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {(reserva || caixa) && (
        <Card>
          <CardTitle style={{ marginBottom: 16 }}>projeção 12 meses — se mantiver o ritmo</CardTitle>
          <LineChartWidget
            data={projection}
            lines={[
              { key: "reserva", color: "#22c55e", label: "Reserva" },
              { key: "caixa",   color: "#a78bfa", label: "Caixa Empreendedor" },
            ]}
            height={220}
          />
          <div style={{ display: "flex", gap: 20, marginTop: 14, fontSize: 12, color: "var(--text2)" }}>
            {[
              { color: "#22c55e", label: "Reserva de Emergência" },
              { color: "#a78bfa", label: "Caixa Empreendedor" },
            ].map((l) => (
              <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color, display: "inline-block" }} />
                {l.label}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Add Goal Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Nova meta">
        <div style={FG}>
          <label>Nome da meta *</label>
          <input
            placeholder="Ex: Viagem ao Japão"
            value={form.name}
            onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormError(""); }}
            autoFocus
          />
        </div>
        <div style={FG}>
          <label>Descrição (opcional)</label>
          <input
            placeholder="Ex: Passagem + hotel, 15 dias"
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, ...FG }}>
          <div>
            <label>Valor alvo (R$) *</label>
            <input
              type="number"
              placeholder="0"
              value={form.target_amount}
              onChange={(e) => { setForm({ ...form, target_amount: e.target.value }); setFormError(""); }}
              min="1"
            />
          </div>
          <div>
            <label>Aporte mensal (R$)</label>
            <input
              type="number"
              placeholder="0"
              value={form.monthly_contribution}
              onChange={(e) => setForm({ ...form, monthly_contribution: e.target.value })}
              min="0"
            />
          </div>
        </div>
        <div style={FG}>
          <label>Cor</label>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setForm({ ...form, color: c })}
                style={{
                  width: 28, height: 28, borderRadius: "50%", background: c,
                  border: form.color === c ? "3px solid rgba(255,255,255,0.8)" : "3px solid transparent",
                  cursor: "pointer", outline: "none", transition: "all 0.15s",
                  transform: form.color === c ? "scale(1.2)" : "scale(1)",
                  boxShadow: form.color === c ? `0 0 10px ${c}60` : "none",
                }}
              />
            ))}
          </div>
        </div>

        {form.target_amount && form.monthly_contribution && parseFloat(form.monthly_contribution) > 0 && parseFloat(form.target_amount) > 0 && (
          <div style={{
            marginBottom: 16, padding: "10px 14px",
            background: "var(--bg4)", borderRadius: 10, border: "1px solid var(--border)",
            fontSize: 12, color: "var(--text2)",
          }}>
            Meta em{" "}
            <span style={{ color: form.color, fontWeight: 600 }}>
              {Math.ceil(parseFloat(form.target_amount) / parseFloat(form.monthly_contribution))} meses
            </span>
          </div>
        )}

        <FormErrorAlert message={formError} />

        <div style={{ display: "flex", gap: 10 }}>
          <Button
            variant="primary"
            onClick={handleAdd}
            disabled={loading}
            style={{ flex: 1, justifyContent: "center" }}
          >
            {loading ? "Criando..." : "Criar meta"}
          </Button>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
        </div>
      </Modal>

      {/* Edit aporte modal */}
      <Modal open={editTx !== null} onClose={() => setEditTx(null)} title="Editar aporte">
        {editTx && (
          <>
            <div style={FG}>
              <label>Descrição</label>
              <input value={editTxForm.description} autoFocus
                onChange={(e) => { setEditTxForm(f => ({ ...f, description: e.target.value })); setEditTxError(""); }} />
            </div>
            <div style={FG}>
              <label>Valor aportado (R$)</label>
              <input type="number" value={editTxForm.amount} min="0.01" step="0.01"
                onChange={(e) => { setEditTxForm(f => ({ ...f, amount: e.target.value })); setEditTxError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleEditTx()} />
            </div>
            <FormErrorAlert message={editTxError} />
            <div style={{ display: "flex", gap: 10 }}>
              <Button variant="primary" onClick={handleEditTx} disabled={editTxLoading} style={{ flex: 1, justifyContent: "center" }}>
                {editTxLoading ? "Salvando..." : "Salvar"}
              </Button>
              <Button onClick={() => setEditTx(null)}>Cancelar</Button>
            </div>
          </>
        )}
      </Modal>

      {/* Adjust balance modal (custom goals only) */}
      <Modal open={adjustGoalId !== null} onClose={() => setAdjustGoalId(null)} title="Ajustar saldo acumulado">
        <div style={{ marginBottom: 12, fontSize: 12, color: "var(--text3)" }}>
          Informe o saldo atual correto desta meta.
        </div>
        <div style={FG}>
          <label>Saldo acumulado (R$)</label>
          <input type="number" value={adjustValue} min="0" step="0.01" autoFocus
            onChange={(e) => { setAdjustValue(e.target.value); setAdjustError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleAdjustBalance()} />
        </div>
        <FormErrorAlert message={adjustError} />
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="primary" onClick={handleAdjustBalance} disabled={adjustLoading} style={{ flex: 1, justifyContent: "center" }}>
            {adjustLoading ? "Salvando..." : "Confirmar"}
          </Button>
          <Button onClick={() => setAdjustGoalId(null)}>Cancelar</Button>
        </div>
      </Modal>

      {/* Aporte Modal */}
      <Modal open={!!aportOpen} onClose={() => { setAportOpen(null); setAportError(""); }} title="Registrar aporte">
        <div style={FG}>
          <label>Valor aportado (R$)</label>
          <input
            type="number"
            placeholder="0"
            value={aporte}
            onChange={(e) => { setAporte(e.target.value); setAportError(""); }}
            onKeyDown={(e) => e.key === "Enter" && aportOpen && handleAporte(aportOpen)}
            autoFocus
            min="0.01"
            step="0.01"
          />
        </div>

        <FormErrorAlert message={aportError} />

        <div style={{ display: "flex", gap: 10 }}>
          <Button
            variant="primary"
            onClick={() => aportOpen && handleAporte(aportOpen)}
            disabled={loading}
            style={{ flex: 1, justifyContent: "center" }}
          >
            {loading ? "Salvando..." : "Confirmar aporte"}
          </Button>
          <Button onClick={() => setAportOpen(null)}>Cancelar</Button>
        </div>
      </Modal>
    </div>
  );
}
