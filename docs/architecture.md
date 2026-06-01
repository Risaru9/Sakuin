# Sakuin Architecture

Sakuin is a pnpm monorepo with three active workspaces:

- `apps/api`: Hono API, Prisma data access, domain services, security middleware.
- `apps/web`: React/Vite web app, Capacitor/PWA integration, feature UI.
- `packages/shared`: Shared TypeScript contracts used by frontend and backend.

## Folder Boundaries

### API

API code is organized by domain under `apps/api/src/modules`.

- `*.route.ts`: route registration only.
- `*.controller.ts`: request parsing, auth context, response shape.
- `*.service.ts`: orchestration and business workflows.
- `*.schema.ts`: request validation.
- `*.types.ts`: public module types, preferably re-exporting shared contracts when used by both app sides.

Large services should be split when a file starts mixing unrelated concerns:

- classifier or parser logic goes into focused modules such as `ai-chat-classifier.ts`.
- provider/model calls go into provider or enhancement modules.
- deterministic response builders should stay separate from request persistence.
- scheduled/proactive jobs should stay outside request-response services.

### Web

Frontend code is organized by feature under `apps/web/src/features`.

- `pages/`: route-level page components.
- feature-level `*.service.ts`: API calls only.
- feature-level `*.types.ts`: frontend-facing types, re-exporting shared contracts when possible.
- feature-level helper files: pure logic and formatting.
- repeated UI blocks should be extracted from large pages into focused components.

Page files should not keep long formatter, validator, storage, or business-rule helper blocks. Those helpers should be extracted and tested near the feature.

### Shared

`packages/shared` contains contracts that must stay synchronized between API and web.

Good candidates:

- API request/response types.
- shared enum-like constants.
- DTO shapes used by both sides.

Avoid adding:

- React code.
- Prisma models or database-specific types.
- runtime code that depends on browser or Node-only APIs.
- feature implementation logic that belongs to API or web.

## Current Shared Contracts

The AI chat contract is shared from `@sakuin/shared`:

- `AiIntent`
- `AiChatRequest`
- `AiChatResponse`
- `AiChatMessage`
- `AiTransactionDraft`

Both API and web re-export these types from their local `ai.types.ts` files to keep existing imports stable.

## Refactor Rules

Before deleting code:

1. Search references with `rg`.
2. Check route, manifest, service worker, seed, CI, and APK usage.
3. Prefer moving code before deleting code if runtime usage is unclear.
4. Delete only when there is no runtime path, no test path, and no build/deploy reference.
5. Run focused typecheck/test immediately after deletion.

Before splitting a large file:

1. Extract pure helpers first.
2. Keep exported behavior and public function names unchanged.
3. Add or move tests around extracted logic.
4. Run typecheck before continuing to the next extraction.

## Production Safety Checklist

Run these before deploy-sensitive changes are merged:

```bash
pnpm safety:production
pnpm --filter @sakuin/shared typecheck
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/web test
pnpm --filter @sakuin/web build
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api build
pnpm smoke:production
```

Do not run Prisma generate/build in parallel with API tests on Windows because the Prisma query engine DLL can be locked while tests are still using the client.

## Deployment Guardrails

- `/health` should expose only operational health, not debug tags or internals.
- Production error responses must not expose stack traces.
- Logs must avoid raw `userId`, email, token, request body, or transaction notes.
- App version metadata must stay synchronized between API `/api/app-version` and web `latest-version.json`.
- APK workflow must run safety check, typecheck, test, and web build before native build steps.
