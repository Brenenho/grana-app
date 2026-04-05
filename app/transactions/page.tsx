"use client";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { formatBRL, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, BucketBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { CAT_COLORS, Bucket, TxType } from "@/types";
import { FormErrorAlert } from "@/components/ui/FormErrorAlert";
import { Plus, Trash2, Receipt, TrendingDown, TrendingUp } from "lucide-react";

const CATEGORIES = [
  "Moradia","Mercado","Telecom","Assinaturas","Transporte",
  "Delivery","Lazer","Roupas","Saúde","Educação","Outros",
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
  date: new Date().toISOString().slice(0, 10),
  notes: "",
};

export default function Transactions() {
  const { transactions, addTransaction, deleteTransaction } = useAppStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(INIT);

  const f = (k: string, v: string) => { setForm((p) => ({ ...p, [k]: v })); setFormError(""); };

  async function handleAdd() {
    if (!form.description.trim() || !form.amount) {
      setFormError("Preencha descrição e valor.");
      return;
    }
    const val = parseFloat(form.amount);
    if (isNaN(val) || val <= 0) {
      setFormError("Valor deve ser maior que zero.");
      return;
    }

    setLoading(true);
    setFormError("");

    try {
      const supabase = createClient();
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        setFormError("Sessão expirada — faça login novamente.");
        setLoading(false);
        return;
      }

      const amount = form.type === "despesa" ? -Math.abs(val) : Math.abs(val);

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          description: form.description.trim(),
          amount,
          category: form.category,
          bucket: form.bucket,
          type: form.type,
          date: form.date,
          notes: form.notes.trim() || null,
        })
        .select()
        .single();

      if (error) {
        console.error("[addTransaction]", error);
        setFormError(`Erro ao salvar: ${error.message}`);
      } else if (data) {
        addTransaction(data);
        setOpen(false);
        setForm(INIT);
      }
    } catch (err: unknown) {
      setFormError(`Erro inesperado: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (!error) deleteTransaction(id);
      else console.error("[deleteTransaction]", error);
    } finally {
      setDeleting(null);
    }
  }

  const totalDespesas = transactions
    .filter((t) => t.type === "despesa")
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalReceitas = transactions
    .filter((t) => t.type === "receita")
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="fade-up">
      <PageHeader
        title="Transações"
        subtitle="Lance receitas e despesas — cada uma vai pro balde certo"
        action={
          <Button variant="primary" onClick={() => { setOpen(true); setForm(INIT); setFormError(""); }}>
            <Plus size={15} strokeWidth={2.5} /> Nova transação
          </Button>
        }
      />

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
        <Card>
          <CardTitle>transações</CardTitle>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-dm-mono)" }}>
            {transactions.length}
          </div>
          <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>este mês</div>
        </Card>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <TrendingDown size={13} color="var(--red)" strokeWidth={2} />
            <CardTitle style={{ marginBottom: 0 }}>despesas</CardTitle>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-dm-mono)" }}>
            {formatBRL(totalDespesas)}
          </div>
        </Card>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <TrendingUp size={13} color="var(--green)" strokeWidth={2} />
            <CardTitle style={{ marginBottom: 0 }}>receitas</CardTitle>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-dm-mono)", color: "var(--green)" }}>
            {formatBRL(totalReceitas)}
          </div>
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
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["data", "descrição", "categoria", "balde", "tipo", "valor", ""].map((h, i) => (
                  <th
                    key={i}
                    style={{
                      textAlign: h === "valor" ? "right" : "left",
                      paddingBottom: 12,
                      paddingRight: h === "" ? 0 : 14,
                      fontSize: 10,
                      color: "var(--text3)",
                      fontFamily: "var(--font-dm-mono)",
                      textTransform: "uppercase",
                      letterSpacing: "0.6px",
                      borderBottom: "1px solid var(--border)",
                      fontWeight: 500,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr
                  key={t.id}
                  style={{ transition: "background 0.1s" }}
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
                  <td style={{
                    padding: "12px 14px 12px 0",
                    borderBottom: "1px solid var(--border)",
                    textAlign: "right",
                    fontFamily: "var(--font-dm-mono)",
                    fontWeight: 600,
                    fontSize: 13,
                    color: t.type === "receita" ? "var(--green)" : "var(--text)",
                    whiteSpace: "nowrap",
                  }}>
                    {t.type === "receita" ? "+" : ""}{formatBRL(Math.abs(t.amount))}
                  </td>
                  <td style={{ padding: "12px 0 12px 0", borderBottom: "1px solid var(--border)", textAlign: "right" }}>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={deleting === t.id}
                      onClick={() => handleDelete(t.id)}
                    >
                      <Trash2 size={12} strokeWidth={2} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Nova transação">
        <div style={FG}>
          <label>Descrição *</label>
          <input
            placeholder="Ex: Mercado Extra"
            value={form.description}
            onChange={(e) => f("description", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            autoFocus
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, ...FG }}>
          <div>
            <label>Valor (R$) *</label>
            <input
              type="number"
              placeholder="0,00"
              value={form.amount}
              onChange={(e) => f("amount", e.target.value)}
              min="0.01"
              step="0.01"
            />
          </div>
          <div>
            <label>Data</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => f("date", e.target.value)}
            />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, ...FG }}>
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

        <FormErrorAlert message={formError} />

        <div style={{ display: "flex", gap: 10 }}>
          <Button
            variant="primary"
            onClick={handleAdd}
            disabled={loading}
            style={{ flex: 1, justifyContent: "center" }}
          >
            {loading ? "Salvando..." : "Salvar transação"}
          </Button>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
        </div>
      </Modal>
    </div>
  );
}
