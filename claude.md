# Expense Tracker — CLAUDE.md

## Contexto del proyecto

App de tracking de gastos personales. PWA-first, offline-only, sin cuenta, sin backend.
Parte de una suite de utilidades personales construidas con el mismo stack.

El principio rector es **privacidad por defecto**: todos los datos viven en IndexedDB local.
Nunca se envían datos a ningún servidor externo.

---

## Stack

| Capa | Elección |
|---|---|
| Framework | Angular 19 (standalone components, Signals) |
| Estilos | Tailwind CSS (utilidades) + inline styles para componentes críticos |
| Storage | Dexie.js (IndexedDB wrapper) |
| Estado global | Angular Signals + Services (sin NgRx) |
| Fechas | date-fns con locale `es` |
| PWA | @angular/pwa + Workbox |
| Gráficos | Chart.js (standalone, sin wrapper) |
| Deploy | GitHub Pages via `angular-cli-ghpages` |

---

## Deploy — GitHub Pages

```bash
# Build + deploy en un paso
ng deploy --base-href=/expense-tracker/

# O manualmente:
ng build --base-href=/expense-tracker/
npx angular-cli-ghpages --dir=dist/expense-tracker/browser
```

- El repositorio debe tener GitHub Pages habilitado en la rama `gh-pages`
- `base-href` debe coincidir con el nombre del repo (`/expense-tracker/`)
- Configurar en `angular.json` bajo `deploy` target para no tener que pasarlo cada vez

---

## Estructura de carpetas

```
src/
├── app/
│   ├── core/
│   │   ├── db.ts              # Dexie schema + queries
│   │   ├── store.service.ts   # Signal-based service (fuente de verdad en memoria)
│   │   └── utils.ts           # Formatters, helpers, constantes
│   ├── components/
│   │   ├── transaction-card/
│   │   ├── transaction-modal/  # Add / Edit (bottom sheet)
│   │   ├── category-badge/
│   │   └── amount-display/
│   ├── views/
│   │   ├── today/             # Vista principal — gastos del día
│   │   ├── month/             # Lista por mes + resumen
│   │   ├── stats/             # Gráfico por categoría + tendencias
│   │   └── settings/          # Moneda, categorías, exportar CSV
│   ├── app.component.ts       # Shell + bottom nav
│   ├── app.routes.ts
│   └── app.config.ts
├── index.html
├── main.ts
└── styles.css
```

Cada carpeta dentro de `components/` y `views/` contiene un único standalone component:
```
transaction-modal/
├── transaction-modal.component.ts
├── transaction-modal.component.html
└── transaction-modal.component.css   # solo si los estilos son muy extensos
```

---

## Modelo de datos (IndexedDB via Dexie)

```ts
// db.version(1)
transactions: {
  id,           // autoincrement
  amount,       // number — siempre positivo
  type,         // 'expense' | 'income'
  categoryId,   // string — ref a categories
  note,         // string — opcional
  date,         // 'YYYY-MM-DD'
  createdAt     // ISO string
}

categories: {
  id,           // string — slug generado
  name,         // string
  icon,         // emoji — una sola letra/emoji
  color,        // hex
  type,         // 'expense' | 'income' | 'both'
  isDefault,    // boolean — las default no se pueden borrar
  createdAt
}

settings: {
  key,          // string — PK
  value         // any
}
// Keys usados: 'currency', 'currencySymbol', 'monthStartDay'
```

### Categorías default (precargadas al primer boot)

Gastos: Comida 🍔, Transporte 🚗, Casa 🏠, Salud 💊, Ocio 🎬, Ropa 👕, Otros 📦
Ingresos: Salario 💼, Freelance 💻, Otros ➕

---

## Reglas de arquitectura

1. **Dexie como única fuente de verdad** — el `StoreService` mantiene signals en memoria como cache. Al modificar DB, actualizar el signal en la misma operación.
2. **Signals, no Observables** — usar `signal()`, `computed()`, `effect()` de Angular. Evitar RxJS salvo para operaciones inherentemente asíncronas de bajo nivel.
3. **Standalone components únicamente** — sin NgModules. Cada componente declara sus propios imports.
4. **Sin prop drilling** — cualquier dato que necesiten 2+ componentes va al `StoreService` vía inject.
5. **Upsert, nunca create/update separados** — para transacciones y settings.
6. **Soft delete no aplica aquí** — las transacciones se borran definitivamente.
7. **Moneda configurable** — nunca hardcodear `€` o `$`. Leer siempre de `settings.currencySymbol`.

