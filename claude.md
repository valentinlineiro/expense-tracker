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
│   │   ├── db.ts                  # Dexie schema (v2) + queries + AppBackup + JSON backup/restore
│   │   ├── store.service.ts       # Signal-based service — fuente de verdad
│   │   ├── toast.service.ts       # Toast global (show/error/showWithAction con auto-dismiss)
│   │   ├── localization.service.ts# Idioma activo + strings traducidos
│   │   ├── translations.ts        # Strings en todos los idiomas soportados
│   │   ├── locale-config.ts       # Locale activo para date-fns y Intl
│   │   └── utils.ts               # Formatters, helpers, PALETTE, EMOJI_PRESETS
│   ├── components/
│   │   ├── transaction-card/      # Swipe-to-delete, two-step desktop confirm, duplicate, edit tap
│   │   ├── transaction-modal/     # Bottom sheet: add/edit/duplicate, saving state, default category memory
│   │   ├── search-overlay/        # Full-screen search: note + category + amount, debounced 300ms
│   │   ├── category-badge/
│   │   └── amount-display/
│   ├── views/
│   │   ├── today/                 # Balance del día, lista, FAB, shortcut N, search toggle
│   │   ├── month/                 # Selector de mes, budgets, pull-to-refresh
│   │   ├── stats/                 # KPIs, YTD, gráficos, top categorías, insights, navegación de mes
│   │   └── settings/              # Moneda, idioma, categorías+emoji picker, CSV/JSON import/export
│   ├── app.component.ts           # Shell: balance global, offline banner, toast (con action button), nav
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
  icon:       string          // emoji (seleccionable desde EMOJI_PRESETS)
  color:      string          // hex (seleccionable desde PALETTE)
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
// Keys usadas: 'currency', 'currencySymbol', 'monthStartDay', 'language',
//              'lastExpenseCategoryId', 'lastIncomeCategoryId'
```

### AppBackup (JSON export/import)

```ts
interface AppBackup {
  version: 1;
  exportedAt: string;
  transactions: Transaction[];
  categories:   Category[];
  budgets:      Budget[];
  settings:     Setting[];
}
```

El import usa `bulkPut` para categories/settings/budgets y dedup por `createdAt` para transactions. Tras importar se llama `store.init()` para refrescar todos los signals.

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
5. **Soft delete no aplica** — las transacciones se borran definitivamente (con undo por toast).
6. **Moneda configurable** — nunca hardcodear `€` o `$`. Leer siempre de `store.currencySymbol()`.
7. **Strings localizados** — nunca hardcodear texto visible al usuario. Usar `localization.strings()`.
8. **Single quotes en `[style]="..."`** — el parser de Angular falla si el valor contiene comillas simples (e.g. `font-family:'DM Sans'`). Mover la lógica a un método del componente que devuelva el string completo.
9. **`Math` en templates** — Angular no expone globals JS en templates. Declarar `readonly Math = Math` en la clase del componente si se necesita `Math.abs()` etc.

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
- **Toast** — notificaciones con auto-dismiss via `ToastService`; soporta botón de acción inline (usado para undo delete)
- **Bottom nav** — Hoy / Mes / Stats / Ajustes

### Today view
- Balance del día (ingresos − gastos de hoy)
- Lista de transacciones de hoy, ordenadas por hora desc
- FAB (+) para agregar
- Shortcut `N` (teclado) para abrir modal; `Esc` para cerrar o cerrar búsqueda
- **Botón 🔍** — abre el `SearchOverlayComponent` de pantalla completa
- Undo delete: snapshot antes de borrar → `toast.showWithAction()` con callback que re-inserta

### Month view
- Selector de mes (← →)
- Resumen: ingresos / gastos / balance del mes
- Lista de transacciones agrupada por día con balance diario
- **Budget progress bars** — barra por categoría con límite mensual (naranja >80%, rojo >100%)
- **Pull-to-refresh** — gesture táctil (70px threshold) para recargar datos
- Undo delete con recarga del mes tras confirmar undo
- Duplicar transacción (output del card → modal con `duplicateFrom`)

### Stats view
- **Navegación de mes** — ‹ › para explorar meses pasados; todos los KPIs y gráficos reflejan el mes seleccionado
- **KPI cards** — tasa de ahorro, gasto medio/día (corregido para meses pasados), delta mes-anterior
- **YTD summary** — 4 tarjetas: ingresos YTD, gastos YTD, ahorro neto YTD, tasa de ahorro YTD
- **Doughnut** — gastos por categoría del mes seleccionado (título dinámico para meses pasados)
- **Bar chart** — ingresos vs gastos, ventana de 6 meses relativa al mes seleccionado
- **Top 3** — categorías con mayor gasto del mes
- **Perspectivas** — insights automáticos; proyección solo visible en el mes actual

### Search overlay (`search-overlay.component.ts`)
- Overlay a pantalla completa sobre el contenido
- Input de búsqueda con debounce de 300ms
- Filtra en memoria sobre `getAllTransactions()`: coincidencia en nota, nombre de categoría o importe
- Resultados agrupados por fecha en orden descendente
- Emite `edit` y `delete` hacia el padre (Today view); undo delete funciona igual

### Settings view
- Cambiar símbolo de moneda
- Cambiar idioma (ES / EN / FR)
- Gestión de categorías custom: add / delete (no editar las default)
  - **Emoji picker** — grid de `EMOJI_PRESETS` (~40 emojis) en lugar de input de texto libre
  - Color picker (paleta `PALETTE`)
- **Presupuestos** — límite mensual por categoría de gasto
- **CSV export/import** — exporta/importa transacciones (incluye campo `recurring`)
- **JSON export** — descarga `AppBackup` completo (transacciones + categorías + presupuestos + settings)
- **JSON import** — parsea, valida `version === 1`, dedup por `createdAt`, recarga `store.init()`

### Transaction modal (bottom sheet)
- Importe — input numérico grande
- Toggle gasto / ingreso
- Selector de categoría (grid de iconos)
- Fecha (por defecto hoy, editable)
- Nota opcional
- Recurrencia — ninguna / diaria / semanal / mensual
- **Saving state** — botón deshabilitado durante el guardado, previene doble-submit
- **Haptic feedback** — `navigator.vibrate(10)` al guardar, `(30)` al borrar con swipe
- **Duplicar** — acepta input `duplicateFrom`; pre-rellena campos con fecha=hoy y recurring=none
- **Default category memory** — `ensureCategory` effect lee `settings['lastExpense/IncomeCategoryId']`; tras guardar, persiste la categoría usada

### Transaction card
- Swipe-to-delete en mobile (threshold 80px, haptic 30ms)
- **Long-press** en mobile (600ms) para duplicar (haptic 50ms)
- **Two-step delete en desktop** — primer click arma (botón rojo "¿Confirmar?"), segundo confirma; se desarma solo tras 2.5s o click fuera
- **Botón ⧉** en desktop para duplicar (oculto en touch)
- Label de recurrencia (↻ Diario/Semanal/Mensual)

---

## ToastService

```ts
show(text, duration?)            // neutral, auto-dismiss
error(text, duration?)           // rojo, auto-dismiss
showWithAction(text, label, cb, duration?)  // con botón de acción inline
dismiss()                        // cierra inmediatamente
```

El timer anterior se cancela en cada nueva llamada. `AppComponent.onToastAction()` llama al callback y hace `dismiss()`.

---

## Convenciones de código

- **Archivos**: kebab-case — `transaction-modal.component.ts`
- **Clases**: PascalCase — `TransactionModalComponent`
- **Funciones de DB**: prefijo descriptivo — `getTransactionsByMonth`, `addTransaction`
- **Formatters en utils.ts**: `fmtAmount(amount, symbol)`, `fmtDate(date)`, `fmtMonth(y, m)`
- **Colores**: paleta fija en `utils.ts → PALETTE`
- **Emojis**: lista fija en `utils.ts → EMOJI_PRESETS`
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
