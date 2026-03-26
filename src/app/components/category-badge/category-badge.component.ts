import { Component, inject, input, computed } from '@angular/core';
import { StoreService } from '../../core/store.service';

@Component({
  selector: 'app-category-badge',
  standalone: true,
  template: `
    @if (cat()) {
      <span [style]="'display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:20px;font-size:12px;background:' + cat()!.color + '22;color:' + cat()!.color + ';'">
        {{ cat()!.icon }} {{ cat()!.name }}
      </span>
    }
  `,
})
export class CategoryBadgeComponent {
  private store = inject(StoreService);
  categoryId = input.required<string>();
  cat = computed(() => this.store.getCategoryById(this.categoryId()));
}
