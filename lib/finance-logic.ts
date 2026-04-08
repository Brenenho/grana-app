import { Bucket, BudgetCategory, BucketSummary, Transaction, WishlistAnalysis, BUCKET_CONFIG } from "@/types";

// ── Ramit Sethi: distribui salário nos 4 baldes ───────────────
export function calcBuckets(salary: number, txs: Transaction[], categories: BudgetCategory[] = []): BucketSummary[] {
  return (Object.keys(BUCKET_CONFIG) as Bucket[]).map((bucket) => {
    const cfg = BUCKET_CONFIG[bucket];
    const total = Math.round(salary * cfg.pct);
    // Regular spending (excludes internal transfers)
    const bucketTxs = txs.filter((t) => t.bucket === bucket && t.type === "despesa" && t.category !== "Transferência");
    const txSpent = bucketTxs.reduce((s, t) => s + Math.abs(t.amount), 0);
    // Internal transfers tracked separately so they bypass the committed floor
    const transferOut = txs
      .filter((t) => t.bucket === bucket && t.type === "despesa" && t.category === "Transferência")
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    const transferIn = txs
      .filter((t) => t.bucket === bucket && t.type === "receita" && t.category === "Transferência")
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    
    const committed = categories
      .filter((c) => c.bucket === bucket)
      .reduce((s, c) => s + c.monthly_limit, 0);

    let projected = Math.round(txSpent);

    if (bucket === "fixo") {
      const fixoCats = categories.filter((c) => c.bucket === "fixo");
      
      const spentByCat: Record<string, number> = {};
      bucketTxs.forEach((t) => {
        spentByCat[t.category] = (spentByCat[t.category] || 0) + Math.abs(t.amount);
      });

      let proj = 0;
      fixoCats.forEach((c) => {
        const catSpent = spentByCat[c.name] || 0;
        proj += Math.max(catSpent, c.monthly_limit);
        delete spentByCat[c.name];
      });

      // Add any fixed transactions that don't match a fixed category (orphans)
      Object.values(spentByCat).forEach(amount => {
        proj += amount;
      });
      projected = Math.round(proj);
    } else {
      projected = Math.max(Math.round(txSpent), committed);
    }

    return {
      bucket,
      label: cfg.label,
      pct: cfg.pct,
      total,
      spent: Math.round(txSpent),
      remaining: Math.max(0, total + Math.round(transferIn) - Math.round(transferOut) - projected),
      color: cfg.color,
      committed,
      projected,
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
    if (pct > 100)
      alerts.push({ type: "danger", message: `${cat}: limite estourado (R$${Math.round(spent)} / R$${lim})` });
    else if (pct >= 75)
      alerts.push({ type: "warning", message: `${cat}: ${Math.round(pct)}% do limite — Housel diria: preste atenção no padrão.` });
  });
  return alerts;
}
