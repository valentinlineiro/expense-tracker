import { Component, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { StoreService } from '../../core/store.service';
import { Transaction } from '../../core/db';
import { fmtAmount, fmtMonth, fmtDateShort, currentYearMonth } from '../../core/utils';
import { TransactionModalComponent } from '../../components/transaction-modal/transaction-modal.component';
import { TransactionCardComponent } from '../../components/transaction-card/transaction-card.component';
import { LocalizationService } from '../../core/localization.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-month',
  standalone: true,
  imports: [TransactionModalComponent, TransactionCardComponent],
  template: `
    <!-- Pull-to-refresh indicator -->
    @if (pulling()) {
      <div style="text-align:center;padding:14px;color:var(--text-muted);font-size:13px;">
        {{ pullReady() ? localization.strings().month.pull.ready : localization.strings().month.pull.pulling }}
      </div>
    }
    <div style="padding:20px 16px 100px;">
      <!-- Month selector -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
        <button (click)="prevMonth()" style="background:var(--surface);border:none;color:var(--text);width:38px;height:38px;border-radius:10px;font-size:18px;cursor:pointer;">‹</button>
        <h1 style="font-size:20px;text-transform:capitalize;">{{ fmtMonth(year(), month()) }}</h1>
        <button
          (click)="nextMonth()"
          [disabled]="isCurrentMonth()"
          [style]="'background:var(--surface);border:none;color:' + (isCurrentMonth() ? 'var(--border)' : 'var(--text)') + ';width:38px;height:38px;border-radius:10px;font-size:18px;cursor:pointer;'"
        >›</button>
      </div>

      <!-- Summary -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:28px;">
        <div style="background:var(--surface);border-radius:12px;padding:14px;text-align:center;">
          <p style="color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.06em;margin:0 0 4px;">{{ localization.strings().month.summary.income }}</p>
          <div class="mono" style="color:var(--income);font-size:15px;font-weight:600;">+{{ fmtAmount(totalIncome(), store.currencySymbol()) }}</div>
        </div>
        <div style="background:var(--surface);border-radius:12px;padding:14px;text-align:center;">
          <p style="color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.06em;margin:0 0 4px;">{{ localization.strings().month.summary.expense }}</p>
          <div class="mono" style="color:var(--expense);font-size:15px;font-weight:600;">−{{ fmtAmount(totalExpense(), store.currencySymbol()) }}</div>
        </div>
        <div style="background:var(--surface);border-radius:12px;padding:14px;text-align:center;">
          <p style="color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.06em;margin:0 0 4px;">{{ localization.strings().month.summary.balance }}</p>
          <div class="mono" [style]="'font-size:15px;font-weight:600;color:' + (balance() >= 0 ? 'var(--income)' : 'var(--expense)') + ';'">
            {{ balance() >= 0 ? '+' : '' }}{{ fmtAmount(balance(), store.currencySymbol()) }}
          </div>
        </div>
      </div>

      <!-- Budget progress bars -->
      @if (!loading() && budgetRows().length > 0) {
        <div style="background:var(--surface);border-radius:16px;padding:16px 20px;margin-bottom:20px;">
          <p style="color:var(--text-muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 14px;">{{ localization.strings().month.budgetsTitle }}</p>
          @for (row of budgetRows(); track row.categoryId) {
            <div style="margin-bottom:12px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                <span style="font-size:13px;">{{ row.icon }} {{ row.name }}</span>
                <span class="mono" [style]="'font-size:12px;color:' + (row.pct >= 100 ? 'var(--expense)' : row.pct >= 80 ? '#ffd166' : 'var(--text-muted)') + ';'">
                  {{ fmtAmount(row.spent, store.currencySymbol()) }} / {{ fmtAmount(row.limit, store.currencySymbol()) }}
                </span>
              </div>
              <div style="height:6px;background:var(--surface2);border-radius:3px;overflow:hidden;">
                <div [style]="'height:100%;border-radius:3px;width:' + row.barPct + '%;background:' + (row.pct >= 100 ? 'var(--expense)' : row.pct >= 80 ? '#ffd166' : 'var(--accent)') + ';transition:width 0.3s;'"></div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Loading -->
      @if (loading()) {
      <div style="text-align:center;padding:40px;color:var(--text-muted);">{{ localization.strings().month.loading }}</div>
      }

      <!-- Groups by day -->
      @if (!loading() && groupedByDay().length === 0) {
        <div style="text-align:center;padding:60px 20px;color:var(--text-muted);">
          <div style="font-size:48px;margin-bottom:12px;">📅</div>
          <p style="margin:0;">{{ localization.strings().month.empty }}</p>
        </div>
      }

      @for (group of groupedByDay(); track group.date) {
        <div style="margin-bottom:20px;">
          <!-- Day header -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:13px;color:var(--text-muted);text-transform:capitalize;">{{ fmtDateShort(group.date) }}</span>
            <span class="mono" [style]="'font-size:13px;color:' + (group.dayBalance >= 0 ? 'var(--income)' : 'var(--expense)') + ';'">
              {{ group.dayBalance >= 0 ? '+' : '' }}{{ fmtAmount(group.dayBalance, store.currencySymbol()) }}
            </span>
          </div>
          @for (tx of group.transactions; track tx.id) {
            <div style="margin-bottom:8px;">
              <app-transaction-card
                [tx]="tx"
                (edit)="openEdit($event)"
                (delete)="onDelete($event)"
                (duplicate)="onDuplicate($event)"
              />
            </div>
          }
        </div>
      }
    </div>

    @if (showModal()) {
      <app-transaction-modal
        [editTx]="editingTx()"
        [duplicateFrom]="duplicatingTx()"
        (close)="closeModal()"
        (saved)="onSaved()"
      />
    }
  `,
})
export class MonthComponent implements OnInit {
  readonly store = inject(StoreService);
  readonly fmtAmount = fmtAmount;
  readonly fmtMonth = fmtMonth;
  readonly fmtDateShort = fmtDateShort;
  readonly localization = inject(LocalizationService);
  private readonly toast = inject(ToastService);

