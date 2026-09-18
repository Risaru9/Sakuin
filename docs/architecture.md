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

#### Saku cartoon design system (redesign in progress)

The cartoon redesign lives next to the old styles until every screen is migrated.

- Tokens: `apps/web/src/styles/saku-theme.css` defines Tailwind theme values (`bg-saku-bg`, `text-saku-ink`, `font-saku-head`, `shadow-saku`, `animate-saku-bob`) and the ink outline utilities (`saku-line`, `saku-line-thin`, `saku-press`). Animations stop under `prefers-reduced-motion`.
- Fonts: Fredoka (headings, numbers) and Nunito (body) are bundled from `@fontsource` in `main.tsx`. The web CSP only allows self-hosted fonts, so do not link Google Fonts.
- Components: `apps/web/src/components/saku` (mascot, sticker button/chip/card/switch, segmented control, bottom sheet, category badge). New or migrated screens use these instead of `components/ui`.
- Messages: `components/saku/snack-store.ts` holds one app-wide Saku message ("Kopi tercatat · Batalkan") that `SakuSnackHost` renders. Saving, editing and deleting all use it, so a new message replaces the old one. `highlightIds` marks the affected rows while the message is visible.
- Bottom sheets can stack (for example "Kategori baru" on top of "Ubah catatan"); Escape closes only the top one. Keep a nested sheet outside any `<form>` of the sheet below it, because React bubbles portal events through the component tree.
- Quick composer ("kolom catat"): `apps/web/src/features/quick-composer`. Pure guessing and override logic lives in `composer-logic.ts` on top of `quick-transaction-parser.ts`. Saves are optimistic through the shared transaction caches, fall back to the offline queue, mark today as reviewed for reminders, and can be undone from the message. Enable it per page with `<AppShell showQuickComposer>`. Other screens fill or focus it through `requestComposerFocus()` in `composer-bridge.ts`.
- Navigation: three tabs in `AppShell`: Catatan (`/dashboard`, `/cari`), Laporan (`/laporan`) and Lainnya (`/lainnya` plus the older pages it links to). The old "+" menu, the floating assistant button and the old transaction modals are gone; `/transactions` redirects to Beranda.
- Beranda (`features/beranda`): the chosen month (`?bulan=YYYY-MM`) loaded whole into the regular transaction list cache (`getMonthListParams`/`fetchWholeMonth`), so composer saves and edits appear without refetching. `buildMonthView` groups entries by local day, adds queued offline entries and computes the header totals. Rows open `EditTransactionSheet`; delete has no confirmation and is undone from the message. `SearchPage` (`/cari`) filters the same month data on the client.
- Laporan (`features/laporan`, `/laporan?bulan=YYYY-MM&jenis=masuk`): the month's `GET /api/summary?month&year` drives the totals, the change from last month (from `monthlyTrend`) and the category shares. The stacked bar colours only the three biggest categories with a palette validated for colour-blind separation and folds the rest into a grey "Lainnya"; the legend always prints names, percentages and amounts. Budgets come from category limits and open `CategoryLimitSheet`.
- Category limits: `PUT /api/categories/:id/limit` works for default categories too. Their limits are per user in the `CategoryBudget` table (a default category row is global); custom categories keep `Category.limit`.
- Interim screens: `/lainnya/rekening` reuses the old account card until the redesigned Lainnya pages land. The Android home-screen widget picker (`features/android-widget`) opens from Lainnya only when `window.AndroidWidgetBridge` can pin widgets.
- Preview: in development, `/dev/saku` renders every component, and `/dev/beranda`, `/dev/cari`, `/dev/laporan` and `/dev/lainnya` run the real screens against an in-memory API (`features/dev/dev-fake-api.ts`; add `?kosong=1`, `?lambat=1` or `?gagal=1` on first load). These routes and their chunks are excluded from production builds.
- Global resets in `index.css` stay inside `@layer base`. Unlayered rules override Tailwind utilities. The unlayered mobile rule that forces inputs to 16px (to stop iOS zooming) also beats `text-*` classes, so larger inputs set `fontSize` inline.

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
