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
import { today, toDateStr } from './utils';

@Injectable({ providedIn: 'root' })
export class StoreService {
  // ── Signals ───────────────────────────────────────────────────────────────

  readonly transactions = signal<Transaction[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly settings = signal<Record<string, unknown>>({});
  readonly budgets = signal<Budget[]>([]);
  readonly netBalance = signal(0);

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

  private recurringTimer?: ReturnType<typeof setTimeout>;

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

    await this.refreshNetBalance();
    await this.checkRecurring();
    this.scheduleRecurringCheck();
  }

  // ── Recurring auto-create ─────────────────────────────────────────────────

  private async checkRecurring(): Promise<void> {
    const recurring = await getRecurringTransactions();
    if (!recurring.length) return;

    const templates = new Map<string, Transaction>();
    for (const tx of recurring) {
      const key = `${tx.type}|${tx.categoryId}|${tx.amount}|${tx.recurring}`;
      const existing = templates.get(key);
      if (!existing || tx.date > existing.date) templates.set(key, tx);
    }

    const todayDate = new Date(today());

    for (const template of templates.values()) {
      const dueDates = this.getDueDates(template, todayDate);
      for (const date of dueDates) {
        await this.addTransaction({
          amount: template.amount,
          type: template.type,
          categoryId: template.categoryId,
          note: template.note,
          date,
          recurring: template.recurring as RecurringInterval,
        });
      }
    }
  }

  private getDueDates(template: Transaction, todayDate: Date): string[] {
    if (template.recurring === 'none') return [];
    const dates: string[] = [];
    let cursor = this.addInterval(new Date(template.date), template.recurring);
    while (cursor <= todayDate) {
      dates.push(toDateStr(cursor));
      cursor = this.addInterval(cursor, template.recurring);
    }
    return dates;
  }

  private addInterval(date: Date, interval: RecurringInterval): Date {
    const next = new Date(date);
    switch (interval) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly': {
        const day = date.getDate();
        next.setDate(1);
        next.setMonth(next.getMonth() + 1);
        const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(day, lastDay));
        break;
      }
    }
    return next;
  }

  private scheduleRecurringCheck(): void {
    if (typeof window === 'undefined') return;
    if (this.recurringTimer) clearTimeout(this.recurringTimer);
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 10, 0);
    const delay = next.getTime() - now.getTime();
    this.recurringTimer = window.setTimeout(() => {
      void this.checkRecurring().finally(() => this.scheduleRecurringCheck());
    }, delay);
  }

  // ── Transactions ──────────────────────────────────────────────────────────

  async addTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Promise<void> {
    const createdAt = new Date().toISOString();
    const id = await addTransaction(data);
    const tx: Transaction = { ...data, id, createdAt };
    if (data.date === today()) {
      this.transactions.update(ts => [tx, ...ts]);
    }
    await this.refreshNetBalance();
  }

  async updateTransaction(id: number, data: Partial<Omit<Transaction, 'id'>>): Promise<void> {
    await updateTransaction(id, data);
    this.transactions.update(ts =>
      ts.map(t => (t.id === id ? { ...t, ...data } : t))
        .filter(t => t.date === today())
    );
    await this.refreshNetBalance();
  }

  async deleteTransaction(id: number): Promise<void> {
    await deleteTransaction(id);
    this.transactions.update(ts => ts.filter(t => t.id !== id));
    await this.refreshNetBalance();
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

  private async refreshNetBalance(): Promise<void> {
    const txs = await getAllTransactions();
    this.netBalance.set(this.calculateBalance(txs));
  }

  private calculateBalance(transactions: Transaction[]): number {
    return transactions.reduce((sum, tx) => {
      return sum + (tx.type === 'income' ? tx.amount : -tx.amount);
    }, 0);
  }
}