  year = signal(currentYearMonth().year);
  month = signal(currentYearMonth().month);
  transactions = signal<Transaction[]>([]);
  loading = signal(false);

  showModal = signal(false);
  editingTx = signal<Transaction | null>(null);
  duplicatingTx = signal<Transaction | null>(null);

  pulling = signal(false);
  pullReady = signal(false);
  private pullStartY = 0;
  private readonly PULL_THRESHOLD = 70;

  totalExpense = computed(() =>
    this.transactions().filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  );
  totalIncome = computed(() =>
    this.transactions().filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  );
  balance = computed(() => this.totalIncome() - this.totalExpense());

  groupedByDay = computed(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of this.transactions()) {
      const list = map.get(tx.date) ?? [];
      list.push(tx);
      map.set(tx.date, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, txs]) => ({
        date,
        transactions: txs,
        dayBalance: txs.reduce((s, t) => t.type === 'income' ? s + t.amount : s - t.amount, 0),
      }));
  });

  budgetRows = computed(() => {
    const budgetMap = this.store.budgetMap();
    if (budgetMap.size === 0) return [];
    const spentMap = new Map<string, number>();
    for (const tx of this.transactions()) {
      if (tx.type === 'expense') {
        spentMap.set(tx.categoryId, (spentMap.get(tx.categoryId) ?? 0) + tx.amount);
      }
    }
    return Array.from(budgetMap.entries()).map(([categoryId, limit]) => {
      const cat = this.store.getCategoryById(categoryId);
      const spent = spentMap.get(categoryId) ?? 0;
      const pct = limit > 0 ? (spent / limit) * 100 : 0;
      return {
        categoryId,
        name: cat?.name ?? categoryId,
        icon: cat?.icon ?? '📦',
        spent,
        limit,
        pct,
        barPct: Math.min(100, pct),
      };
    });
  });

  isCurrentMonth = computed(() => {
    const now = currentYearMonth();
    return this.year() === now.year && this.month() === now.month;
  });

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    const txs = await this.store.getTransactionsByMonth(this.year(), this.month());
    this.transactions.set(txs);
    this.loading.set(false);
  }

  prevMonth(): void {
    if (this.month() === 1) {
      this.year.update(y => y - 1);
      this.month.set(12);
    } else {
      this.month.update(m => m - 1);
    }
    this.load();
  }

  nextMonth(): void {
    if (this.isCurrentMonth()) return;
    if (this.month() === 12) {
      this.year.update(y => y + 1);
      this.month.set(1);
    } else {
      this.month.update(m => m + 1);
    }
    this.load();
  }

  openEdit(tx: Transaction): void {
    this.editingTx.set(tx);
    this.showModal.set(true);
  }

  onDuplicate(tx: Transaction): void {
    this.duplicatingTx.set(tx);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingTx.set(null);
    this.duplicatingTx.set(null);
  }

  async onSaved(): Promise<void> {
    await this.load();
  }

  async onDelete(id: number): Promise<void> {
    const snapshot = this.transactions().find(t => t.id === id);
    await this.store.deleteTransaction(id);
    await this.load();
    if (snapshot) {
      const strings = this.localization.strings().toast;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, createdAt: _ca, ...txData } = snapshot;
      this.toast.showWithAction(strings.undoDelete, strings.undo, async () => {
        await this.store.addTransaction(txData);
        await this.load();
      });
    }
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(e: TouchEvent): void {
    if (window.scrollY === 0) {
      this.pullStartY = e.touches[0].clientY;
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(e: TouchEvent): void {
    if (!this.pullStartY) return;
    const dy = e.touches[0].clientY - this.pullStartY;
    if (dy > 10 && window.scrollY === 0) {
      this.pulling.set(true);
      this.pullReady.set(dy >= this.PULL_THRESHOLD);
    } else {
      this.pulling.set(false);
      this.pullReady.set(false);
    }
  }

  @HostListener('touchend')
  onTouchEnd(): void {
    if (this.pullReady()) {
      this.load();
    }
    this.pulling.set(false);
    this.pullReady.set(false);
    this.pullStartY = 0;
  }
}
