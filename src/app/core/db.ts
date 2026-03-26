import Dexie, { type Table } from 'dexie';

export interface Transaction {
  id?: number;
  amount: number;         // always positive
  type: 'expense' | 'income';
  categoryId: string;
  note: string;
  date: string;           // 'YYYY-MM-DD'
  createdAt: string;      // ISO string
}

export interface Category {
  id: string;             // slug
  name: string;
  icon: string;           // emoji
  color: string;          // hex
  type: 'expense' | 'income' | 'both';
  isDefault: boolean;
  createdAt: string;
}

export interface Setting {
  key: string;
  value: unknown;
}

const DEFAULT_CATEGORIES: Omit<Category, 'createdAt'>[] = [
  { id: 'food',       name: 'Comida',      icon: '🍔', color: '#ff6b35', type: 'expense', isDefault: true },
  { id: 'transport',  name: 'Transporte',  icon: '🚗', color: '#f7c59f', type: 'expense', isDefault: true },
  { id: 'home',       name: 'Casa',        icon: '🏠', color: '#efefd0', type: 'expense', isDefault: true },
  { id: 'health',     name: 'Salud',       icon: '💊', color: '#4ecdc4', type: 'expense', isDefault: true },
  { id: 'leisure',    name: 'Ocio',        icon: '🎬', color: '#7c6df0', type: 'expense', isDefault: true },
  { id: 'clothes',    name: 'Ropa',        icon: '👕', color: '#a8dadc', type: 'expense', isDefault: true },
  { id: 'other-exp',  name: 'Otros',       icon: '📦', color: '#6b6b6b', type: 'expense', isDefault: true },
  { id: 'salary',     name: 'Salario',     icon: '💼', color: '#4dff91', type: 'income',  isDefault: true },
  { id: 'freelance',  name: 'Freelance',   icon: '💻', color: '#00d4aa', type: 'income',  isDefault: true },
  { id: 'other-inc',  name: 'Otros',       icon: '➕', color: '#6b6b6b', type: 'income',  isDefault: true },
];

const DEFAULT_SETTINGS: Setting[] = [
  { key: 'currency', value: 'EUR' },
  { key: 'currencySymbol', value: '€' },
  { key: 'monthStartDay', value: 1 },
];

class AppDatabase extends Dexie {
  transactions!: Table<Transaction, number>;
  categories!: Table<Category, string>;
  settings!: Table<Setting, string>;

  constructor() {
    super('expense-tracker-db');

    this.version(1).stores({
      transactions: '++id, date, type, categoryId',
      categories: 'id, type',
      settings: 'key',
    });

    this.on('populate', async () => {
      const now = new Date().toISOString();
      await this.categories.bulkAdd(
        DEFAULT_CATEGORIES.map(c => ({ ...c, createdAt: now }))
      );
      await this.settings.bulkAdd(DEFAULT_SETTINGS);
    });
  }
}

export const db = new AppDatabase();

// ── Transactions ──────────────────────────────────────────────────────────────

export async function getTransactionsByDate(date: string): Promise<Transaction[]> {
  return db.transactions.where('date').equals(date).reverse().sortBy('createdAt');
}

export async function getTransactionsByMonth(year: number, month: number): Promise<Transaction[]> {
  const pad = (n: number) => String(n).padStart(2, '0');
  const prefix = `${year}-${pad(month)}`;
  return db.transactions.filter(t => t.date.startsWith(prefix)).reverse().sortBy('date');
}

export async function getTransactionsLast6Months(): Promise<Transaction[]> {
  const start = new Date();
  start.setMonth(start.getMonth() - 5);
  start.setDate(1);
  const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;
  return db.transactions.filter(t => t.date >= startStr).toArray();
}

export async function getAllTransactions(): Promise<Transaction[]> {
  return db.transactions.orderBy('date').reverse().toArray();
}

export async function addTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Promise<number> {
  return db.transactions.add({ ...data, createdAt: new Date().toISOString() });
}

export async function updateTransaction(id: number, data: Partial<Omit<Transaction, 'id'>>): Promise<void> {
  await db.transactions.update(id, data);
}

export async function deleteTransaction(id: number): Promise<void> {
  await db.transactions.delete(id);
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function getAllCategories(): Promise<Category[]> {
  return db.categories.toArray();
}

export async function addCategory(data: Omit<Category, 'createdAt'>): Promise<void> {
  await db.categories.add({ ...data, createdAt: new Date().toISOString() });
}

export async function deleteCategory(id: string): Promise<void> {
  await db.categories.delete(id);
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const row = await db.settings.get(key);
  return row?.value as T | undefined;
}

export async function upsertSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

export async function getAllSettings(): Promise<Record<string, unknown>> {
  const rows = await db.settings.toArray();
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}
