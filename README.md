# Grana App 💸

O **Grana** é um aplicativo web completo e moderno de finanças pessoais, fundamentado no método de "baldes" (buckets) popularizado por Ramit Sethi. Desenvolvido para simplificar a organização financeira com uma interface imersiva, elegante e otimizada tanto para Desktop quanto Mobile.

## 🎯 Objetivo

Eliminar a complexidade das planilhas financeiras tradicionais oferecendo um sistema claro onde sua renda mensal é pré-alocada em "baldes" automáticos:
- **Gastos Fixos** (Contas, Aluguel, Alimentação básica)
- **Investimentos** (Ações, Renda Fixa)
- **Metas Financeiras** (Reserva de Emergência, Viagens, Carro novo)
- **Gastos Livres** (Lazer, Compras, Restaurantes)

## ✨ Funcionalidades

- **Dashboard Inteligente:** Uma visão holística e clean onde você acompanha seus "baldes", suas próximas metas e fluxo financeiro numa única tela.
- **Orçador Automático:** Calculadora dinâmica das porcentagens da sua renda para cada categoria baseada nas melhores práticas financeiras globais.
- **Transações:** Registro e categorização rápida das suas despesas e receitas.
- **Lista de Desejos (Wishlist) Viável:** Quer comprar um fone ou tênis novo? A nossa wishlist analisa automaticamente seu balde de "Gastos Livres" e sua reserva de emergência pra dizer: *Pode comprar?* *Faltam quantos dias ou meses?* *Compromete algo?*
- **Consultor via AI:** Integração inteligente na plataforma com dicas, análises e diagnósticos personalizados do seu cenário atual de contas. (Via Anthropic/OpenAI, etc).
- **Relatórios:** Gráficos interativos focados no controle prático.
- **Design Premium & Responsivo:** Interface belíssima de "Glassmorphism", suporte completo a Dark Mode/Vibrant UI e 100% responsiva para uso perfeito de celulares à desktops, além de interações e micro-animações (focadas em retenção e wow-factor).

## 🚀 Tecnologias

- **Framework:** [Next.js](https://nextjs.org/) (App Router, React 18)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/) com paletas customizadas
- **Backend & Auth:** [Supabase](https://supabase.com/)
- **Gerenciamento de Estado:** Zustand store otimizado `useAppStore`
- **Ícones:** Lucide React
- **Tipografia:** Google Fonts (DM Sans, DM Mono)

## 📱 Mobile-First 
Toda a plataforma foi refinada e auditada pra se comportar nativamente em mobile. Drawers automáticos, headers responsivos e os cartões se adaptam dinamicamente pra que a leitura de preços e botões de ação nunca estrangulem a usabilidade na menor das telas.

## 🏃 Como rodar localmente

1. Tenha o Node.js v18+ instalado.
2. Forme as variáveis de ambiente baseadas no `.env.example` apontando para a sua URL e Chave Pública do Supabase.
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Inicie o servidor:
   ```bash
   npm run dev
   ```
5. Acesse `http://localhost:3000`

---
> *Design e Inteligência moldados para trazer o controle da sua grana de volta para as suas mãos.*
