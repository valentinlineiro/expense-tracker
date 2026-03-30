import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { StoreService } from '../../core/store.service';
import { Transaction } from '../../core/db';
import { fmtAmount, fmtDate, today } from '../../core/utils';
import { TransactionModalComponent } from '../../components/transaction-modal/transaction-modal.component';
import { TransactionCardComponent } from '../../components/transaction-card/transaction-card.component';
import { LocalizationService } from '../../core/localization.service';
import { ToastService } from '../../core/toast.service';
import { SearchOverlayComponent } from '../../components/search-overlay/search-overlay.component';

@Component({
  selector: 'app-today',
  standalone: true,
  imports: [TransactionModalComponent, TransactionCardComponent, SearchOverlayComponent],
  template: `
    <div style="padding:20px 16px 100px;">
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;">
        <div>
          <p style="color:var(--text-muted);font-size:13px;margin:0 0 4px;">{{ formattedDate }}</p>
          <h1 style="font-size:26px;margin:0;">{{ localization.strings().today.header }}</h1>
        </div>
        <button
          (click)="showSearch.set(true)"
          style="background:var(--surface);border:none;color:var(--text-muted);width:40px;height:40px;border-radius:12px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;"
          title="{{ localization.strings().search.placeholder }}"
        >🔍</button>
      </div>

      <!-- Balance card -->
      <div style="
        background:var(--surface);
        border-radius:16px;
        padding:20px;
        margin-bottom:24px;
        display:flex;
        justify-content:space-between;
        align-items:center;
      ">
        <div>
          <p style="color:var(--text-muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 4px;">{{ localization.strings().today.balanceLabel }}</p>
          <div class="mono" [style]="'font-size:28px;font-weight:600;color:' + (balance() >= 0 ? 'var(--income)' : 'var(--expense)') + ';'">
            {{ balance() >= 0 ? '+' : '' }}{{ fmtAmount(balance(), store.currencySymbol()) }}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;">
            <span style="color:var(--income);">↑</span> {{ fmtAmount(totalIncome(), store.currencySymbol()) }}
          </div>
          <div style="font-size:12px;color:var(--text-muted);">
            <span style="color:var(--expense);">↓</span> {{ fmtAmount(totalExpense(), store.currencySymbol()) }}
          </div>
        </div>
      </div>

      <!-- Transaction list -->
      @if (store.todayTransactions().length === 0) {
        <div style="text-align:center;padding:60px 20px;color:var(--text-muted);">
          <div style="font-size:48px;margin-bottom:12px;">💸</div>
          <p style="margin:0;">{{ localization.strings().today.emptyTitle }}</p>
          <p style="margin:4px 0 0;font-size:13px;">
            {{ localization.strings().today.emptyHintPrefix }}
            <kbd style="background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:1px 5px;font-size:11px;">+</kbd>
            {{ localization.strings().today.emptyHintOr }}
            <kbd style="background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:1px 5px;font-size:11px;">N</kbd>
            {{ localization.strings().today.emptyHintSuffix }}
          </p>
        </div>
      }
      @for (tx of store.todayTransactions(); track tx.id) {
        <div style="margin-bottom:10px;">
          <app-transaction-card
            [tx]="tx"
            (edit)="openEdit($event)"
            (delete)="onDelete($event)"
            (duplicate)="onDuplicate($event)"
          />
        </div>
      }
    </div>

    <!-- FAB -->
    <button
      (click)="showModal.set(true)"
      style="
        position:fixed;
        bottom:80px;
        right:20px;
        width:58px;height:58px;
        border-radius:50%;
        background:var(--accent);
        border:none;
        color:#fff;
        font-size:26px;
        cursor:pointer;
        box-shadow:0 4px 20px rgba(124,109,240,0.5);
        display:flex;align-items:center;justify-content:center;
        z-index:10;
      "
    >+</button>

    <!-- Transaction Modal -->
    @if (showModal()) {
      <app-transaction-modal
        [editTx]="editingTx()"
        [duplicateFrom]="duplicatingTx()"
        (close)="closeModal()"
        (saved)="closeModal()"
      />
    }

    <!-- Search overlay -->
    @if (showSearch()) {
      <app-search-overlay
        (close)="showSearch.set(false)"
        (edit)="onSearchEdit($event)"
        (delete)="onSearchDelete($event)"
      />
    }
  `,
})
export class TodayComponent {
  readonly store = inject(StoreService);
  readonly fmtAmount = fmtAmount;
  readonly localization = inject(LocalizationService);
  private readonly toast = inject(ToastService);

  showModal = signal(false);
  showSearch = signal(false);
  editingTx = signal<Transaction | null>(null);
  duplicatingTx = signal<Transaction | null>(null);

  formattedDate = fmtDate(today());

  totalExpense = computed(() =>
    this.store.todayTransactions()
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0)
  );

  totalIncome = computed(() =>
    this.store.todayTransactions()
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0)
  );

  balance = computed(() => this.totalIncome() - this.totalExpense());

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey && !this.showModal()) {
      this.showModal.set(true);
    }
    if (e.key === 'Escape') {
      if (this.showModal()) this.closeModal();
      if (this.showSearch()) this.showSearch.set(false);
    }
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

  onSearchEdit(tx: Transaction): void {
    this.showSearch.set(false);
    this.openEdit(tx);
  }

  async onSearchDelete(id: number): Promise<void> {
    await this.onDelete(id);
  }

  async onDelete(id: number): Promise<void> {
    const snapshot = this.store.todayTransactions().find(t => t.id === id);
    await this.store.deleteTransaction(id);
    if (snapshot) {
      const strings = this.localization.strings().toast;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, createdAt: _ca, ...txData } = snapshot;
      this.toast.showWithAction(strings.undoDelete, strings.undo, async () => {
        await this.store.addTransaction(txData);
      });
    }
  }
}