---

## Convenciones de código

- **Archivos**: kebab-case para todo (Angular convention) — `transaction-modal.component.ts`
- **Clases**: PascalCase — `TransactionModalComponent`
- **Funciones de DB**: prefijo descriptivo — `getTransactionsByMonth`, `addTransaction`, `deleteTransaction`
- **Formatters en utils.ts**: `fmtAmount(amount, symbol)`, `fmtDate(date)`, `fmtMonth(date)`
- **Colores**: paleta fija en `utils.ts → PALETTE`
- **Fechas**: siempre `'YYYY-MM-DD'` como string en DB. Nunca objetos Date en storage.
- **Amounts**: siempre número positivo en DB. El `type` ('expense'|'income') determina el signo al mostrar.

---

## StoreService — patrón de signals

```ts
@Injectable({ providedIn: 'root' })
export class StoreService {
  private db = new AppDb();

  // Signals (cache en memoria)
  transactions = signal<Transaction[]>([]);
  categories = signal<Category[]>([]);
  settings = signal<Record<string, any>>({});

  // Computed
  todayTransactions = computed(() =>
    this.transactions().filter(t => t.date === today())
  );

  async init() {
    // Cargar todo desde Dexie al arrancar
  }

  async addTransaction(data: Omit<Transaction, 'id' | 'createdAt'>) {
    const id = await this.db.transactions.add({ ...data, createdAt: new Date().toISOString() });
    this.transactions.update(ts => [...ts, { ...data, id }]);
  }
}
```

---

## Diseño y UX

**Estética**: dark theme (#070707 background).
Tipografías: Syne (headings), JetBrains Mono (números/importes), DM Sans (body).

**Vista principal (TodayView)**:
- Balance del día (ingresos - gastos)
- Lista de transacciones de hoy, ordenadas por hora descendente
- FAB (+) para agregar rápido

**MonthView**:
- Selector de mes (← →)
- Resumen: total ingresos / total gastos / balance
- Lista agrupada por día, colapsable

**StatsView**:
- Gráfico de dona (Chart.js Doughnut) por categoría — solo gastos
- Barra de tendencia mensual — últimos 6 meses
- Top 3 categorías del mes

**SettingsView**:
- Selector de moneda (símbolo libre)
- Gestión de categorías custom (add/delete, no editar las default)
- Exportar todo a CSV
- Botón "Borrar todos los datos" con confirmación doble

**TransactionModal** (bottom sheet):
- Amount — input numérico grande, prominente
- Type toggle — gasto / ingreso
- Category picker — grid de iconos
- Date — por defecto hoy, editable
- Note — campo opcional

---

## Comportamiento offline / PWA

- Service Worker con estrategia `CacheFirst` para assets estáticos (`@angular/pwa`)
- Todos los datos en IndexedDB — funciona 100% sin conexión
- `ngsw-config.json` configurado para cachear todos los assets del build
- Manifest con `display: standalone`, `theme_color: #070707`
- Sin analytics, sin tracking, sin llamadas externas en runtime
- GitHub Pages sirve estáticos — compatible sin necesidad de servidor

---

## Lo que NO hacer

- ❌ No llamar a APIs externas de ningún tipo
- ❌ No usar `localStorage` para datos de usuario — solo Dexie/IndexedDB
- ❌ No agregar autenticación ni cuentas de usuario
- ❌ No agregar notificaciones en el MVP
- ❌ No usar librerías de UI (Angular Material, PrimeNG, etc.) — styles inline + Tailwind únicamente
- ❌ No usar NgModules — standalone components only
- ❌ No usar RxJS donde un signal es suficiente
- ❌ No sobrecomplicar: si algo se puede hacer en el cliente con 10 líneas, no crear abstracción

---

## Orden de implementación sugerido

1. `ng new expense-tracker --standalone --routing --style=css` + instalar dependencias
2. `core/db.ts` — schema Dexie + seed de categorías default
3. `core/utils.ts` — formatters y constantes
4. `core/store.service.ts` — signals + CRUD transactions + CRUD categories
5. `components/transaction-modal/` — el componente más crítico
6. `views/today/` — vista principal funcional
7. `views/month/`
8. `views/stats/` — Chart.js aquí
9. `views/settings/` — exportar CSV al final
10. `app.component.ts` — shell + bottom nav + routing
11. PWA config (`ng add @angular/pwa`) — lo último, cuando la app ya funciona
12. Deploy config (`ng add angular-cli-ghpages`) + ajustar `base-href`
