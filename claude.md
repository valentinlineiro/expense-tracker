# Expense Tracker — CLAUDE.md

## Contexto del proyecto

App de tracking de gastos personales. PWA-first, offline-only, sin cuenta, sin backend.
El principio rector es **privacidad por defecto**: todos los datos viven en IndexedDB local.
Nunca se envían datos a ningún servidor externo.

---

## Stack

| Capa | Elección |
|---|---|
| Framework | Angular 19 (standalone components, Signals) |
| Estilos | Tailwind CSS v4 + inline styles para componentes |
| Storage | Dexie.js (IndexedDB wrapper) |
| Estado global | Angular Signals + Services (sin NgRx) |
| Fechas | date-fns con locale dinámico (`locale-config.ts`) |
| PWA | @angular/pwa + Workbox |
| Gráficos | Chart.js (standalone, sin wrapper) |
| Deploy | GitHub Pages via GitHub Actions (`deploy.yml`) |

---

## Deploy — GitHub Pages

Automático en cada push a `main` via GitHub Actions.

Para desplegar manualmente:
```bash
ng build --base-href=/expense-tracker/
npx angular-cli-ghpages --dir=dist/expense-tracker/browser
```

- `base-href` debe coincidir con el nombre del repo (`/expense-tracker/`)
- Habilitar GitHub Pages → Source → GitHub Actions en la configuración del repo

---

## Estructura de carpetas

```
src/
├── app/
│   ├── core/
│   │   ├── db.ts                  # Dexie schema (v2) + queries
│   │   ├── store.service.ts       # Signal-based service — fuente de verdad
│   │   ├── toast.service.ts       # Toast global (show/error con auto-dismiss)
│   │   ├── localization.service.ts# Idioma activo + strings traducidos
│   │   ├── translations.ts        # Strings en todos los idiomas soportados
│   │   ├── locale-config.ts       # Locale activo para date-fns y Intl
│   │   └── utils.ts               # Formatters, helpers, PALETTE
│   ├── components/
│   │   ├── transaction-card/      # Swipe-to-delete, edit tap, recurring label
│   │   ├── transaction-modal/     # Bottom sheet: add/edit, saving state
│   │   ├── category-badge/
│   │   └── amount-display/
│   ├── views/
│   │   ├── today/                 # Balance del día, lista, FAB, shortcut N
│   │   ├── month/                 # Selector de mes, budgets, pull-to-refresh
│   │   ├── stats/                 # KPIs, gráficos, top categorías, insights
│   │   └── settings/              # Moneda, idioma, categorías, CSV import/export
│   ├── app.component.ts           # Shell: balance global, offline banner, toast, nav
│   ├── app.routes.ts
│   └── app.config.ts
├── index.html
├── main.ts
└── styles.css
```

---

## Modelo de datos (IndexedDB via Dexie)

### Schema actual — versión 2

```ts
Transaction {
  id?:        number          // autoincrement
  amount:     number          // siempre positivo
  type:       'expense' | 'income'
  categoryId: string          // ref a categories
  note:       string
  date:       string          // 'YYYY-MM-DD'
  createdAt:  string          // ISO string
  recurring:  'none' | 'daily' | 'weekly' | 'monthly'
}

Category {
  id:         string          // slug generado
  name:       string
  icon:       string          // emoji
  color:      string          // hex
  type:       'expense' | 'income' | 'both'
  isDefault:  boolean
  createdAt:  string
}

Budget {
  categoryId:   string        // PK — uno por categoría
  monthlyLimit: number
}

Setting {
  key:   string               // PK
  value: unknown
}
// Keys: 'currency', 'currencySymbol', 'monthStartDay', 'language'
```

### Migración v1 → v2
- Añade tabla `budgets`
- Backfill `recurring: 'none'` en transacciones existentes

### Categorías default (precargadas al primer boot)
Gastos: Comida 🍔, Transporte 🚗, Casa 🏠, Salud 💊, Ocio 🎬, Ropa 👕, Otros 📦
Ingresos: Salario 💼, Freelance 💻, Otros ➕

---

## Reglas de arquitectura

1. **Dexie como única fuente de verdad** — `StoreService` mantiene signals como cache. Al escribir en DB, actualizar el signal en la misma operación.
2. **Signals, no Observables** — usar `signal()`, `computed()`, `effect()`. Evitar RxJS.
3. **Standalone components únicamente** — sin NgModules. Cada componente declara sus propios imports.
4. **Sin prop drilling** — datos compartidos por 2+ componentes van al `StoreService`.
5. **Soft delete no aplica** — las transacciones se borran definitivamente.
6. **Moneda configurable** — nunca hardcodear `€` o `$`. Leer siempre de `store.currencySymbol()`.
7. **Strings localizados** — nunca hardcodear texto visible al usuario. Usar `localization.strings()`.
8. **Single quotes en `[style]="..."`** — el parser de Angular falla si el valor contiene comillas simples (e.g. `font-family:'DM Sans'`). Mover la lógica a un método del componente que devuelva el string.

---

## StoreService — señales principales

