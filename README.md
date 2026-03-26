# Gastos

Personal expense tracker. Offline-first, no account, no backend — all data lives on your device.

## Features

- **Today view** — daily balance at a glance, add transactions with one tap
- **Month view** — navigate months, transactions grouped by day with per-day balances
- **Stats** — spending by category (doughnut chart) and 6-month trend (bar chart)
- **Settings** — custom currency symbol, add/delete categories, export all data to CSV
- **PWA** — installable, works fully offline after first load
- **Privacy by default** — zero network requests, zero analytics, zero tracking

## Stack

| Layer | Choice |
|---|---|
| Framework | Angular 19 (standalone components, Signals) |
| Storage | Dexie.js (IndexedDB) |
| Charts | Chart.js |
| Styles | Tailwind CSS v4 + inline styles |
| PWA | @angular/pwa |
| Deploy | GitHub Pages |

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

Deployments to GitHub Pages are automatic on every push to `main` via GitHub Actions.

To deploy manually:

```bash
npx @angular/cli@19 deploy
```
