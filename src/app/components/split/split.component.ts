import { Component, inject, signal, computed, output, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/store.service';
import { LocalizationService } from '../../core/localization.service';
import { ToastService } from '../../core/toast.service';
import { addTransaction } from '../../core/db';
import { fmtAmount, fmtMonth, currentYearMonth } from '../../core/utils';

interface SplitFile {
  version: 1;
  type: 'gastos-split';
  from: string;
  currency: string;
  period: { year: number; month: number };
  transactions: Array<{ date: string; note: string; amount: number; type: 'expense' | 'income' }>;
  totalExpense: number;
  createdAt: string;
}

@Component({
  selector: 'app-split',
  standalone: true,
  imports: [FormsModule],
  template: `
    <!-- Backdrop -->
    <div
      style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:200;display:flex;align-items:flex-end;"
      (click)="close.emit()"
    >
      <!-- Sheet -->
      <div
        style="background:var(--surface);width:100%;border-radius:20px 20px 0 0;padding:24px 20px 40px;max-height:90dvh;overflow-y:auto;"
        (click)="$event.stopPropagation()"
      >
        <!-- Handle -->
        <div style="width:40px;height:4px;background:var(--border);border-radius:2px;margin:0 auto 20px;"></div>

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h2 style="font-size:18px;margin:0;">{{ t().title }}</h2>
          <button (click)="close.emit()" style="background:none;border:none;color:var(--text-muted);font-size:22px;cursor:pointer;padding:4px;">✕</button>
        </div>

        <!-- Tabs -->
        <div style="display:flex;gap:8px;margin-bottom:24px;">
          <button (click)="tab.set('export')" [style]="tabStyle('export')">{{ t().exportTab }}</button>
          <button (click)="tab.set('import')" [style]="tabStyle('import')">{{ t().importTab }}</button>
        </div>

        <!-- ── EXPORT TAB ── -->
        @if (tab() === 'export') {

          <!-- Your name -->
          <div style="margin-bottom:16px;">
            <p style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;margin:0 0 8px;">{{ t().yourName }}</p>
            <input
              [(ngModel)]="exportName"
              [placeholder]="t().namePlaceholder"
              style="width:100%;box-sizing:border-box;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 12px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:14px;"
            >
          </div>

          <!-- Month navigator -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
            <button (click)="prevExportMonth()" style="background:var(--surface2);border:none;color:var(--text);width:38px;height:38px;border-radius:10px;font-size:18px;cursor:pointer;">‹</button>
            <span style="font-size:15px;text-transform:capitalize;font-weight:500;">{{ fmtMonth(exportYear(), exportMonth()) }}</span>
            <button
              (click)="nextExportMonth()"
              [disabled]="isCurrentExportMonth()"
              [style]="'background:var(--surface2);border:none;color:' + (isCurrentExportMonth() ? 'var(--border)' : 'var(--text)') + ';width:38px;height:38px;border-radius:10px;font-size:18px;cursor:pointer;'"
            >›</button>
          </div>

          <!-- Expense list -->
          @if (exportLoading()) {
            <div style="text-align:center;padding:32px;color:var(--text-muted);">...</div>
          } @else if (exportExpenses().length === 0) {
            <div style="text-align:center;padding:32px;color:var(--text-muted);">{{ t().noExpenses }}</div>
          } @else {
            <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:16px;max-height:200px;overflow-y:auto;">
              @for (tx of exportExpenses(); track tx.id) {
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid var(--border);">
                  <span style="font-size:12px;color:var(--text-muted);min-width:80px;font-family:monospace;">{{ tx.date }}</span>
                  <span style="flex:1;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 10px;">{{ tx.note || '—' }}</span>
                  <span class="mono" style="font-size:13px;color:var(--expense);">−{{ fmtAmount(tx.amount, store.currencySymbol()) }}</span>
                </div>
              }
            </div>

            <!-- Total -->
            <div style="display:flex;justify-content:space-between;align-items:center;background:var(--surface2);border-radius:10px;padding:12px 16px;margin-bottom:24px;">
              <span style="font-size:13px;color:var(--text-muted);">{{ t().exportTotal }}</span>
              <span class="mono" style="font-size:16px;font-weight:600;color:var(--expense);">−{{ fmtAmount(exportTotal(), store.currencySymbol()) }}</span>
            </div>
          }

          <button
            (click)="exportSplit()"
            [disabled]="exportExpenses().length === 0"
            style="width:100%;background:var(--accent);border:none;border-radius:12px;padding:16px;color:#fff;font-size:15px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;"
          >{{ t().exportBtn }}</button>
        }

        <!-- ── IMPORT TAB ── -->
        @if (tab() === 'import') {

          <!-- File picker -->
          <label style="display:flex;align-items:center;gap:10px;background:var(--surface2);border:1px dashed var(--border);border-radius:12px;padding:16px;cursor:pointer;margin-bottom:20px;">
            <span style="font-size:22px;">📂</span>
            <div>
              <p style="margin:0;font-size:14px;">{{ importedSplit() ? importedSplit()!.from + ' · ' + fmtMonth(importedSplit()!.period.year, importedSplit()!.period.month) : t().chooseFile }}</p>
              @if (importedSplit()) {
                <p style="margin:4px 0 0;font-size:12px;color:var(--income);">{{ importedSplit()!.transactions.length }} {{ t().transactions }}</p>
              }
            </div>
            <input type="file" accept=".json" (change)="onImportFile($event)" style="display:none;">
          </label>

          @if (importedSplit()) {
            <!-- Settlement card -->
            <div style="background:var(--surface2);border-radius:14px;padding:20px;margin-bottom:16px;">

              <!-- Amounts -->
              <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:13px;color:var(--text-muted);">{{ t().theirExpenses }} ({{ importedSplit()!.from }})</span>
                  <span class="mono" style="font-size:14px;font-weight:600;color:var(--expense);">−{{ fmtAmount(theirTotal(), store.currencySymbol()) }}</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:13px;color:var(--text-muted);">{{ t().myExpenses }}</span>
                  <span class="mono" style="font-size:14px;font-weight:600;color:var(--expense);">−{{ fmtAmount(myTotal(), store.currencySymbol()) }}</span>
                </div>
                <div style="height:1px;background:var(--border);"></div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:13px;color:var(--text-muted);">{{ t().combined }}</span>
                  <span class="mono" style="font-size:14px;color:var(--text);">{{ fmtAmount(combined(), store.currencySymbol()) }}</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:13px;color:var(--text-muted);">{{ t().eachOwes }}</span>
                  <span class="mono" style="font-size:14px;color:var(--text);">{{ fmtAmount(eachShouldPay(), store.currencySymbol()) }}</span>
                </div>
              </div>

              <!-- Balance verdict -->
              <div style="border-top:1px solid var(--border);padding-top:14px;text-align:center;">
                @if (isEven()) {
                  <div style="font-size:16px;font-weight:600;color:var(--income);">{{ t().even }}</div>
                } @else if (balance() > 0) {
                  <div style="font-size:13px;color:var(--text-muted);margin-bottom:4px;">{{ t().youOwe }} {{ importedSplit()!.from }}</div>
                  <div class="mono" style="font-size:24px;font-weight:700;color:var(--expense);">{{ fmtAmount(balance(), store.currencySymbol()) }}</div>
                } @else {
                  <div style="font-size:13px;color:var(--text-muted);margin-bottom:4px;">{{ importedSplit()!.from }} {{ t().owesYou }}</div>
                  <div class="mono" style="font-size:24px;font-weight:700;color:var(--income);">{{ fmtAmount(absBalance(), store.currencySymbol()) }}</div>
                }
              </div>
            </div>

            <!-- Their transactions list -->
            <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:16px;max-height:160px;overflow-y:auto;">
              @for (tx of importedSplit()!.transactions; track $index) {
                <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--border);">
                  <span style="font-size:11px;color:var(--text-muted);min-width:80px;font-family:monospace;">{{ tx.date }}</span>
                  <span style="flex:1;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 8px;">{{ tx.note || '—' }}</span>
                  <span class="mono" style="font-size:12px;color:var(--expense);">−{{ fmtAmount(tx.amount, store.currencySymbol()) }}</span>
                </div>
              }
            </div>

            <!-- Add to tracker -->
            @if (!transactionsAdded()) {
              <button
                (click)="addTheirTransactions()"
                [disabled]="addingTransactions()"
                style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px;color:var(--text);font-size:14px;cursor:pointer;font-family:'DM Sans',sans-serif;"
              >{{ addingTransactions() ? '...' : t().addTransactions }}</button>
            } @else {
              <p style="text-align:center;font-size:14px;color:var(--income);margin:0;">{{ t().addedOk }}</p>
            }
          }
        }
      </div>
    </div>
  `,
})
export class SplitComponent implements OnInit {
  readonly close = output<void>();

  readonly store = inject(StoreService);
  private readonly localization = inject(LocalizationService);
  private readonly toast = inject(ToastService);

  readonly fmtAmount = fmtAmount;
  readonly fmtMonth = fmtMonth;

  readonly tab = signal<'export' | 'import'>('export');
  readonly isEs = computed(() => this.localization.language() === 'es');

  // ── Export state ──────────────────────────────────────────────────────────

  exportName = '';
  readonly exportYear = signal(currentYearMonth().year);
  readonly exportMonth = signal(currentYearMonth().month);
  readonly exportTransactions = signal<{ id?: number; amount: number; type: 'expense' | 'income'; note: string; date: string }[]>([]);
  readonly exportLoading = signal(false);

  readonly exportExpenses = computed(() =>
    this.exportTransactions().filter(t => t.type === 'expense')
  );
  readonly exportTotal = computed(() =>
    this.exportExpenses().reduce((s, t) => s + t.amount, 0)
  );
  readonly isCurrentExportMonth = computed(() => {
    const now = currentYearMonth();
    return this.exportYear() === now.year && this.exportMonth() === now.month;
  });

  // ── Import state ──────────────────────────────────────────────────────────

  readonly importedSplit = signal<SplitFile | null>(null);
  readonly myTransactionsForPeriod = signal<{ amount: number; type: 'expense' | 'income' }[]>([]);
  readonly addingTransactions = signal(false);
  readonly transactionsAdded = signal(false);

  readonly theirTotal = computed(() => this.importedSplit()?.totalExpense ?? 0);
  readonly myTotal = computed(() =>
    this.myTransactionsForPeriod().filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  );
  readonly combined = computed(() => this.theirTotal() + this.myTotal());
  readonly eachShouldPay = computed(() => this.combined() / 2);
  readonly balance = computed(() => (this.theirTotal() - this.myTotal()) / 2);
  readonly absBalance = computed(() => Math.abs(this.balance()));
  readonly isEven = computed(() => Math.abs(this.balance()) < 0.01);

  // ── Strings ───────────────────────────────────────────────────────────────

  readonly t = computed(() => {
    const es = this.isEs();
    return {
      title: es ? 'Gastos compartidos' : 'Shared expenses',
      exportTab: es ? '📤 Exportar' : '📤 Export',
      importTab: es ? '📥 Importar' : '📥 Import',
      yourName: es ? 'Tu nombre (opcional)' : 'Your name (optional)',
      namePlaceholder: es ? 'Ej. Alex' : 'E.g. Alex',
      exportTotal: es ? 'Total gastos' : 'Total expenses',
      exportBtn: es ? 'Exportar split →' : 'Export split →',
      noExpenses: es ? 'Sin gastos este mes' : 'No expenses this month',
      chooseFile: es ? 'Seleccionar archivo split (.json)...' : 'Choose split file (.json)...',
      transactions: es ? 'transacciones' : 'transactions',
      theirExpenses: es ? 'Sus gastos' : 'Their expenses',
      myExpenses: es ? 'Mis gastos' : 'My expenses',
      combined: es ? 'Total combinado' : 'Combined total',
      eachOwes: es ? 'Cada uno paga' : 'Each should pay',
      youOwe: es ? 'Le debes a' : 'You owe',
      owesYou: es ? 'te debe' : 'owes you',
      even: es ? '¡Estáis a mano! ✓' : 'You\'re even! ✓',
      addTransactions: es ? '+ Agregar sus gastos a mi tracker' : '+ Add their expenses to my tracker',
      addedOk: es ? '✓ Gastos añadidos' : '✓ Expenses added',
    };
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadExportMonth();
  }

  // ── Export ────────────────────────────────────────────────────────────────

  prevExportMonth(): void {
    if (this.exportMonth() === 1) { this.exportYear.update(y => y - 1); this.exportMonth.set(12); }
    else { this.exportMonth.update(m => m - 1); }
    this.loadExportMonth();
  }

  nextExportMonth(): void {
    if (this.isCurrentExportMonth()) return;
    if (this.exportMonth() === 12) { this.exportYear.update(y => y + 1); this.exportMonth.set(1); }
    else { this.exportMonth.update(m => m + 1); }
    this.loadExportMonth();
  }

  async loadExportMonth(): Promise<void> {
    this.exportLoading.set(true);
    const txs = await this.store.getTransactionsByMonth(this.exportYear(), this.exportMonth());
    this.exportTransactions.set(txs);
    this.exportLoading.set(false);
  }

  exportSplit(): void {
    const expenses = this.exportExpenses();
    if (!expenses.length) return;
    const split: SplitFile = {
      version: 1,
      type: 'gastos-split',
      from: this.exportName.trim() || (this.isEs() ? 'Anónimo' : 'Anonymous'),
      currency: this.store.currencySymbol(),
      period: { year: this.exportYear(), month: this.exportMonth() },
      transactions: expenses.map(t => ({ date: t.date, note: t.note, amount: t.amount, type: t.type })),
      totalExpense: this.exportTotal(),
      createdAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(split, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `split-${split.period.year}-${String(split.period.month).padStart(2, '0')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Import ────────────────────────────────────────────────────────────────

  async onImportFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as SplitFile;
      if (data.type !== 'gastos-split' || data.version !== 1) {
        this.toast.error(this.isEs()
          ? 'Archivo inválido. Debe ser un split exportado desde esta app.'
          : 'Invalid file. Must be a split exported from this app.');
        return;
      }
      this.importedSplit.set(data);
      this.transactionsAdded.set(false);
      const myTxs = await this.store.getTransactionsByMonth(data.period.year, data.period.month);
      this.myTransactionsForPeriod.set(myTxs);
    } catch {
      this.toast.error(this.isEs()
        ? 'No se pudo leer el archivo.'
        : 'Could not read the file.');
    } finally {
      (event.target as HTMLInputElement).value = '';
    }
  }

  async addTheirTransactions(): Promise<void> {
    const split = this.importedSplit();
    if (!split || this.addingTransactions()) return;
    this.addingTransactions.set(true);
    try {
      const defaultCatId = this.store.expenseCategories()[0]?.id ?? 'other-exp';
      for (const tx of split.transactions) {
        await addTransaction({
          amount: tx.amount,
          type: tx.type,
          categoryId: defaultCatId,
          note: `[${split.from}] ${tx.note}`.trim(),
          date: tx.date,
          recurring: 'none',
        });
      }
      await this.store.init();
      this.transactionsAdded.set(true);
    } finally {
      this.addingTransactions.set(false);
    }
  }

  // ── Style helpers ─────────────────────────────────────────────────────────

  tabStyle(t: 'export' | 'import'): string {
    const active = this.tab() === t;
    return `flex:1;padding:10px;border-radius:10px;border:1px solid ${active ? 'var(--accent)' : 'var(--border)'};background:${active ? 'var(--accent)' : 'transparent'};color:${active ? '#fff' : 'var(--text)'};cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;`;
  }
}
