"use client";
import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { projectGoals } from "@/lib/finance-logic";
import { formatBRL } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LineChartWidget } from "@/components/charts/LineChartWidget";
import { FormErrorAlert } from "@/components/ui/FormErrorAlert";
import { Plus, Target, Lock, Trash2, PlusCircle, CheckCircle2 } from "lucide-react";

const FG = { marginBottom: 16 } as const;
const COLORS = ["#22c55e", "#3b82f6", "#a78bfa", "#f97316", "#eab308", "#06b6d4", "#ec4899"];

export default function Goals() {
  const { goals, addGoal, deleteGoal, updateGoal, addTransaction } = useAppStore();
  const [open, setOpen] = useState(false);
  const [aportOpen, setAportOpen] = useState<string | null>(null);
  const [aporte, setAporte] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [aportError, setAportError] = useState("");
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

  const GOAL_BUCKET_MAP: Record<string, "reserva" | "empreendedor"> = {
    "Reserva de Emergência": "reserva",
    "Caixa Empreendedor": "empreendedor",
  };

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
      const newAmount = goal.current_amount + val;
      const { error } = await supabase
        .from("goals")
        .update({ current_amount: newAmount, updated_at: new Date().toISOString() })
        .eq("id", goalId);

      if (error) {
        console.error("[aporte]", error);
        setAportError(`Erro: ${error.message}`);
      } else {
        updateGoal(goalId, { current_amount: newAmount });

        // Se a meta corresponde a um balde (reserva/empreendedor), criar transação
        const bucket = GOAL_BUCKET_MAP[goal.name];
        if (bucket) {
          const today = new Date().toISOString().slice(0, 10);
          const { data: txData, error: txError } = await supabase
            .from("transactions")
            .insert({
              user_id: user.id,
              description: `Aporte · ${goal.name}`,
              amount: val,
              category: "Poupança",
              bucket,
              type: "despesa",
              date: today,
            })
            .select()
            .single();
          if (txError) {
            console.error("[aporte tx]", txError);
          } else if (txData) {
            addTransaction(txData);
          }
        }

        setAportOpen(null);
        setAporte("");
      }
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

                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <Button size="sm" variant="primary" onClick={() => { setAportOpen(g.id); setAporte(""); setAportError(""); }}>
                    <PlusCircle size={12} strokeWidth={2.5} /> Aportar
                  </Button>
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
