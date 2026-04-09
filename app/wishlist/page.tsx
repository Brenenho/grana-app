"use client";
import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { calcBuckets, analyzeWish } from "@/lib/finance-logic";
import { formatBRL, getLocalISOString } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormErrorAlert } from "@/components/ui/FormErrorAlert";
import { Plus, Star, CheckCircle2, Trash2, Calendar } from "lucide-react";

const ICONS = ["🎧","💻","📱","⌨️","🖥️","📷","🎮","🎸","✈️","👟","👕","📚","🛋️","🚲","⌚","🎁","🛒","💎","🎯","🏠"];
const FG = { marginBottom: 16 } as const;

const STATUS_STYLES = {
  green:  { border: "1.5px solid rgba(34,197,94,0.25)",  iconBg: "rgba(34,197,94,0.12)",  textColor: "var(--green)"  },
  yellow: { border: "1.5px solid rgba(234,179,8,0.25)",  iconBg: "rgba(234,179,8,0.12)",  textColor: "var(--yellow)" },
  red:    { border: "1.5px solid rgba(239,68,68,0.2)",   iconBg: "rgba(239,68,68,0.1)",   textColor: "var(--red)"    },
};

export default function Wishlist() {
  const { wishlist, addWishItem, deleteWishItem, profile, transactions, addTransaction, goals, categories } = useAppStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ name: "", price: "", icon: "🎧", notes: "" });

  const [buyItem, setBuyItem] = useState<any>(null);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState("");

  const salary = profile?.salary ?? 0;
  const buckets = useMemo(() => calcBuckets(salary, transactions, categories), [salary, transactions, categories]);
  const livreDisp = buckets.find((b) => b.bucket === "livre")?.remaining ?? 0;
  const reserva = goals.find((g) => g.name === "Reserva de Emergência");

  // Day-of-month context
  const today = new Date();
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - dayOfMonth;
  const monthPct = Math.round((dayOfMonth / daysInMonth) * 100);
  const dailyBudget = daysRemaining > 0 ? Math.round(livreDisp / daysRemaining) : livreDisp;

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

  async function confirmBought() {
    if (!buyItem) return;
    const itemToBuy = buyItem; // Capture local ref
    setBuyLoading(true);
    setBuyError("");
    try {
      const supabase = createClient();
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) { setBuyError("Sessão expirada."); setBuyLoading(false); return; }

      const { data: txData, error: txError } = await supabase.from("transactions").insert({
        user_id: user.id,
        description: `Comprado: ${itemToBuy.name}`,
        amount: -Math.abs(itemToBuy.price),
        category: "Lazer",
        bucket: "livre",
        type: "despesa",
        date: getLocalISOString()
      }).select().single();

      if (txError) { setBuyError(`Erro ao registrar despesa: ${txError.message}`); setBuyLoading(false); return; }

      const { error: wError } = await supabase.from("wishlist").update({ status: "comprado" }).eq("id", itemToBuy.id);
      if (wError) { setBuyError(`Erro ao atualizar wishlist: ${wError.message}`); setBuyLoading(false); return; }

      // Success steps:
      // 1. Close modal first to avoid "freezing" UI
      setBuyItem(null);
      // 2. Update store
      addTransaction(txData);
      deleteWishItem(itemToBuy.id);
    } catch (err: unknown) {
      setBuyError(`Erro inesperado: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBuyLoading(false);
    }
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-[14px] mb-[14px]">
        <Card>
          <CardTitle>livre disponível</CardTitle>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-dm-mono)", color: "var(--orange)" }}>
            {formatBRL(livreDisp)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
            {daysRemaining > 0 ? `~${formatBRL(dailyBudget)}/dia restante` : "último dia do mês"}
          </div>
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

      {/* Day-of-month progress */}
      <Card style={{ marginBottom: 18, padding: "12px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Calendar size={14} style={{ color: "var(--text3)", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "var(--text3)" }}>
            Dia {dayOfMonth} de {daysInMonth} — {daysRemaining > 0 ? `${daysRemaining} dias restantes no mês` : "último dia do mês"}
          </span>
          <span style={{ fontSize: 11, color: "var(--text3)", marginLeft: "auto" }}>{monthPct}% do mês</span>
        </div>
        <div style={{ height: 4, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${monthPct}%`, borderRadius: 4,
            background: monthPct >= 80 ? "var(--red)" : monthPct >= 50 ? "var(--yellow)" : "var(--green)",
            transition: "width 0.3s ease",
          }} />
        </div>
      </Card>

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
            const livreAfter = livreDisp - item.price;
            const dailyAfter = daysRemaining > 0 ? Math.round(livreAfter / daysRemaining) : livreAfter;
            const canAfford = livreAfter >= 0;
            const afterColor = !canAfford ? "var(--red)" : dailyAfter < 30 ? "var(--yellow)" : "var(--green)";
            const afterIcon = !canAfford ? "❌" : dailyAfter < 30 ? "⚠️" : "✅";
            return (
              <div
                key={item.id}
                style={{
                  background: "var(--bg2)", border: ss.border, borderRadius: 14,
                  padding: "16px 20px", transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateX(2px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateX(0)")}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  {/* Top section: Icon, Info, and Price (on mobile) */}
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 w-full">
                    <div style={{
                      width: 50, height: 50, flexShrink: 0, fontSize: 26,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: ss.iconBg, borderRadius: 12,
                    }}>
                      {item.icon}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col pt-[2px]">
                      <div className="flex items-start justify-between gap-2">
                        <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.2 }}>{item.name}</div>
                        <div className="sm:hidden text-[16px] font-bold font-mono whitespace-nowrap shrink-0">
                          {formatBRL(item.price)}
                        </div>
                      </div>
                      
                      <div style={{ fontSize: 12, marginTop: 4, lineHeight: 1.3 }}>
                        <span style={{ color: ss.textColor, fontWeight: 500 }}>{a.icon} {a.text}</span>
                        <span style={{ color: "var(--text3)" }}> — {a.sub}</span>
                      </div>
                      {item.notes && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>{item.notes}</div>}
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start mt-1 sm:mt-0 pt-3 sm:pt-0 border-t border-[var(--border)] sm:border-0">
                    <div className="hidden sm:block text-[18px] font-bold font-mono whitespace-nowrap shrink-0 mr-1">
                      {formatBRL(item.price)}
                    </div>
                    <div style={{ display: "flex", gap: 8, width: "100%", justifyContent: "flex-end" }}>
                      <Button size="sm" variant="primary" onClick={() => { setBuyItem(item); setBuyError(""); }} style={{ flex: "1 1 auto", justifyContent: "center" }}>
                        <CheckCircle2 size={13} strokeWidth={2.5} /> Comprei
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} style={{ flexShrink: 0 }}>
                        <Trash2 size={12} strokeWidth={2} />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Se comprar hoje */}
                <div style={{
                  marginTop: 10, padding: "8px 12px", borderRadius: 8,
                  background: "var(--bg3)", fontSize: 12,
                  display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
                }}>
                  <span style={{ color: "var(--text3)" }}>se comprar hoje:</span>
                  <span style={{ color: afterColor, fontWeight: 600 }}>
                    {afterIcon} {canAfford ? `sobra ${formatBRL(livreAfter)} no livre` : `faltam ${formatBRL(Math.abs(livreAfter))}`}
                  </span>
                  {canAfford && daysRemaining > 0 && (
                    <span style={{ color: "var(--text3)" }}>
                      · {formatBRL(dailyAfter)}/dia pelos {daysRemaining} dias restantes
                    </span>
                  )}
                  {!canAfford && (
                    <span style={{ color: "var(--text3)" }}>
                      · saldo insuficiente no balde livre
                    </span>
                  )}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
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

      {/* Confirm Buy Modal */}
      <Modal open={buyItem !== null} onClose={() => setBuyItem(null)} title="Registrar Compra">
        {buyItem && (
          <div className="flex flex-col gap-4">
            <div className="bg-[var(--bg2)] p-4 rounded-xl border border-[var(--border)] text-center">
              <div className="text-3xl mb-2">{buyItem.icon}</div>
              <div className="text-[17px] font-bold mb-1 leading-tight">{buyItem.name}</div>
              <div className="text-xl font-bold text-[var(--red)] font-mono tracking-tight">-{formatBRL(buyItem.price)}</div>
            </div>
            
            <div className="bg-[rgba(234,179,8,0.06)] border border-[rgba(234,179,8,0.2)] p-4 rounded-xl text-[13px] text-[var(--text2)] leading-relaxed">
              <span className="block font-bold text-[var(--yellow)] mb-2">Consciência financeira:</span>
              Comprar isso vai debitar <strong className="text-[var(--red)] font-mono">{formatBRL(buyItem.price)}</strong> do seu balde <strong>Gastos Livres</strong>.<br/><br/>
              Seu saldo disponível para o dia a dia cairá de <strong className="font-mono">{formatBRL(livreDisp)}</strong> para <strong className="font-mono text-[var(--yellow)]">{formatBRL(livreDisp - buyItem.price)}</strong>.
              <br/><br/>
              Tem certeza que deseja prosseguir e criar a despesa automaticamente?
            </div>

            <FormErrorAlert message={buyError} />
            
            <div className="flex gap-[10px] mt-2">
              <Button
                variant="primary"
                onClick={confirmBought}
                disabled={buyLoading}
                style={{ flex: 1, justifyContent: "center" }}
              >
                {buyLoading ? "Registrando..." : "Sim, confirmar e debitar"}
              </Button>
              <Button onClick={() => setBuyItem(null)}>Cancelar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
