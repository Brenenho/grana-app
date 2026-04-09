"use client";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { formatBRL, formatDate, getLocalISOString } from "@/lib/utils";
import { syncGoalForBucket, isSavingsTx } from "@/lib/goal-sync";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, BucketBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { CAT_COLORS, Bucket, TxType } from "@/types";
import { FormErrorAlert } from "@/components/ui/FormErrorAlert";
import { Plus, Trash2, Receipt, TrendingDown, TrendingUp, Edit2 } from "lucide-react";
import type { Transaction } from "@/types";

const CATEGORIES = [
  "Moradia","Mercado","Telecom","Assinaturas","Transporte",
  "Delivery","Lazer","Roupas","Saúde","Educação","Poupança","Outros",
];
const BUCKETS: { value: Bucket; label: string }[] = [
  { value: "fixo",          label: "Custos Fixos (50%)" },
  { value: "reserva",       label: "Reserva de Emergência (10%)" },
  { value: "empreendedor",  label: "Caixa Empreendedor (15%)" },
  { value: "livre",         label: "Gastos Livres (25%)" },
];

const FG = { marginBottom: 16 } as const;

const INIT = {
  description: "",
  amount: "",
  category: "Mercado",
  bucket: "fixo" as Bucket,
  type: "despesa" as TxType,
  date: getLocalISOString(),
  notes: "",
};

