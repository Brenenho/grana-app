"use client";
import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { calcBuckets, analyzeWish } from "@/lib/finance-logic";
import { formatBRL } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormErrorAlert } from "@/components/ui/FormErrorAlert";
import { Plus, Star, CheckCircle2, Trash2 } from "lucide-react";

const ICONS = ["🎧","💻","📱","⌨️","🖥️","📷","🎮","🎸","✈️","👟","👕","📚","🛋️","🚲","⌚","🎁","🛒","💎","🎯","🏠"];
const FG = { marginBottom: 16 } as const;

const STATUS_STYLES = {
  green:  { border: "1.5px solid rgba(34,197,94,0.25)",  iconBg: "rgba(34,197,94,0.12)",  textColor: "var(--green)"  },
  yellow: { border: "1.5px solid rgba(234,179,8,0.25)",  iconBg: "rgba(234,179,8,0.12)",  textColor: "var(--yellow)" },
  red:    { border: "1.5px solid rgba(239,68,68,0.2)",   iconBg: "rgba(239,68,68,0.1)",   textColor: "var(--red)"    },
};

export default function Wishlist() {
  const { wishlist, addWishItem, deleteWishItem, profile, transactions, goals, categories } = useAppStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ name: "", price: "", icon: "🎧", notes: "" });

  const salary = profile?.salary ?? 0;
  const buckets = useMemo(() => calcBuckets(salary, transactions, categories), [salary, transactions, categories]);
  const livreDisp = buckets.find((b) => b.bucket === "livre")?.remaining ?? 0;
  const reserva = goals.find((g) => g.name === "Reserva de Emergência");

  async function handleAdd() {
    if (!form.name.trim() || !form.price) {
      setFormError("Nome e preço são obrigatórios.");
      return;
    }
    const price = parseFloat(form.price);
    if (isNaN(price) || price <= 0) {
      setFormError("Preço deve ser maior que zero.");
      return;
    }

    setLoading(true);
    setFormError("");
    try {
      const supabase = createClient();
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) { setFormError("Sessão expirada."); setLoading(false); return; }

      const { data, error } = await supabase
        .from("wishlist")
        .insert({
          user_id: user.id,
          name: form.name.trim(),
          price,
          icon: form.icon,
          notes: form.notes.trim() || null,
          priority: wishlist.length + 1,
          status: "pendente",
        })
        .select()
        .single();

      if (error) {
        console.error("[addWishItem]", error);
        setFormError(`Erro: ${error.message}`);
      } else if (data) {
        addWishItem(data);
        setOpen(false);
        setForm({ name: "", price: "", icon: "🎧", notes: "" });
      }
    } catch (err: unknown) {
      setFormError(`Erro inesperado: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("wishlist").delete().eq("id", id);
    if (!error) deleteWishItem(id);
    else console.error("[deleteWishItem]", error);
  }

  async function markBought(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("wishlist").update({ status: "comprado" }).eq("id", id);
    if (!error) deleteWishItem(id);
    else console.error("[markBought]", error);
  }

  const active = wishlist.filter((w) => w.status === "pendente");
  const reservaPct = reserva
    ? Math.round((reserva.current_amount / (reserva.target_amount || 1)) * 100)
    : 0;

  return (
    <div className="fade-up">
      <PageHeader
        title="Lista de Desejos"
        subtitle="Análise automática de viabilidade baseada nos seus baldes"
        action={
          <Button variant="primary" onClick={() => { setOpen(true); setFormError(""); }}>
            <Plus size={15} strokeWidth={2.5} /> Adicionar item
          </Button>
        }
      />

      {/* Status cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
        <Card>
          <CardTitle>balde livre disponível</CardTitle>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-dm-mono)", color: "var(--orange)" }}>
            {formatBRL(livreDisp)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>para compras sem culpa</div>
        </Card>
        <Card>
          <CardTitle>reserva de emergência</CardTitle>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-dm-mono)", color: "var(--green)" }}>
            {formatBRL(reserva?.current_amount ?? 0)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>{reservaPct}% da meta</div>
        </Card>
        <Card>
          <CardTitle>itens na wishlist</CardTitle>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-dm-mono)" }}>
            {active.length}
          </div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
            total: {formatBRL(active.reduce((s, w) => s + w.price, 0))}
          </div>
        </Card>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text3)", marginBottom: 14, flexWrap: "wrap" }}>
        <span><span style={{ color: "var(--green)" }}>✅</span> pode comprar agora</span>
        <span><span style={{ color: "var(--yellow)" }}>⚠️</span> possível em meses</span>
        <span><span style={{ color: "var(--red)" }}>❌</span> compromete reserva</span>
      </div>

      {active.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: "64px 0", color: "var(--text3)" }}>
            <Star size={40} style={{ margin: "0 auto 14px", opacity: 0.25 }} strokeWidth={1.5} />
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Wishlist vazia</div>
            <div style={{ fontSize: 12 }}>Adicione itens para ver a análise de viabilidade</div>
          </div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {active.map((item) => {
            const a = analyzeWish(item.price, livreDisp, reserva?.current_amount ?? 0, reserva?.target_amount ?? 12000, salary);
            const ss = STATUS_STYLES[a.status];
            return (
              <div
                key={item.id}
                style={{
                  background: "var(--bg2)", border: ss.border, borderRadius: 14,
                  padding: "16px 20px", display: "flex", alignItems: "center", gap: 16,
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateX(2px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateX(0)")}
              >
                <div style={{
                  width: 50, height: 50, flexShrink: 0, fontSize: 26,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: ss.iconBg, borderRadius: 12,
                }}>
                  {item.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{item.name}</div>
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: ss.textColor, fontWeight: 500 }}>{a.icon} {a.text}</span>
                    <span style={{ color: "var(--text3)" }}> — {a.sub}</span>
                  </div>
                  {item.notes && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>{item.notes}</div>}
                </div>

                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-dm-mono)", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {formatBRL(item.price)}
                </div>

                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <Button size="sm" variant="primary" onClick={() => markBought(item.id)}>
                    <CheckCircle2 size={13} strokeWidth={2.5} /> Comprei
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)}>
                    <Trash2 size={12} strokeWidth={2} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Adicionar à wishlist">
        <div style={FG}>
          <label>Nome do item *</label>
          <input
            placeholder="Ex: Fone Sony WH-1000XM5"
            value={form.name}
            onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormError(""); }}
            autoFocus
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, ...FG }}>
          <div>
            <label>Preço (R$) *</label>
            <input
              type="number"
              placeholder="0"
              value={form.price}
              onChange={(e) => { setForm({ ...form, price: e.target.value }); setFormError(""); }}
              min="0.01"
              step="0.01"
            />
          </div>
          <div>
            <label>Ícone</label>
            <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
              {ICONS.map((i) => <option key={i} value={i}>{i} {i}</option>)}
            </select>
          </div>
        </div>

        {/* Preview de viabilidade */}
        {form.price && parseFloat(form.price) > 0 && (
          <div style={{
            marginBottom: 16, padding: "10px 14px", borderRadius: 10,
            border: "1px solid var(--border)",
            background: parseFloat(form.price) <= livreDisp
              ? "rgba(34,197,94,0.08)"
              : "rgba(234,179,8,0.06)",
            fontSize: 12,
            color: parseFloat(form.price) <= livreDisp ? "var(--green)" : "var(--yellow)",
          }}>
            {parseFloat(form.price) <= livreDisp
              ? `✅ Você tem ${formatBRL(livreDisp)} no balde Livre — pode comprar!`
              : `⚠️ Faltam ${formatBRL(parseFloat(form.price) - livreDisp)} no balde Livre`}
          </div>
        )}

        <div style={FG}>
          <label>Notas (opcional)</label>
          <input
            placeholder="Ex: versão preta, modelo 2024"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        <FormErrorAlert message={formError} />

        <div style={{ display: "flex", gap: 10 }}>
          <Button
            variant="primary"
            onClick={handleAdd}
            disabled={loading}
            style={{ flex: 1, justifyContent: "center" }}
          >
            {loading ? "Adicionando..." : "Adicionar"}
          </Button>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
        </div>
      </Modal>
    </div>
  );
}
