# Gastos — Claude Code Guide

## What this project is

Personal expense tracker. Offline-first PWA — no backend, no account, all data in IndexedDB. Deployed to GitHub Pages.

## Stack

| Layer | Choice |
|---|---|
| Framework | Angular 19 (standalone components, Signals) |
| Storage | Dexie.js (IndexedDB) |
| Charts | Chart.js |
| Styles | Tailwind CSS v4 + inline styles |
| Dates | date-fns |
| XLS parsing | SheetJS (`xlsx`) — dynamic import, lazy chunk only |
| PWA | @angular/pwa |
| Deploy | GitHub Pages via GitHub Actions |

## Project structure

```
src/app/
├── app.component.ts          # Root layout: global balance card + bottom nav
├── app.config.ts             # Angular providers (service worker, zoneless)
├── app.routes.ts             # Lazy-loaded routes
├── core/
│   ├── db.ts                 # Dexie schema + all DB functions (source of truth for data types)
│   ├── store.service.ts      # Central signals store — loads data, exposes computed state
│   ├── toast.service.ts      # Toast notifications (show / error / undo)
│   ├── localization.service.ts  # Language switching, interpolation helper
│   ├── locale-config.ts      # Supported languages type
│   ├── translations.ts       # All UI strings for ES + EN (add new keys to both)
│   └── utils.ts              # exportToCsv, generateSlug, PALETTE, EMOJI_PRESETS, toDateStr
├── components/
│   ├── transaction-modal/    # Bottom-sheet for add/edit transactions
│   ├── transaction-card/     # Swipeable card with delete/duplicate
│   ├── search-overlay/       # Full-screen search
│   ├── category-badge/
│   ├── amount-display/
│   ├── bank-import/          # 3-step wizard: CSV/XLS/XLSX → auto-detect bank → column map → import
│   └── split/                # Shared expenses: export split JSON + import + settlement calculator
└── views/
    ├── today/                # Daily balance + transaction list
    ├── month/                # Monthly summary, budgets, ZBB "To Assign" card, pull-to-refresh
    ├── stats/                # Charts, KPIs, insights, net worth timeline
    ├── settings/             # Currency, language, categories, budgets, ZBB toggle, data import/export
    └── wallets/              # Wallet CRUD
```

## Key conventions

- **Signals everywhere** — use `signal()` / `computed()` for reactive state. The store exposes signals; components read them directly.
- **Inline styles** — the app uses CSS custom properties (`var(--accent)`, `var(--surface)`, `var(--text-muted)`, etc.) via inline `style` attributes. Do not introduce new CSS files or classes.
- **Standalone components** — every component is standalone. Add imports to the component's `imports: []` array, not to a module.
- **No backend** — never add server-side logic. All persistence goes through Dexie (`src/app/core/db.ts`).
- **DB schema changes** — increment the Dexie version and add an `.upgrade()` migration. Never mutate existing version definitions.
- **Translations** — any user-facing string must be added to `TranslationCatalog` in `translations.ts` and filled in for both `es` and `en`. Exception: overlay components that inline a `t()` computed (e.g. `bank-import`, `split`) may keep their strings local.
- **Toast feedback** — use `ToastService.show()` for success, `.error()` for failures.
- **Settings flags** — boolean feature flags (e.g. `zbbMode`) are stored as `Setting` rows via `store.updateSetting(key, value)` and exposed as `computed()` on the store. No schema change needed.
- **Overlays** — bottom-sheet overlays follow the `BankImportComponent` pattern: fixed backdrop + sheet div, `output<void>() close`, triggered by a `signal(false)` in the parent view.

## Data model (db.ts)

```ts
Transaction { id, amount (always positive), type ('expense'|'income'), categoryId, note, date ('YYYY-MM-DD'), createdAt, recurring, recurringEndDate?, walletId? }
Wallet      { id, name, icon (emoji), color (hex), createdAt }
Category    { id (slug), name, icon, color, type ('expense'|'income'|'both'), isDefault, createdAt }
Budget      { categoryId (PK), monthlyLimit }
Setting     { key, value }
```

## Development commands

```bash
npm install
npx ng serve          # dev server → http://localhost:4200
npx ng build          # production build
```

## Deploy

Every push to `main` triggers GitHub Actions → GitHub Pages automatically.

Manual deploy:
```bash
npx ng build --base-href=/expense-tracker/
npx angular-cli-ghpages --dir=dist/expense-tracker/browser
```

## Features at a glance

- Global balance, Today view, Month view, Stats (KPIs + charts + insights + YTD)
- **Net worth timeline** — all-time cumulative balance line chart in Stats; green/red based on current sign
- Wallets — multiple wallets, per-wallet balance, DB migration for existing users
- Transactions — add/edit/delete/duplicate, recurring (daily/weekly/monthly), undo delete
- Search — full-screen overlay, searches note + category + amount, debounced
- Budgets — monthly limit per category, progress bar in month view
- **Zero-based budgeting (ZBB)** — toggle in Settings; "To Assign" card in Month view shows income minus total allocations; three states: unassigned (yellow), balanced (green), over-allocated (red)
- **Bank file import** — 3-step wizard; accepts CSV, XLS, XLSX; auto-detects bank format from column headers (Santander / BBVA / ING / CaixaBank / N26 / Revolut); falls back to manual mapping
- **Shared expenses** — export a month's expenses as a split JSON file; recipient imports it, app fetches their own data for the same period and shows the settlement (who owes whom and how much); optional "add their transactions" button
- Data portability — export/import CSV + JSON backup
- Offline banner, pull-to-refresh, haptic feedback, keyboard shortcuts (`N`, `Esc`)
- Bilingual: Spanish + English
- PWA: installable, fully offline after first load
