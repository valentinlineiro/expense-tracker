# Gastos

Personal expense tracker. Offline-first, no account, no backend — all data lives on your device.

## Features

### Core
- **Global balance** — all-time net balance (income − expenses) always visible at the top
- **Today view** — daily balance, transactions list, one-tap to add
- **Month view** — navigate any month, per-day grouping, income/expense summary
- **Stats** — spending doughnut, 6-month income vs expense trend, top categories, auto-generated insights
- **Settings** — currency symbol, language, custom categories, monthly budgets

### Transactions
- Add income or expense with amount, category, date, and optional note
- Edit any transaction by tapping it
- Delete by swiping left on mobile, or via the ✕ button on desktop
- **Recurring transactions** — mark as daily / weekly / monthly; instances auto-created on app load
- **Haptic feedback** on save and delete (Vibration API)

### Budgets
- Set a monthly spending limit per category in Settings
- Month view shows a progress bar per category — turns orange above 80%, red above 100%

### Statistics & insights
- KPI cards: savings rate, average daily spend, month-over-month delta
- Doughnut chart: expenses by category for the current month
- Bar chart: income vs expenses for the last 6 months
- Auto-generated insights: trend vs last month, top category, savings rate, projected monthly spend

### Data portability
- **Export to CSV** — all transactions including recurring field
- **Import from CSV** — re-import a previously exported file; validates rows, matches categories by name

### Reliability
- **Offline banner** — shown when the device loses connectivity
- **Error toast** — DB failures surface as dismissible notifications
- **Double-submit prevention** — save button disabled while write is in progress
- **Pull-to-refresh** on Month view (touch gesture, 70 px threshold)

### Keyboard shortcuts (desktop)
- `N` — open the add transaction modal
- `Esc` — close the modal

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
