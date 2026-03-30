import { Component, inject, signal, computed, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/store.service';
import { LocalizationService } from '../../core/localization.service';
import { Transaction, getAllTransactions } from '../../core/db';
import { TransactionCardComponent } from '../transaction-card/transaction-card.component';
import { fmtDateShort } from '../../core/utils';

@Component({
  selector: 'app-search-overlay',
  standalone: true,
  imports: [FormsModule, TransactionCardComponent],
  template: `
    <!-- Full-screen overlay -->
    <div style="position:fixed;inset:0;background:var(--bg);z-index:150;display:flex;flex-direction:column;">

      <!-- Header -->
      <div style="display:flex;align-items:center;gap:12px;padding:16px;border-bottom:1px solid var(--border);flex-shrink:0;">
        <button
          (click)="close.emit()"
          style="background:var(--surface);border:none;color:var(--text);width:36px;height:36px;border-radius:10px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;"
        >←</button>
        <input
          #searchInput
          type="search"
          [(ngModel)]="query"
          (ngModelChange)="onQueryChange($event)"
          [placeholder]="localization.strings().search.placeholder"
          style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px 14px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:15px;outline:none;"
          autofocus
        >
      </div>

      <!-- Results -->
      <div style="flex:1;overflow-y:auto;padding:16px 16px 100px;">

        @if (loading()) {
          <div style="text-align:center;padding:40px;color:var(--text-muted);">…</div>
        }

        @if (!loading() && query.length > 0 && groupedResults().length === 0) {
          <div style="text-align:center;padding:60px 20px;color:var(--text-muted);">
            <div style="font-size:40px;margin-bottom:12px;">🔍</div>
            <p style="margin:0;">{{ localization.interpolate(localization.strings().search.noResults, { query }) }}</p>
          </div>
        }

        @if (!loading() && query.length > 0 && groupedResults().length > 0) {
          <p style="font-size:12px;color:var(--text-muted);margin:0 0 16px;">
            {{ localization.interpolate(localization.strings().search.results, { count: totalResults() }) }}
          </p>
        }

        @for (group of groupedResults(); track group.date) {
          <div style="margin-bottom:20px;">
            <p style="font-size:12px;color:var(--text-muted);text-transform:capitalize;margin:0 0 8px;">{{ fmtDateShort(group.date) }}</p>
            @for (tx of group.transactions; track tx.id) {
              <div style="margin-bottom:8px;">
                <app-transaction-card
                  [tx]="tx"
                  (edit)="edit.emit($event)"
                  (delete)="delete.emit($event)"
                  (duplicate)="close.emit()"
                />
              </div>
            }
          </div>
        }

      </div>
    </div>
  `,
})
export class SearchOverlayComponent {
  close = output<void>();
  edit = output<Transaction>();
  delete = output<number>();

  readonly store = inject(StoreService);
  readonly localization = inject(LocalizationService);
  readonly fmtDateShort = fmtDateShort;

  query = '';
  results = signal<Transaction[]>([]);
  loading = signal(false);
  private searchTimer?: ReturnType<typeof setTimeout>;

  totalResults = computed(() => this.results().length);

  groupedResults = computed(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of this.results()) {
      const list = map.get(tx.date) ?? [];
      list.push(tx);
      map.set(tx.date, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, transactions]) => ({ date, transactions }));
  });

  onQueryChange(q: string): void {
    clearTimeout(this.searchTimer);
    if (!q.trim()) {
      this.results.set([]);
      return;
    }
    this.loading.set(true);
    this.searchTimer = setTimeout(async () => {
      const all = await getAllTransactions();
      const ql = q.toLowerCase();
      const cats = this.store.categories();
      const filtered = all.filter(t => {
        if (t.note.toLowerCase().includes(ql)) return true;
        const cat = cats.find(c => c.id === t.categoryId);
        if (cat?.name.toLowerCase().includes(ql)) return true;
        if (String(t.amount).includes(ql)) return true;
        return false;
      });
      this.results.set(filtered);
      this.loading.set(false);
    }, 300);
  }
}