export default function Transactions() {
  const { transactions, goals, addTransaction, updateTransaction, deleteTransaction, updateGoal } = useAppStore();

  // ── Add modal ──────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [form, setForm] = useState(INIT);

  // ── Edit modal ─────────────────────────────────────────────────
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({ description: "", amount: "", date: "", notes: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // ── Delete ─────────────────────────────────────────────────────
  const [deleting, setDeleting] = useState<string | null>(null);

  const f = (k: string, v: string) => { setForm((p) => ({ ...p, [k]: v })); setAddError(""); };

  function openEdit(tx: Transaction) {
    setEditTx(tx);
    setEditForm({
      description: tx.description,
      amount: String(Math.abs(tx.amount)),
      date: tx.date,
      notes: tx.notes ?? "",
    });
    setEditError("");
  }

  // ── handleAdd ─────────────────────────────────────────────────
  async function handleAdd() {
    if (!form.description.trim() || !form.amount) {
      setAddError("Preencha descrição e valor.");
      return;
    }
    const val = parseFloat(form.amount);
    if (isNaN(val) || val <= 0) { setAddError("Valor deve ser maior que zero."); return; }

    setAddLoading(true);
    setAddError("");
    try {
      const supabase = createClient();
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) { setAddError("Sessão expirada."); return; }

      const amount = form.type === "despesa" ? -Math.abs(val) : Math.abs(val);
      const { data, error } = await supabase
        .from("transactions")
        .insert({ user_id: user.id, description: form.description.trim(), amount,
          category: form.category, bucket: form.bucket, type: form.type,
          date: form.date, notes: form.notes.trim() || null })
        .select().single();

      if (error) { setAddError(`Erro ao salvar: ${error.message}`); return; }
      addTransaction(data);

      // Sync goal if this transaction goes to a savings bucket
      if (isSavingsTx(form.bucket, form.type)) {
        await syncGoalForBucket(form.bucket, val, goals, updateGoal);
      }

      setAddOpen(false);
      setForm(INIT);
    } catch (err: unknown) {
      setAddError(`Erro inesperado: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setAddLoading(false);
    }
  }

  // ── handleEdit ────────────────────────────────────────────────
  async function handleEdit() {
    if (!editTx) return;
    if (!editForm.description.trim() || !editForm.amount) {
      setEditError("Preencha descrição e valor.");
      return;
    }
    const newVal = parseFloat(editForm.amount);
    if (isNaN(newVal) || newVal <= 0) { setEditError("Valor deve ser maior que zero."); return; }

    setEditLoading(true);
    setEditError("");
    try {
      const supabase = createClient();
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) { setEditError("Sessão expirada."); return; }

      const newAmount = editTx.type === "despesa" ? -Math.abs(newVal) : Math.abs(newVal);
      const { data, error } = await supabase
        .from("transactions")
        .update({ description: editForm.description.trim(), amount: newAmount,
          date: editForm.date, notes: editForm.notes.trim() || null })
        .eq("id", editTx.id).eq("user_id", user.id)
        .select().single();

      if (error) { setEditError(`Erro ao salvar: ${error.message}`); return; }
      updateTransaction(editTx.id, data);

      // Sync goal delta if this is a savings bucket transaction
      if (isSavingsTx(editTx.bucket, editTx.type)) {
        const oldVal = Math.abs(editTx.amount);
        const delta = newVal - oldVal;
        if (delta !== 0) await syncGoalForBucket(editTx.bucket, delta, goals, updateGoal);
      }

      setEditTx(null);
    } catch (err: unknown) {
      setEditError(`Erro inesperado: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setEditLoading(false);
    }
  }

  // ── handleDelete ──────────────────────────────────────────────
  async function handleDelete(tx: Transaction) {
    setDeleting(tx.id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("transactions").delete().eq("id", tx.id);
      if (error) { console.error("[deleteTransaction]", error); return; }
      deleteTransaction(tx.id);

      // Sync goal if this was a savings bucket transaction
      if (isSavingsTx(tx.bucket, tx.type)) {
        await syncGoalForBucket(tx.bucket, -Math.abs(tx.amount), goals, updateGoal);
      }
    } finally {
      setDeleting(null);
    }
  }

  const totalDespesas = transactions.filter(t => t.type === "despesa" && t.category !== "Transferência").reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalReceitas = transactions.filter(t => t.type === "receita" && t.category !== "Transferência").reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="fade-up">
      <PageHeader
        title="Transações"
        subtitle="Lance receitas e despesas — cada uma vai pro balde certo"
        action={
          <Button variant="primary" onClick={() => { setAddOpen(true); setForm(INIT); setAddError(""); }}>
            <Plus size={15} strokeWidth={2.5} /> Nova transação
          </Button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-[14px] mb-5">
        <Card>
          <CardTitle>transações</CardTitle>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-dm-mono)" }}>{transactions.length}</div>
          <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>este mês</div>
        </Card>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <TrendingDown size={13} color="var(--red)" strokeWidth={2} />
            <CardTitle style={{ marginBottom: 0 }}>despesas</CardTitle>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-dm-mono)" }}>{formatBRL(totalDespesas)}</div>
        </Card>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <TrendingUp size={13} color="var(--green)" strokeWidth={2} />
            <CardTitle style={{ marginBottom: 0 }}>receitas</CardTitle>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-dm-mono)", color: "var(--green)" }}>{formatBRL(totalReceitas)}</div>
        </Card>
      </div>

      <Card>
        {transactions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0", color: "var(--text3)" }}>
            <Receipt size={40} style={{ margin: "0 auto 14px", opacity: 0.3 }} strokeWidth={1.5} />
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Nenhuma transação este mês</div>
            <div style={{ fontSize: 12 }}>Clique em "Nova transação" para começar</div>
          </div>
        ) : (
          <div className="overflow-x-auto w-full no-scrollbar pb-2">
            <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr>
                {["data", "descrição", "categoria", "balde", "tipo", "valor", ""].map((h, i) => (
                  <th key={i} style={{
                    textAlign: h === "valor" ? "right" : "left",
                    paddingBottom: 12, paddingRight: h === "" ? 0 : 14,
                    fontSize: 10, color: "var(--text3)", fontFamily: "var(--font-dm-mono)",
                    textTransform: "uppercase", letterSpacing: "0.6px",
                    borderBottom: "1px solid var(--border)", fontWeight: 500,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} style={{ transition: "background 0.1s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "12px 14px 12px 0", borderBottom: "1px solid var(--border)", fontSize: 11.5, color: "var(--text3)", fontFamily: "var(--font-dm-mono)", whiteSpace: "nowrap" }}>
                    {formatDate(t.date)}
                  </td>
                  <td style={{ padding: "12px 14px 12px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                    {t.description}
                    {t.notes && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>{t.notes}</div>}
                  </td>
                  <td style={{ padding: "12px 14px 12px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: CAT_COLORS[t.category] ?? "#888", flexShrink: 0, display: "inline-block" }} />
                      {t.category}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px 12px 0", borderBottom: "1px solid var(--border)" }}>
                    <BucketBadge bucket={t.bucket} />
                  </td>
                  <td style={{ padding: "12px 14px 12px 0", borderBottom: "1px solid var(--border)" }}>
                    <Badge variant={t.type === "receita" ? "green" : "red"}>
                      {t.type === "receita" ? "receita" : "despesa"}
                    </Badge>
                  </td>
                  <td style={{ padding: "12px 14px 12px 0", borderBottom: "1px solid var(--border)", textAlign: "right", fontFamily: "var(--font-dm-mono)", fontWeight: 600, fontSize: 13, color: t.type === "receita" ? "var(--green)" : "var(--text)", whiteSpace: "nowrap" }}>
                    {t.type === "receita" ? "+" : ""}{formatBRL(Math.abs(t.amount))}
                  </td>
                  <td style={{ padding: "12px 0 12px 0", borderBottom: "1px solid var(--border)", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                      <Button size="sm" onClick={() => openEdit(t)}>
                        <Edit2 size={11} strokeWidth={2} />
                      </Button>
                      <Button size="sm" variant="danger" disabled={deleting === t.id} onClick={() => handleDelete(t)}>
                        <Trash2 size={12} strokeWidth={2} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      {/* ── Add modal ────────────────────────────────────────── */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Nova transação">
        <div style={FG}>
          <label>Descrição *</label>
          <input placeholder="Ex: Mercado Extra" value={form.description}
            onChange={(e) => f("description", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()} autoFocus />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label>Valor (R$) *</label>
            <input type="number" placeholder="0,00" value={form.amount}
              onChange={(e) => f("amount", e.target.value)} min="0.01" step="0.01" />
          </div>
          <div>
            <label>Data</label>
            <input type="date" value={form.date} onChange={(e) => f("date", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label>Tipo</label>
            <select value={form.type} onChange={(e) => f("type", e.target.value)}>
              <option value="despesa">💸 Despesa</option>
              <option value="receita">💰 Receita</option>
            </select>
          </div>
          <div>
            <label>Categoria</label>
            <select value={form.category} onChange={(e) => f("category", e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={FG}>
          <label>Balde</label>
          <select value={form.bucket} onChange={(e) => f("bucket", e.target.value)}>
            {BUCKETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>
        <FormErrorAlert message={addError} />
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="primary" onClick={handleAdd} disabled={addLoading} style={{ flex: 1, justifyContent: "center" }}>
            {addLoading ? "Salvando..." : "Salvar transação"}
          </Button>
          <Button onClick={() => setAddOpen(false)}>Cancelar</Button>
        </div>
      </Modal>

      {/* ── Edit modal ───────────────────────────────────────── */}
      <Modal open={editTx !== null} onClose={() => setEditTx(null)} title="Editar transação">
        {editTx && (
          <>
            {isSavingsTx(editTx.bucket, editTx.type) && (
              <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10,
                background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.2)",
                fontSize: 12, color: "#c4b5fd" }}>
                Esta transação é um aporte — a meta correspondente será atualizada automaticamente.
              </div>
            )}
            <div style={FG}>
              <label>Descrição *</label>
              <input value={editForm.description} autoFocus
                onChange={(e) => { setEditForm(f => ({ ...f, description: e.target.value })); setEditError(""); }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label>Valor (R$) *</label>
                <input type="number" value={editForm.amount} min="0.01" step="0.01"
                  onChange={(e) => { setEditForm(f => ({ ...f, amount: e.target.value })); setEditError(""); }} />
              </div>
              <div>
                <label>Data</label>
                <input type="date" value={editForm.date}
                  onChange={(e) => setEditForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label>Tipo</label>
                <div style={{ padding: "8px 12px", background: "var(--bg3)", borderRadius: 8, fontSize: 13, color: "var(--text2)", border: "1px solid var(--border)" }}>
                  {editTx.type === "receita" ? "💰 Receita" : "💸 Despesa"}
                </div>
              </div>
              <div>
                <label>Balde</label>
                <div style={{ padding: "8px 12px", background: "var(--bg3)", borderRadius: 8, fontSize: 13, color: "var(--text2)", border: "1px solid var(--border)" }}>
                  <BucketBadge bucket={editTx.bucket} />
                </div>
              </div>
            </div>
            <FormErrorAlert message={editError} />
            <div style={{ display: "flex", gap: 10 }}>
              <Button variant="primary" onClick={handleEdit} disabled={editLoading} style={{ flex: 1, justifyContent: "center" }}>
                {editLoading ? "Salvando..." : "Salvar alterações"}
              </Button>
              <Button onClick={() => setEditTx(null)}>Cancelar</Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
