# OmniFlow App coding instructions

## Project overview
- This repo is a fullstack app with:
  - Frontend: React + Vite + Tailwind v4 + shadcn/ui
  - Backend: Express + TypeScript + Drizzle + Postgres
- This application is intentionally public and has no authentication layer.
- AI chat is exposed through `/api/ai` and uses the OmniFlow backend service for streaming responses.
- The app uses client-side routing via HashRouter, not BrowserRouter.

## Architecture
- Frontend entry points:
  - `frontend/src/App.tsx`
  - `frontend/src/pages/Index.tsx`
  - `frontend/src/pages/DashboardView.tsx`
  - `frontend/src/pages/SubscriptionsView.tsx`
  - `frontend/src/pages/AIChatView.tsx`
- Backend entry points:
  - `backend/server.ts`
  - `backend/routes/ai.ts`
  - `backend/routes/subscriptions.ts`
- Shared domain types live in `shared/types/api.ts`; import them with `@shared/types/api` when needed.
- Database schema and migrations live under `backend/db/`.

## Important constraints
- Never edit generated UI primitives under `frontend/src/components/ui/`.
- Do not change `backend/services/aiService.ts` unless absolutely necessary; it is a thin service wrapper. Prefer adapting route-level logic in `backend/routes/ai.ts`.
- Keep all API calls compatible with the app's `API_BASE_URL` and existing backend conventions.
- Preserve the current streaming SSE behavior for the AI assistant.
- When changing types or DB models, update the impacted schema and migration logic together.
- Prefer minimal, surgical changes that match the repo's current style.

## Development workflow
- Backend dev server:
  - `npm run dev`
- Frontend dev server:
  - `cd frontend && npm run dev`
- Type checks:
  - `npm run typecheck`
  - `cd frontend && npm run typecheck`
- Production build:
  - `cd frontend && npm run build`

## Coding expectations
- Keep code simple and explicit.
- Reuse existing utilities and patterns before introducing new abstractions.
- Favor typed interfaces and validation over ad hoc values.
- Do not introduce auth or role checks unless the task specifically requires them.
- Preserve the project’s Chinese product copy and UI conventions when adjusting user-facing text.
- If a change impacts APIs, update the frontend usage at the same time.

## Verification
Before finishing a task:
1. Run the smallest relevant typecheck or build.
2. Ensure the change does not break the existing HashRouter flow or API contract.
3. Confirm the AI chat flow still survives streaming and error scenarios.
