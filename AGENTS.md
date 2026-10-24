# AGENTS.md

## Role
You are working in the OmniFlow app repository. Your job is to make focused, production-safe changes that improve the app without disturbing its existing architecture.

## Repository overview
- Fullstack app: React + Vite + Tailwind + shadcn UI in `frontend/`
- API + business logic: Express + TypeScript in `backend/`
- Shared app types: `shared/types/api.ts`
- Database and migrations: `backend/db/`

## Must-follow rules
- Use HashRouter; do not switch to BrowserRouter.
- Keep the app public/no-auth unless the user explicitly requests authentication.
- Do not modify generated shadcn components located in `frontend/src/components/ui/`.
- Do not edit `backend/services/aiService.ts` unless the task specifically demands it.
- Preserve the SSE streaming AI chat flow.
- Keep the existing naming and code style consistent with the repo.
- Prefer small, targeted edits over broad rewrites.

## Change guidance
- If a task affects the API contract, update the frontend call sites together.
- If a task changes data models or schema, update the matching migration/schema files.
- If a task changes UI behavior, keep the visual style aligned with the existing Tailwind/shadcn patterns.
- Avoid adding unused dependencies or unnecessary abstraction layers.

## Useful commands
- Root backend:
  - `npm run dev`
- Frontend:
  - `cd frontend && npm run dev`
- Type checks:
  - `npm run typecheck`
  - `cd frontend && npm run typecheck`
- Frontend production build:
  - `cd frontend && npm run build`

## Completion checklist
Before finishing, verify:
- Type-check passes for the affected area.
- No generated UI files were modified accidentally.
- The app still follows the current architecture and route conventions.
- The change is scoped to the user's request.
