import { Component, inject, input, computed } from '@angular/core';
import { StoreService } from '../../core/store.service';
import { fmtAmount } from '../../core/utils';

@Component({
  selector: 'app-amount-display',
  standalone: true,
  template: `
    <span
      class="mono"
      [style]="'color:' + color() + ';font-size:' + size() + ';font-weight:600;'"
    >{{ prefix() }}{{ formatted() }}</span>
  `,
})
export class AmountDisplayComponent {
  private store = inject(StoreService);

  amount = input.required<number>();
  type = input<'expense' | 'income' | 'neutral'>('neutral');
  size = input<string>('15px');

  formatted = computed(() => fmtAmount(this.amount(), this.store.currencySymbol()));
  prefix = computed(() => this.type() === 'expense' ? '−' : this.type() === 'income' ? '+' : '');
  color = computed(() => {
    if (this.type() === 'expense') return 'var(--expense)';
    if (this.type() === 'income') return 'var(--income)';
    return 'var(--text)';
  });
}