```ts
// Signals (cache en memoria, source of truth: Dexie)
transactions  = signal<Transaction[]>([]);   // solo las de hoy
categories    = signal<Category[]>([]);
settings      = signal<Record<string, unknown>>({});
budgets       = signal<Budget[]>([]);
netBalance    = signal<number>(0);           // suma histórica: ingresos - gastos

// Computed
currencySymbol      // de settings
todayTransactions   // filtrado + ordenado por hora desc
expenseCategories
incomeCategories
budgetMap           // Map<categoryId, monthlyLimit>
```

`refreshNetBalance()` se llama tras cada add/update/delete de transacción.

### Recurrentes
`checkRecurring()` se ejecuta al init y a las 00:00:10 cada día:
- Lee todas las transacciones con `recurring !== 'none'`
- Calcula instancias pendientes con `getDueDates()` usando `addInterval()`
- Crea las instancias que falten hasta hoy

---

## Funcionalidades implementadas

### App shell (`app.component.ts`)
- **Balance global** — tarjeta siempre visible con el saldo histórico total (income − expenses)
- **Offline banner** — banner rojo cuando `navigator.onLine === false`
- **Toast** — notificaciones dismissibles (neutral / error) via `ToastService`
- **Bottom nav** — Hoy / Mes / Stats / Ajustes

### Today view
- Balance del día (ingresos − gastos de hoy)
- Lista de transacciones de hoy, ordenadas por hora desc
- FAB (+) para agregar
- Shortcut `N` (teclado) para abrir modal; `Esc` para cerrar
- Swipe-to-delete en mobile; botón ✕ en desktop

### Month view
- Selector de mes (← →)
- Resumen: ingresos / gastos / balance del mes
- Lista de transacciones agrupada por día
- **Budget progress bars** — barra por categoría con límite mensual (naranja >80%, rojo >100%)
- **Pull-to-refresh** — gesture táctil (70px threshold) para recargar datos

### Stats view
- **KPI cards** — tasa de ahorro, gasto medio/día, delta mes-anterior
- **Doughnut** — gastos por categoría del mes actual
- **Bar chart** — ingresos vs gastos, últimos 6 meses (agrupado)
- **Top 3** — categorías con mayor gasto del mes
- **Perspectivas** — insights automáticos: MoM delta, top categoría, tasa ahorro, proyección de gasto

### Settings view
- Cambiar símbolo de moneda
- Cambiar idioma (ES / EN / FR — extensible via `translations.ts`)
- Gestión de categorías custom (add / delete, no editar las default)
- **Presupuestos** — límite mensual por categoría de gasto
- **CSV export** — exporta todas las transacciones (incluye campo `recurring`)
- **CSV import** — importa un CSV exportado desde la misma app; parsea comillas, valida filas

### Transaction modal (bottom sheet)
- Importe — input numérico grande
- Toggle gasto / ingreso
- Selector de categoría (grid de iconos)
- Fecha (por defecto hoy, editable)
- Nota opcional
- Recurrencia — ninguna / diaria / semanal / mensual
- **Saving state** — botón deshabilitado durante el guardado, previene doble-submit
- **Haptic feedback** — `navigator.vibrate(10)` al guardar, `(30)` al borrar con swipe

---

## Convenciones de código

- **Archivos**: kebab-case — `transaction-modal.component.ts`
- **Clases**: PascalCase — `TransactionModalComponent`
- **Funciones de DB**: prefijo descriptivo — `getTransactionsByMonth`, `addTransaction`
- **Formatters en utils.ts**: `fmtAmount(amount, symbol)`, `fmtDate(date)`, `fmtMonth(y, m)`
- **Colores**: paleta fija en `utils.ts → PALETTE`
- **Fechas**: siempre `'YYYY-MM-DD'` como string en DB. Nunca objetos Date en storage.
- **Amounts**: siempre número positivo en DB. El `type` determina el signo al mostrar.

---

## Diseño y UX

**Estética**: dark theme, `--bg: #070707`.
**Tipografías**: Syne (headings), JetBrains Mono (números/importes), DM Sans (body).
**CSS variables**: `--bg`, `--surface`, `--surface2`, `--border`, `--text`, `--text-muted`, `--accent`, `--expense`, `--income`.

---

## Comportamiento offline / PWA

- Service Worker con estrategia `CacheFirst` para assets estáticos (`@angular/pwa`)
- Todos los datos en IndexedDB — funciona 100% sin conexión
- Manifest con `display: standalone`, `theme_color: #070707`, `name: "Gastos"`
- Banner en UI cuando el dispositivo pierde conexión
- Sin analytics, sin tracking, sin llamadas externas en runtime

---

## Lo que NO hacer

- ❌ No llamar a APIs externas de ningún tipo
- ❌ No usar `localStorage` para datos de usuario — solo Dexie/IndexedDB
- ❌ No agregar autenticación ni cuentas de usuario
- ❌ No usar librerías de UI (Angular Material, PrimeNG, etc.) — styles inline + Tailwind únicamente
- ❌ No usar NgModules — standalone components only
- ❌ No usar RxJS donde un signal es suficiente
- ❌ No sobrecomplicar: si algo se puede hacer en el cliente con 10 líneas, no crear abstracción
- ❌ No hardcodear texto visible — usar siempre `localization.strings()`
- ❌ No hardcodear el símbolo de moneda — usar siempre `store.currencySymbol()`
