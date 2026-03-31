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
│   └── bank-import/          # 3-step wizard for importing bank CSV files
└── views/
    ├── today/                # Daily balance + transaction list
    ├── month/                # Monthly summary, budgets, pull-to-refresh
    ├── stats/                # Charts, KPIs, insights
    ├── settings/             # Currency, language, categories, budgets, data import/export
    └── wallets/              # Wallet CRUD
```

## Key conventions

- **Signals everywhere** — use `signal()` / `computed()` for reactive state. The store exposes signals; components read them directly.
- **Inline styles** — the app uses CSS custom properties (`var(--accent)`, `var(--surface)`, `var(--text-muted)`, etc.) via inline `style` attributes. Do not introduce new CSS files or classes.
- **Standalone components** — every component is standalone. Add imports to the component's `imports: []` array, not to a module.
- **No backend** — never add server-side logic. All persistence goes through Dexie (`src/app/core/db.ts`).
- **DB schema changes** — increment the Dexie version and add an `.upgrade()` migration. Never mutate existing version definitions.
- **Translations** — any user-facing string must be added to `TranslationCatalog` in `translations.ts` and filled in for both `es` and `en`.
- **Toast feedback** — use `ToastService.show()` for success, `.error()` for failures.

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
- Wallets — multiple wallets, per-wallet balance, DB migration for existing users
- Transactions — add/edit/delete/duplicate, recurring (daily/weekly/monthly), undo delete
- Search — full-screen overlay, searches note + category + amount, debounced
- Budgets — monthly limit per category, progress bar in month view
- Bank CSV import — 3-step wizard (preset → column mapping → preview), supports Santander / BBVA / ING / CaixaBank / N26 / Revolut / generic
- Data portability — export/import CSV + JSON backup
- Offline banner, pull-to-refresh, haptic feedback, keyboard shortcuts (`N`, `Esc`)
- Bilingual: Spanish + English
- PWA: installable, fully offline after first load
