import { Component, inject, input, output, signal, computed, effect, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/store.service';
import { ToastService } from '../../core/toast.service';
import { Transaction, Category, RecurringInterval, Wallet } from '../../core/db';
import { today } from '../../core/utils';
import { LocalizationService } from '../../core/localization.service';

@Component({
  selector: 'app-transaction-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <!-- Backdrop -->
    <div
      style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:100;display:flex;align-items:flex-end;"
      (click)="onBackdrop($event)"
    >
      <!-- Sheet -->
      <div style="
        background:var(--surface);
        width:100%;
        border-radius:20px 20px 0 0;
        padding:24px 20px 40px;
        max-height:90dvh;
        overflow-y:auto;
      " (click)="$event.stopPropagation()">

        <!-- Handle -->
        <div style="width:40px;height:4px;background:var(--border);border-radius:2px;margin:0 auto 20px;"></div>

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
          <h2 style="font-size:18px;">{{ editTx() ? localization.strings().transactionModal.editTitle : localization.strings().transactionModal.newTitle }}</h2>
          <button (click)="close.emit()" style="background:none;border:none;color:var(--text-muted);font-size:22px;cursor:pointer;padding:4px;">✕</button>
        </div>

        <!-- Type toggle -->
        <div style="display:flex;background:var(--surface2);border-radius:10px;padding:4px;margin-bottom:24px;">
          <button
            (click)="type.set('expense')"
            [style]="type() === 'expense' ? activeTypeStyle('expense') : inactiveTypeStyle"
          >{{ localization.strings().transactionModal.typeExpense }}</button>
          <button
            (click)="type.set('income')"
            [style]="type() === 'income' ? activeTypeStyle('income') : inactiveTypeStyle"
          >{{ localization.strings().transactionModal.typeIncome }}</button>
        </div>

        <!-- Amount -->
        <div style="text-align:center;margin-bottom:28px;">
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;">
            <span style="font-family:'Syne',sans-serif;font-size:32px;color:var(--text-muted);">{{ store.currencySymbol() }}</span>
            <input
              type="number"
              [ngModel]="amountStr()"
              (ngModelChange)="amountStr.set($event)"
              placeholder="0.00"
              min="0"
              step="0.01"
              style="
                font-family:'JetBrains Mono',monospace;
                font-size:40px;
                font-weight:600;
                background:none;
                border:none;
                color:var(--text);
                width:180px;
                text-align:center;
                outline:none;
              "
            >
          </div>
          <div style="height:2px;background:var(--border);margin:8px auto;max-width:240px;"></div>
        </div>

        <!-- Category picker -->
        <p style="color:var(--text-muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;">{{ localization.strings().transactionModal.category }}</p>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px;">
          @for (cat of visibleCategories(); track cat.id) {
            <button
              (click)="categoryId.set(cat.id)"
              [style]="categoryId() === cat.id ? selectedCatStyle(cat) : catStyle"
            >
              <div style="font-size:22px;">{{ cat.icon }}</div>
              <div style="font-size:11px;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ cat.name }}</div>
            </button>
          }
        </div>

        <!-- Date -->
        <p style="color:var(--text-muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">{{ localization.strings().transactionModal.date }}</p>
        <input
          type="date"
          [(ngModel)]="date"
          style="
            width:100%;
            background:var(--surface2);
            border:1px solid var(--border);
            border-radius:10px;
            padding:12px 16px;
            color:var(--text);
            font-family:'DM Sans',sans-serif;
            font-size:15px;
            margin-bottom:20px;
          "
        >

        <!-- Note -->
        <p style="color:var(--text-muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">{{ localization.strings().transactionModal.note }}</p>
        <input
          type="text"
          [(ngModel)]="note"
          placeholder="{{ localization.strings().transactionModal.notePlaceholder }}"
          maxlength="100"
          style="
            width:100%;
            background:var(--surface2);
            border:1px solid var(--border);
            border-radius:10px;
            padding:12px 16px;
            color:var(--text);
            font-family:'DM Sans',sans-serif;
            font-size:15px;
            margin-bottom:28px;
          "
        >

        <!-- Recurring -->
        <p style="color:var(--text-muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">{{ localization.strings().transactionModal.recurring }}</p>
        <div style="display:flex;gap:8px;margin-bottom:16px;">
          @for (opt of recurringOptions(); track opt.value) {
            <button
              (click)="recurring.set(opt.value)"
              [style]="recurringBtnStyle(opt.value)"
            >{{ opt.label }}</button>
          }
        </div>

        <!-- Recurring end date (only when repeating is active) -->
        @if (recurring() !== 'none') {
          <p style="color:var(--text-muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">{{ localization.strings().transactionModal.recurringEndDate }}</p>
          <input
            type="date"
            [(ngModel)]="recurringEndDate"
            style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px 16px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:15px;margin-bottom:16px;"
          >
        }

        <!-- Wallet selector (only when multiple wallets exist) -->
        @if (store.wallets().length > 1) {
          <p style="color:var(--text-muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">{{ localization.strings().transactionModal.wallet }}</p>
          <div style="display:flex;gap:8px;margin-bottom:20px;overflow-x:auto;padding-bottom:4px;">
            @for (w of store.wallets(); track w.id) {
              <button (click)="walletId.set(w.id!)" [style]="walletChipStyle(w)">
                <span>{{ w.icon }}</span>
                <span>{{ w.name }}</span>
              </button>
            }
          </div>
        }

        <!-- Spacer when no wallet selector shown -->
        @if (store.wallets().length <= 1 && recurring() === 'none') {
          <div style="margin-bottom:12px;"></div>
        }

        <!-- Save button -->
        <button
          (click)="save()"
          [disabled]="!canSave() || saving()"
          [style.opacity]="canSave() && !saving() ? 1 : 0.4"
          style="width:100%;padding:16px;border-radius:12px;border:none;font-family:'Syne',sans-serif;font-size:16px;font-weight:600;cursor:pointer;background:var(--accent);color:#fff;"
        >{{ saving() ? localization.strings().transactionModal.saving : (editTx() ? localization.strings().transactionModal.saveChanges : localization.strings().transactionModal.save) }}</button>
      </div>
    </div>
  `,
})
export class TransactionModalComponent implements OnInit {
  readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);
  readonly localization = inject(LocalizationService);

  // Input for editing an existing transaction (null = create new)
  editTx = input<Transaction | null>(null);
  // Input for duplicating a transaction (pre-fills fields, date = today, recurring = none)
  duplicateFrom = input<Transaction | null>(null);

  close = output<void>();
  saved = output<void>();

  saving = signal(false);
  type = signal<'expense' | 'income'>('expense');
  amountStr = signal('');
  categoryId = signal('');
  walletId = signal<number | null>(null);
  date = today();
  note = '';
  recurring = signal<RecurringInterval>('none');
  recurringEndDate = '';

  readonly recurringOptions = computed((): { value: RecurringInterval; label: string }[] => {
    const labels = this.localization.strings().transactionModal.recurringOptions;
    return [
      { value: 'none' as RecurringInterval, label: labels.none },
      { value: 'daily', label: labels.daily },
      { value: 'weekly', label: labels.weekly },
      { value: 'monthly', label: labels.monthly },
    ];
  });

  visibleCategories = computed(() =>
    this.type() === 'expense' ? this.store.expenseCategories() : this.store.incomeCategories()
  );

  readonly ensureCategory = effect(() => {
    const cats = this.visibleCategories();
    if (!cats.length) return;
    // If current categoryId is missing or not in the visible list, pick the saved default or first
    if (!this.categoryId() || !cats.find(c => c.id === this.categoryId())) {
      const key = this.type() === 'expense' ? 'lastExpenseCategoryId' : 'lastIncomeCategoryId';
      const saved = this.store.settings()[key] as string | undefined;
      const validSaved = saved && cats.find(c => c.id === saved);
      this.categoryId.set(validSaved ? saved : cats[0].id);
    }
  });

  canSave = computed(() => {
    const amt = parseFloat(this.amountStr());
    return !isNaN(amt) && amt > 0 && !!this.categoryId();
  });

  ngOnInit(): void {
    const tx = this.editTx();
    const src = this.duplicateFrom();
    if (tx) {
      this.type.set(tx.type);
      this.amountStr.set(String(tx.amount));
      this.categoryId.set(tx.categoryId);
      this.date = tx.date;
      this.note = tx.note;
      this.recurring.set(tx.recurring ?? 'none');
      this.recurringEndDate = tx.recurringEndDate ?? '';
      this.walletId.set(tx.walletId ?? this.defaultWalletId());
    } else if (src) {
      // Duplicate: copy fields but reset date to today and clear recurring
      this.type.set(src.type);
      this.amountStr.set(String(src.amount));
      this.categoryId.set(src.categoryId);
      this.date = today();
      this.note = src.note;
      this.recurring.set('none');
      this.walletId.set(src.walletId ?? this.defaultWalletId());
    } else {
      this.walletId.set(this.defaultWalletId());
    }
    // ensureCategory effect handles default selection using saved preference
  }

  private defaultWalletId(): number | null {
    const wallets = this.store.wallets();
    return wallets.length > 0 ? (wallets[0].id ?? null) : null;
  }

  async save(): Promise<void> {
    if (!this.canSave() || this.saving()) return;
    this.saving.set(true);
    try {
      const amount = parseFloat(this.amountStr());
      const wid = this.walletId();
      const endDate = this.recurringEndDate || undefined;
      const tx = this.editTx();
      if (tx?.id != null) {
        await this.store.updateTransaction(tx.id, {
          amount, type: this.type(), categoryId: this.categoryId(),
          date: this.date, note: this.note, recurring: this.recurring(),
          recurringEndDate: endDate,
          ...(wid !== null ? { walletId: wid } : {}),
        });
      } else {
        await this.store.addTransaction({
          amount, type: this.type(), categoryId: this.categoryId(),
          date: this.date, note: this.note, recurring: this.recurring(),
          recurringEndDate: endDate,
          ...(wid !== null ? { walletId: wid } : {}),
        });
      }
      // Persist last-used category for this type
      const prefKey = this.type() === 'expense' ? 'lastExpenseCategoryId' : 'lastIncomeCategoryId';
      void this.store.updateSetting(prefKey, this.categoryId());
      navigator.vibrate?.(10);
      this.saved.emit();
      this.close.emit();
    } catch {
      this.toast.error(this.localization.strings().transactionModal.saveError);
    } finally {
      this.saving.set(false);
    }
  }

  onBackdrop(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.close.emit();
  }

  activeTypeStyle(t: 'expense' | 'income'): string {
    const color = t === 'expense' ? 'var(--expense)' : 'var(--income)';
    return `flex:1;padding:10px;border-radius:8px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;background:${color}22;color:${color};`;
  }

  inactiveTypeStyle = 'flex:1;padding:10px;border-radius:8px;border:none;cursor:pointer;font-family:\'DM Sans\',sans-serif;font-size:14px;background:none;color:var(--text-muted);';

  recurringBtnStyle(value: RecurringInterval): string {
    const base = "flex:1;padding:8px 4px;border-radius:8px;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;";
    return this.recurring() === value
      ? base + 'border:1px solid var(--accent);background:var(--accent)22;color:var(--accent);'
      : base + 'border:1px solid var(--border);background:none;color:var(--text-muted);';
  }

  catStyle = 'background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 4px;cursor:pointer;text-align:center;color:var(--text);';

  selectedCatStyle(cat: Category): string {
    return `background:${cat.color}22;border:1px solid ${cat.color};border-radius:10px;padding:10px 4px;cursor:pointer;text-align:center;color:var(--text);`;
  }

  walletChipStyle(wallet: Wallet): string {
    const common = "display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:20px;font-size:13px;cursor:pointer;white-space:nowrap;font-family:'DM Sans',sans-serif;flex-shrink:0;";
    return this.walletId() === wallet.id
      ? `${common}border:1px solid ${wallet.color};background:${wallet.color}22;color:var(--text);`
      : `${common}border:1px solid var(--border);background:none;color:var(--text-muted);`;
  }
}
