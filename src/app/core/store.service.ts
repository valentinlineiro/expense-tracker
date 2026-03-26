import { Injectable, signal, computed } from '@angular/core';
import {
  Transaction, Category, Budget, RecurringInterval,
  addTransaction, updateTransaction, deleteTransaction,
  getAllCategories, addCategory, deleteCategory,
  getAllSettings, upsertSetting,
  getAllBudgets, upsertBudget, deleteBudget,
  getTransactionsByDate, getTransactionsByMonth, getTransactionsLast6Months, getAllTransactions,
  getRecurringTransactions,
} from './db';
import { today } from './utils';

@Injectable({ providedIn: 'root' })
export class StoreService {
  // ── Signals ───────────────────────────────────────────────────────────────

  readonly transactions = signal<Transaction[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly settings = signal<Record<string, unknown>>({});
  readonly budgets = signal<Budget[]>([]);

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
  readonly budgetMap = computed(() =>
    new Map(this.budgets().map(b => [b.categoryId, b.monthlyLimit]))
  );

  // ── Init ──────────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    const [txs, cats, settings, budgets] = await Promise.all([
      getTransactionsByDate(today()),
      getAllCategories(),
      getAllSettings(),
      getAllBudgets(),
    ]);
    this.transactions.set(txs);
    this.categories.set(cats);
    this.settings.set(settings);
    this.budgets.set(budgets);

    await this.checkRecurring();
  }

  // ── Recurring auto-create ─────────────────────────────────────────────────

  private async checkRecurring(): Promise<void> {
    const todayStr = today();
    const recurring = await getRecurringTransactions();
    if (!recurring.length) return;

    // Group by template key — keep the most recent per unique recurring transaction
    const templates = new Map<string, Transaction>();
    for (const tx of recurring) {
      const key = `${tx.type}|${tx.categoryId}|${tx.amount}|${tx.recurring}`;
      const existing = templates.get(key);
      if (!existing || tx.date > existing.date) templates.set(key, tx);
    }

    const todayDate = new Date(todayStr);

    for (const tx of templates.values()) {
      if (tx.date === todayStr) continue; // already have today's instance

      const due = this.isRecurringDue(new Date(tx.date), todayDate, tx.recurring as RecurringInterval);
      if (!due) continue;

      // Avoid duplicate if already created today
      const alreadyToday = recurring.some(t =>
        t.date === todayStr &&
        t.type === tx.type &&
        t.categoryId === tx.categoryId &&
        t.amount === tx.amount &&
        t.recurring === tx.recurring
      );
      if (alreadyToday) continue;

      await this.addTransaction({
        amount: tx.amount, type: tx.type, categoryId: tx.categoryId,
        note: tx.note, date: todayStr, recurring: tx.recurring as RecurringInterval,
      });
    }
  }

  private isRecurringDue(templateDate: Date, todayDate: Date, interval: RecurringInterval): boolean {
    switch (interval) {
      case 'daily':   return true;
      case 'weekly':  return templateDate.getDay() === todayDate.getDay();
      case 'monthly': return templateDate.getDate() === todayDate.getDate();
      default:        return false;
    }
  }

  // ── Transactions ──────────────────────────────────────────────────────────

  async addTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Promise<void> {
    const createdAt = new Date().toISOString();
    const id = await addTransaction(data);
    const tx: Transaction = { ...data, id, createdAt };
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

  // ── Budgets ───────────────────────────────────────────────────────────────

  async upsertBudget(categoryId: string, monthlyLimit: number): Promise<void> {
    await upsertBudget(categoryId, monthlyLimit);
    this.budgets.update(bs => {
      const rest = bs.filter(b => b.categoryId !== categoryId);
      return monthlyLimit > 0 ? [...rest, { categoryId, monthlyLimit }] : rest;
    });
  }

  async deleteBudget(categoryId: string): Promise<void> {
    await deleteBudget(categoryId);
    this.budgets.update(bs => bs.filter(b => b.categoryId !== categoryId));
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  async updateSetting(key: string, value: unknown): Promise<void> {
    await upsertSetting(key, value);
    this.settings.update(s => ({ ...s, [key]: value }));
  }

  // ── Queries (not cached) ──────────────────────────────────────────────────

  getTransactionsByMonth = getTransactionsByMonth;
  getTransactionsLast6Months = getTransactionsLast6Months;
  getAllTransactions = getAllTransactions;
}
