# 智能记账助手 (Smart Subscription Tracker)

Fullstack app: React + Tailwind v4 + shadcn/ui frontend, Express + Drizzle (postgres-js) backend. No authentication; all APIs are public.

## Features
- Subscription (recurring charge) CRUD with category, billing cycle (monthly/quarterly/yearly), next billing date, status
- Dashboard: monthly/yearly totals, budget usage + over-budget alert, upcoming renewals (7 days), category pie chart, top spending bar chart, 6-month projected spend chart
- Monthly budget setting persisted in DB
- AI assistant (streaming SSE) that receives the user's live subscription + budget data as context

## Structure
- `backend/server.ts` – Express entry; mounts `/api/ai`, `/api/subscriptions`, serves `frontend/dist`
- `backend/db/schema.ts` – tables `subscriptions`, `budget_settings` + Zod schemas
- `backend/db/migrations/` – SQL migration for the tables above
- `backend/repositories/subscriptions.ts` – data access
- `backend/routes/subscriptions.ts` – CRUD + `/budget/settings`
- `backend/routes/ai.ts` – streaming chat via `createAIService()` (do not modify `backend/services/aiService.ts`)
- `shared/types/api.ts` – API types, `CATEGORIES`, `BILLING_CYCLES`
- `frontend/src/lib/api.ts` – ApiService (REST + SSE chat)
- `frontend/src/App.tsx` – HashRouter, `/` → Index, `*` → redirect to `/`
- `frontend/src/pages/Index.tsx` – shell/navigation (desktop top nav, mobile bottom nav)
- `frontend/src/pages/DashboardView.tsx`, `SubscriptionsView.tsx`, `AIChatView.tsx` – the three views

## Deferred (from PRD)
- Import of charge records, PDF/Excel export, renewal push notifications, peer-average comparison, auto monthly report, quarterly/yearly historical trends

## Guidelines
- Types live in `shared/types/api.ts` (import via `@shared/types/api`)
- Use HashRouter; use `API_BASE_URL` for all requests
- Never edit `frontend/src/components/ui/`
