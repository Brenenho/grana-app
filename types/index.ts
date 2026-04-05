export type Bucket = "fixo" | "reserva" | "empreendedor" | "livre";
export type TxType = "despesa" | "receita";
export type WishStatus = "pendente" | "comprado" | "descartado";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  salary: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category: string;
  bucket: Bucket;
  type: TxType;
  date: string;
  notes?: string;
  created_at: string;
}

export interface BudgetCategory {
  id: string;
  user_id: string;
  name: string;
  bucket: Bucket;
  monthly_limit: number;
  color: string;
  icon: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  subtitle?: string;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number;
  color: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  name: string;
  price: number;
  icon: string;
  priority: number;
  notes?: string;
  status: WishStatus;
  created_at: string;
}

export interface BucketSummary {
  bucket: Bucket;
  label: string;
  pct: number;
  total: number;
  spent: number;
  remaining: number;
  color: string;
  committed?: number;
}

export interface WishlistAnalysis {
  status: "green" | "yellow" | "red";
  icon: string;
  text: string;
  sub: string;
}

export const BUCKET_CONFIG: Record<Bucket, { label: string; pct: number; color: string; desc: string }> = {
  fixo: {
    label: "Custos Fixos",
    pct: 0.50,
    color: "#3b82f6",
    desc: "Aluguel, mercado, celular, internet. O que você precisa pagar todo mês.",
  },
  reserva: {
    label: "Reserva de Emergência",
    pct: 0.10,
    color: "#22c55e",
    desc: "Meta: 6 meses de gastos (~R$12.000). Automático. Não toca.",
  },
  empreendedor: {
    label: "Caixa Empreendedor",
    pct: 0.15,
    color: "#a78bfa",
    desc: "Ativo invisível. Só acessa com intenção deliberada pra um projeto.",
  },
  livre: {
    label: "Gastos Livres",
    pct: 0.25,
    color: "#f97316",
    desc: "Lazer, rolê, compras sem culpa. Use sem remorso.",
  },
};

export const CAT_COLORS: Record<string, string> = {
  Moradia: "#a78bfa",
  Mercado: "#3b82f6",
  Telecom: "#06b6d4",
  Assinaturas: "#eab308",
  Transporte: "#f97316",
  Delivery: "#f97316",
  Lazer: "#22c55e",
  Roupas: "#ec4899",
  Saúde: "#14b8a6",
  Educação: "#8b5cf6",
  Receita: "#22c55e",
  Outros: "#888888",
};
