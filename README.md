# grana.app 💰

App de finanças pessoais baseado no **Conscious Spending Plan** do Ramit Sethi, com a mentalidade do Morgan Housel e o princípio do caixa do Kiyosaki.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Supabase** — banco de dados + autenticação Google
- **Google Gemini 1.5 Flash** — assistente IA
- **Recharts** — gráficos
- **Zustand** — estado global
- **Vercel** — deploy

---

## Setup em 5 passos

### 1. Clone e instale

```bash
git clone https://github.com/seu-usuario/grana-app
cd grana-app
npm install
```

### 2. Configure o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Vá em **SQL Editor** → **New Query**
3. Cole o conteúdo de `supabase/schema.sql` e execute
4. Vá em **Authentication → Providers → Google** e habilite
   - Você vai precisar de um Client ID e Secret do Google Cloud Console
   - Em "Redirect URL" copie o URL do Supabase (ex: `https://xxx.supabase.co/auth/v1/callback`)

### 3. Configure o Google OAuth

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um projeto → **APIs & Services → Credentials**
3. **Create Credentials → OAuth Client ID → Web Application**
4. Em "Authorized redirect URIs" adicione: `https://SEU_PROJECT.supabase.co/auth/v1/callback`
5. Copie o Client ID e Secret → cole no Supabase

### 4. Configure as variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Edite `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
GEMINI_API_KEY=sua_gemini_key_aqui
```

- **Supabase keys**: Settings → API → Project URL + anon/public key
- **Gemini key**: [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) (gratuito)

### 5. Rode localmente

```bash
npm run dev
```

Acesse [localhost:3000](http://localhost:3000)

---

## Deploy na Vercel

```bash
npx vercel
```

Ou conecte o repositório no [vercel.com](https://vercel.com) e adicione as variáveis de ambiente no painel.

---

## Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| **Dashboard** | Saldo dos baldes, alertas, gráficos, últimas transações |
| **Transações** | CRUD completo com categorias e baldes |
| **Baldes** | Visualização do Conscious Spending Plan (Ramit Sethi) |
| **Metas** | Reserva + Caixa Empreendedor + metas customizadas com projeção 12 meses |
| **Wishlist** | Análise de viabilidade de compras vs baldes |
| **Relatórios** | Histórico 6 meses, comparativo por categoria |
| **Assistente IA** | Chat com Gemini que conhece seus dados financeiros |

---

## Lógica dos livros

### Ramit Sethi — I Will Teach You to Be Rich
Os 4 baldes distribuídos automaticamente do salário:
- **Custos Fixos (50%)** — necessidades mensais
- **Reserva de Emergência (10%)** — meta: 6 meses de gastos
- **Caixa Empreendedor (15%)** — ativo bloqueado (Kiyosaki: "pague a si mesmo")
- **Gastos Livres (25%)** — sem culpa

### Morgan Housel — The Psychology of Money
- Alertas comportamentais: detecta padrões de gasto antes de virar problema
- Projeções visuais: mostra onde você vai estar em 12 meses se mantiver o ritmo

### Robert Kiyosaki — Pai Rico, Pai Pobre
- Caixa Empreendedor existe como balde separado e "invisível" no dia a dia
- Só acessível com intenção deliberada para projetos

---

## Estrutura do projeto

```
grana-app/
├── app/
│   ├── dashboard/        # Dashboard principal
│   ├── transactions/     # Transações
│   ├── budget/           # Baldes
│   ├── goals/            # Metas
│   ├── wishlist/         # Lista de desejos
│   ├── reports/          # Relatórios
│   ├── ai/               # Assistente IA
│   ├── api/              # API routes
│   └── login/            # Autenticação
├── components/
│   ├── charts/           # Recharts components
│   └── ui/               # Componentes base
├── lib/
│   ├── finance-logic.ts  # Lógica dos baldes
│   ├── store.ts          # Zustand
│   └── supabase/         # Clients
├── supabase/
│   └── schema.sql        # Schema completo com RLS
└── types/
    └── index.ts          # Tipos TypeScript
```
