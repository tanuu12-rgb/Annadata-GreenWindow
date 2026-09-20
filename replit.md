# GreenWindow

GreenWindow helps farmers schedule irrigation when clean energy is available and the field actually needs water.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/greenwindow/src/pages/home.tsx` — single-screen dashboard and interactive field controls
- `artifacts/greenwindow/src/index.css` — GreenWindow visual theme and dashboard styling
- `artifacts/api-server/src/routes/greenwindow.ts` — modeled energy curve, scheduling, forecast, and ripeness routes
- `lib/api-spec/openapi.yaml` — source of truth for the GreenWindow API contract

## Architecture decisions

- The first release uses deterministic modeled energy data so the judging demo never depends on a live grid API.
- Soil moisture is a local simulated signal with a manual slider override; it is labeled as hardware-ready rather than presented as a real sensor.
- The dashboard stays single-screen so the energy curve, recommendation, forecast, and storage decision are visible in one flow.

## Product

- Shows a 24-hour clean-energy curve modeled on India Energy Atlas fuel-mix patterns.
- Recommends a contiguous irrigation window based on clean energy and soil moisture need.
- Compares the recommendation with a fixed schedule using kWh and CO₂ savings.
- Displays a bilingual farmer alert, forecast holdout MAPE, and a sample/upload ripeness check that changes cooling state.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
