---
name: grana.app project overview
description: Fintech pessoal Next.js 14 com Supabase + Gemini AI + Zustand
type: project
---

App de finanças pessoais baseado nos baldes do Ramit Sethi (Conscious Spending Plan):
- 4 baldes: Fixo (50%), Reserva (10%), Empreendedor (15%), Livre (25%)
- Stack: Next.js 14.2.4, TypeScript, Tailwind CSS, Supabase, Zustand, Recharts, Gemini AI

**Arquitetura:**
- Cada rota protegida tem seu próprio `layout.tsx` que usa `AppShell`
- `AppShell` chama `useData()` que popula o Zustand store
- `isLoaded` flag no store evita re-fetch ao navegar entre rotas
- Auth via Google OAuth → Supabase → /auth/callback

**Why:** Full refactor feito em 2026-04-04 para corrigir bugs (data re-fetch, design quebrado) e redesenhar toda a UI.

**How to apply:** Ao modificar, manter a arquitetura de AppShell por rota e o flag isLoaded no store.
