import { Component, input, output } from '@angular/core';
import { Transaction } from '../../core/db';
import { AmountDisplayComponent } from '../amount-display/amount-display.component';
import { CategoryBadgeComponent } from '../category-badge/category-badge.component';

@Component({
  selector: 'app-transaction-card',
  standalone: true,
  imports: [AmountDisplayComponent, CategoryBadgeComponent],
  template: `
    <div style="
      display:flex;
      align-items:center;
      gap:14px;
      padding:14px 16px;
      background:var(--surface);
      border-radius:12px;
      cursor:pointer;
    " (click)="edit.emit(tx())">
      <!-- Left: category + note -->
      <div style="flex:1;min-width:0;">
        <app-category-badge [categoryId]="tx().categoryId" />
        @if (tx().note) {
          <div style="margin-top:4px;font-size:13px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            {{ tx().note }}
          </div>
        }
      </div>

      <!-- Right: amount + delete -->
      <div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">
        <app-amount-display [amount]="tx().amount" [type]="tx().type" />
        <button
          (click)="$event.stopPropagation(); delete.emit(tx().id!)"
          style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;padding:4px;opacity:0.6;"
          title="Eliminar"
        >🗑</button>
      </div>
    </div>
  `,
})
export class TransactionCardComponent {
  tx = input.required<Transaction>();
  edit = output<Transaction>();
  delete = output<number>();
}
