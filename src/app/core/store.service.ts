import { Injectable, signal, computed } from '@angular/core';
import {
  Transaction, Category,
  addTransaction, updateTransaction, deleteTransaction,
  getAllCategories, addCategory, deleteCategory,
  getAllSettings, upsertSetting,
  getTransactionsByDate, getTransactionsByMonth, getTransactionsLast6Months, getAllTransactions,
} from './db';
import { today } from './utils';

@Injectable({ providedIn: 'root' })
export class StoreService {
  // ── Signals ───────────────────────────────────────────────────────────────

  readonly transactions = signal<Transaction[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly settings = signal<Record<string, unknown>>({});

  // Derived
  readonly currencySymbol = computed(() => (this.settings()['currencySymbol'] as string) ?? '€');
  readonly todayTransactions = computed(() =>
    this.transactions().filter(t => t.date === today()).sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt)
    )
  );
  readonly expenseCategories = computed(() =>
    this.categories().filter(c => c.type === 'expense' || c.type === 'both')
  );
  readonly incomeCategories = computed(() =>
    this.categories().filter(c => c.type === 'income' || c.type === 'both')
  );

  // ── Init ──────────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    const [txs, cats, settings] = await Promise.all([
      getTransactionsByDate(today()),
      getAllCategories(),
      getAllSettings(),
    ]);
    this.transactions.set(txs);
    this.categories.set(cats);
    this.settings.set(settings);
  }

  // ── Transactions ──────────────────────────────────────────────────────────

  async addTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Promise<void> {
    const createdAt = new Date().toISOString();
    const id = await addTransaction(data);
    const tx: Transaction = { ...data, id, createdAt };
    // Only keep in signal if it's today (today view is the cache)
    if (data.date === today()) {
      this.transactions.update(ts => [tx, ...ts]);
    }
  }

  async updateTransaction(id: number, data: Partial<Omit<Transaction, 'id'>>): Promise<void> {
    await updateTransaction(id, data);
    this.transactions.update(ts =>
      ts.map(t => (t.id === id ? { ...t, ...data } : t))
        .filter(t => t.date === today())
    );
  }

  async deleteTransaction(id: number): Promise<void> {
    await deleteTransaction(id);
    this.transactions.update(ts => ts.filter(t => t.id !== id));
  }

  // ── Categories ────────────────────────────────────────────────────────────

  async addCategory(data: Omit<Category, 'createdAt'>): Promise<void> {
    await addCategory(data);
    this.categories.update(cs => [...cs, { ...data, createdAt: new Date().toISOString() }]);
  }

  async deleteCategory(id: string): Promise<void> {
    await deleteCategory(id);
    this.categories.update(cs => cs.filter(c => c.id !== id));
  }

  getCategoryById(id: string): Category | undefined {
    return this.categories().find(c => c.id === id);
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  async updateSetting(key: string, value: unknown): Promise<void> {
    await upsertSetting(key, value);
    this.settings.update(s => ({ ...s, [key]: value }));
  }

  // ── Queries (not cached — call from views that need them) ─────────────────

  getTransactionsByMonth = getTransactionsByMonth;
  getTransactionsLast6Months = getTransactionsLast6Months;
  getAllTransactions = getAllTransactions;
}
