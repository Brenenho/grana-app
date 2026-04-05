import { Bucket, BudgetCategory, BucketSummary, Transaction, WishlistAnalysis, BUCKET_CONFIG } from "@/types";

// ── Ramit Sethi: distribui salário nos 4 baldes ───────────────
export function calcBuckets(salary: number, txs: Transaction[], categories: BudgetCategory[] = []): BucketSummary[] {
  return (Object.keys(BUCKET_CONFIG) as Bucket[]).map((bucket) => {
    const cfg = BUCKET_CONFIG[bucket];
    const total = Math.round(salary * cfg.pct);
    const txSpent = txs
      .filter((t) => t.bucket === bucket && t.type === "despesa")
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    const committed = categories
      .filter((c) => c.bucket === bucket)
      .reduce((s, c) => s + c.monthly_limit, 0);
    const txTransferIn = txs
      .filter((t) => t.bucket === bucket && t.type === "receita" && t.category === "Transferência")
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    const spent = bucket === "fixo"
      ? Math.max(Math.round(txSpent), committed)
      : Math.round(txSpent);
    return {
      bucket,
      label: cfg.label,
      pct: cfg.pct,
      total,
      spent,
      remaining: Math.max(0, total + Math.round(txTransferIn) - spent),
      color: cfg.color,
      committed,
    };
  });
}

export function bucketUsagePct(b: BucketSummary) {
  return b.total === 0 ? 0 : Math.min(100, Math.round((b.spent / b.total) * 100));
}

export function bucketStatus(pct: number): "ok" | "warning" | "danger" {
  if (pct >= 90) return "danger";
  if (pct >= 70) return "warning";
  return "ok";
}

// ── Ramit Sethi: análise da wishlist vs baldes ────────────────
export function analyzeWish(
  price: number,
  livreDisp: number,
  reservaAtual: number,
  reservaMeta: number,
  salary: number
): WishlistAnalysis {
  if (price <= livreDisp) {
    return {
      status: "green",
      icon: "✅",
      text: "Pode comprar agora",
      sub: `R$ ${Math.round(livreDisp).toLocaleString("pt-BR")} disponível no balde Livre`,
    };
  }
  const livresMensal = Math.round(salary * 0.25);
  const meses = Math.ceil(price / livresMensal);
  const reservaSegura = reservaAtual >= reservaMeta * 0.5;

  if (reservaSegura && price <= livresMensal * 4) {
    return {
      status: "yellow",
      icon: "⚠️",
      text: `Pode comprar em ~${meses} ${meses === 1 ? "mês" : "meses"}`,
      sub: "Guarde o balde Livre até juntar. Reserva está segura.",
    };
  }
  return {
    status: "red",
    icon: "❌",
    text: "Vai comprometer a reserva",
    sub: "Complete pelo menos 50% da reserva antes de considerar.",
  };
}

// ── Morgan Housel: projeção visual dos próximos 12 meses ──────
export interface Projection {
  month: string;
  reserva: number;
  caixa: number;
}

export function projectGoals(
  reservaAtual: number, reservaMeta: number, reservaMensal: number,
  caixoAtual: number, caixoMeta: number, caixoMensal: number,
  months = 12
): Projection[] {
  const names = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const now = new Date();
  let r = reservaAtual, c = caixoAtual;
  return Array.from({ length: months }, (_, i) => {
    r = Math.min(reservaMeta, r + reservaMensal);
    c = Math.min(caixoMeta, c + caixoMensal);
    return { month: names[(now.getMonth() + i + 1) % 12], reserva: Math.round(r), caixa: Math.round(c) };
  });
}

// ── Housel: detecta padrões comportamentais de gasto ─────────
export interface Alert { type: "danger" | "warning" | "info"; message: string }

export function detectAlerts(txs: Transaction[], limits: Record<string, number>): Alert[] {
  const bycat: Record<string, number> = {};
  txs.filter((t) => t.type === "despesa").forEach((t) => {
    bycat[t.category] = (bycat[t.category] || 0) + Math.abs(t.amount);
  });

  const alerts: Alert[] = [];
  Object.entries(bycat).forEach(([cat, spent]) => {
    const lim = limits[cat];
    if (!lim) return;
    const pct = (spent / lim) * 100;
    if (pct >= 100)
      alerts.push({ type: "danger", message: `${cat}: limite estourado (R$${Math.round(spent)} / R$${lim})` });
    else if (pct >= 75)
      alerts.push({ type: "warning", message: `${cat}: ${Math.round(pct)}% do limite — Housel diria: preste atenção no padrão.` });
  });
  return alerts;
}
