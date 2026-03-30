# Gastos

Personal expense tracker. Offline-first, no account, no backend — all data lives on your device.

## Features

### Core
- **Global balance** — all-time net balance (income − expenses) always visible at the top
- **Today view** — daily balance, transactions list, one-tap to add
- **Month view** — navigate any month, per-day grouping, income/expense summary
- **Stats** — KPI cards, spending doughnut, 6-month income vs expense trend, top categories, auto-generated insights, year-to-date summary, past-month browsing
- **Settings** — currency symbol, language, custom categories with emoji picker, monthly budgets

### Wallets
- Multiple wallets (Cash, Card, Savings, etc.) each with a custom icon and colour
- Per-wallet balance shown in the Wallets view (Settings → Manage wallets)
- Every transaction is assigned to a wallet; the selector appears in the modal when 2+ wallets exist
- Existing users are migrated automatically — all prior transactions move to a default "Cash" wallet
- JSON backup includes wallets (backup format v2); import handles both v1 and v2

### Transactions
- Add income or expense with amount, category, date, and optional note
- Assign to a wallet when multiple wallets are configured
- Edit any transaction by tapping it
- Delete by swiping left on mobile, or via the ✕ button on desktop
- **Undo delete** — a toast with an "Undo" button appears for 4.5 seconds after any deletion
- **Desktop delete confirmation** — ✕ requires two clicks (arm → confirm) with auto-disarm after 2.5s
- **Duplicate** — long-press on mobile or ⧉ icon on desktop to clone a transaction with today's date
- **Recurring transactions** — mark as daily / weekly / monthly; instances auto-created on app load
- **Recurring end date** — optionally set a stop date for any recurring series
- **Default category memory** — the modal remembers the last-used category per type (income/expense)
- **Haptic feedback** on save and delete (Vibration API)

### Search
- 🔍 button in Today view opens a full-screen search overlay
- Searches across all transactions by note text, category name, or amount
- Results grouped by date, debounced 300ms

### Budgets
- Set a monthly spending limit per category in Settings
- Month view shows a progress bar per category — turns orange above 80%, red above 100%

### Statistics & Insights
- KPI cards: savings rate, average daily spend, month-over-month delta
- **Month navigation** — browse past months with ‹ › arrows; all KPIs and charts update accordingly
- **Year-to-date summary** — income YTD, expenses YTD, net savings YTD, savings rate YTD
- Doughnut chart: expenses by category for the selected month
- Bar chart: income vs expenses for the last 6 months relative to the selected month
- Auto-generated insights: trend vs last month, top category, savings rate, projected monthly spend (current month only)

### Data Portability
- **Export to CSV** — all transactions including recurring field
- **Import from CSV** — re-import a previously exported file; validates rows, matches categories by name
- **Export to JSON** — full backup: transactions, categories, budgets, settings, and wallets (v2 format)
- **Import from JSON** — restore a backup with `createdAt`-based dedup; handles v1 and v2 formats; refreshes all app state on completion

### Reliability
- **Offline banner** — shown when the device loses connectivity
- **Error toast** — DB failures surface as dismissible notifications
- **Toast actions** — undo delete uses an inline action button in the toast
- **Double-submit prevention** — save button disabled while write is in progress
- **Pull-to-refresh** on Month view (touch gesture, 70 px threshold)

### Keyboard shortcuts (desktop)
- `N` — open the add transaction modal
- `Esc` — close the modal or search overlay

### Multilingual
- Spanish, English, French — switchable from Settings
- Dates and number formatting follow the selected locale

### PWA
- Installable on mobile and desktop
- Works fully offline after first load (Service Worker + IndexedDB)
- No analytics, no tracking, no external requests at runtime

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

## Development

```bash
npm install
npx @angular/cli@19 serve
# → http://localhost:4200
```

## Build

```bash
npx @angular/cli@19 build
```

## Deploy

Every push to `main` triggers an automatic deployment to GitHub Pages via GitHub Actions.

To deploy manually:

```bash
npx @angular/cli@19 build --base-href=/expense-tracker/
npx angular-cli-ghpages --dir=dist/expense-tracker/browser
```
