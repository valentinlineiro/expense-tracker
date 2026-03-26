import { Component, input, output, signal } from '@angular/core';
import { Transaction } from '../../core/db';
import { AmountDisplayComponent } from '../amount-display/amount-display.component';
import { CategoryBadgeComponent } from '../category-badge/category-badge.component';

const SWIPE_THRESHOLD = 80;   // px to trigger delete
const SWIPE_MAX      = 110;   // px max drag

@Component({
  selector: 'app-transaction-card',
  standalone: true,
  imports: [AmountDisplayComponent, CategoryBadgeComponent],
  template: `
    <!-- Swipe container -->
    <div style="position:relative;border-radius:12px;overflow:hidden;">

      <!-- Delete layer (revealed on swipe) -->
      <div style="
        position:absolute;right:0;top:0;bottom:0;
        background:var(--expense);
        display:flex;align-items:center;padding:0 20px;gap:6px;
        font-size:13px;font-weight:600;color:#fff;
        min-width:90px;justify-content:center;
      ">🗑 Eliminar</div>

      <!-- Card (slides over the delete layer) -->
      <div
        [style]="cardStyle()"
        (touchstart)="onTouchStart($event)"
        (touchmove)="onTouchMove($event)"
        (touchend)="onTouchEnd()"
        (click)="edit.emit(tx())"
      >
        <!-- Left: category + note -->
        <div style="flex:1;min-width:0;">
          <app-category-badge [categoryId]="tx().categoryId" />
          @if (tx().note) {
            <div style="margin-top:4px;font-size:13px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              {{ tx().note }}
            </div>
          }
          @if (tx().recurring && tx().recurring !== 'none') {
            <div style="margin-top:3px;font-size:11px;color:var(--accent);">
              ↻ {{ recurringLabel() }}
            </div>
          }
        </div>

        <!-- Right: amount + desktop delete button -->
        <div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">
          <app-amount-display [amount]="tx().amount" [type]="tx().type" />
          <!-- Fallback delete button for non-touch (desktop) -->
          <button
            (click)="$event.stopPropagation(); delete.emit(tx().id!)"
            style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:14px;padding:4px;opacity:0.5;line-height:1;"
            title="Eliminar"
          >✕</button>
        </div>
      </div>
    </div>
  `,
})
export class TransactionCardComponent {
  tx = input.required<Transaction>();
  edit = output<Transaction>();
  delete = output<number>();

  private startX = 0;
  private dragging = false;
  swipeX = signal(0);
  isSwiping = signal(false);

  cardStyle = () => {
    const x = this.swipeX();
    const transition = this.isSwiping() ? 'none' : 'transform 0.25s ease';
    return `display:flex;align-items:center;gap:14px;padding:14px 16px;background:var(--surface);border-radius:12px;cursor:pointer;transform:translateX(${x}px);transition:${transition};position:relative;z-index:1;`;
  };

  recurringLabel(): string {
    const map: Record<string, string> = { daily: 'Diario', weekly: 'Semanal', monthly: 'Mensual' };
    return map[this.tx().recurring ?? ''] ?? '';
  }

  onTouchStart(e: TouchEvent): void {
    this.startX = e.touches[0].clientX;
    this.dragging = true;
    this.isSwiping.set(true);
  }

  onTouchMove(e: TouchEvent): void {
    if (!this.dragging) return;
    const dx = e.touches[0].clientX - this.startX;
    // Only allow left swipe, capped at max
    this.swipeX.set(Math.min(0, Math.max(-SWIPE_MAX, dx)));
  }

  onTouchEnd(): void {
    this.dragging = false;
    this.isSwiping.set(false);
    if (this.swipeX() <= -SWIPE_THRESHOLD) {
      // Animate fully then emit
      navigator.vibrate?.(30);
      this.swipeX.set(-SWIPE_MAX);
      setTimeout(() => {
        this.delete.emit(this.tx().id!);
        this.swipeX.set(0);
      }, 180);
    } else {
      this.swipeX.set(0);
    }
  }
}
