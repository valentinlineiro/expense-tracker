import { Component, inject, input, output, signal, OnInit, HostListener, ElementRef } from '@angular/core';
import { Transaction } from '../../core/db';
import { AmountDisplayComponent } from '../amount-display/amount-display.component';
import { CategoryBadgeComponent } from '../category-badge/category-badge.component';
import { LocalizationService } from '../../core/localization.service';

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
      ">{{ localization.strings().transactionCard.delete }}</div>

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

        <!-- Right: amount + action buttons -->
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
          <app-amount-display [amount]="tx().amount" [type]="tx().type" />

          <!-- Duplicate button (desktop) -->
          @if (!isTouch) {
            <button
              (click)="$event.stopPropagation(); duplicate.emit(tx())"
              [style]="dupBtnStyle()"
              [title]="localization.strings().transactionCard.duplicate"
            >⧉</button>
          }

          <!-- Delete button (desktop, two-step confirm) -->
          <button
            (click)="deleteArmed() ? onConfirmDelete($event) : armDelete($event)"
            [style]="deleteButtonStyle()"
            [title]="deleteArmed() ? '' : localization.strings().transactionCard.deleteTitle"
          >{{ deleteArmed() ? localization.strings().transactionCard.confirmDelete : '✕' }}</button>
        </div>
      </div>
    </div>
  `,
})
export class TransactionCardComponent implements OnInit {
  tx = input.required<Transaction>();
  edit = output<Transaction>();
  delete = output<number>();
  duplicate = output<Transaction>();

  readonly localization = inject(LocalizationService);
  private readonly el = inject(ElementRef);

  isTouch = false;

  private startX = 0;
  private dragging = false;
  swipeX = signal(0);
  isSwiping = signal(false);

  deleteArmed = signal(false);
  private armTimer?: ReturnType<typeof setTimeout>;
  private longPressTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.isTouch = navigator.maxTouchPoints > 0;
  }

  // ── Styles ──────────────────────────────────────────────────────────────────

  cardStyle(): string {
    const x = this.swipeX();
    const transition = this.isSwiping() ? 'none' : 'transform 0.25s ease';
    return `display:flex;align-items:center;gap:14px;padding:14px 16px;background:var(--surface);border-radius:12px;cursor:pointer;transform:translateX(${x}px);transition:${transition};position:relative;z-index:1;`;
  }

  deleteButtonStyle(): string {
    return this.deleteArmed()
      ? 'background:none;border:1px solid var(--expense);border-radius:6px;color:var(--expense);cursor:pointer;font-size:11px;padding:3px 6px;white-space:nowrap;line-height:1.4;font-family:inherit;'
      : 'background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:14px;padding:4px;opacity:0.5;line-height:1;';
  }

  dupBtnStyle(): string {
    return 'background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:14px;padding:4px;opacity:0.5;line-height:1;';
  }

  // ── Recurring label ──────────────────────────────────────────────────────────

  recurringLabel(): string {
    const rec = this.tx().recurring;
    if (!rec || rec === 'none') return '';
    const map = this.localization.strings().transactionCard.recurringLabel;
    return map[rec] ?? '';
  }

  // ── Swipe to delete (mobile) ─────────────────────────────────────────────────

  onTouchStart(e: TouchEvent): void {
    this.startX = e.touches[0].clientX;
    this.dragging = true;
    this.isSwiping.set(true);
    // Long-press to duplicate
    this.longPressTimer = setTimeout(() => {
      navigator.vibrate?.(50);
      this.duplicate.emit(this.tx());
    }, 600);
  }

  onTouchMove(e: TouchEvent): void {
    if (!this.dragging) return;
    const dx = e.touches[0].clientX - this.startX;
    // Any movement cancels long-press
    if (Math.abs(dx) > 8) clearTimeout(this.longPressTimer);
    this.swipeX.set(Math.min(0, Math.max(-SWIPE_MAX, dx)));
  }

  onTouchEnd(): void {
    clearTimeout(this.longPressTimer);
    this.dragging = false;
    this.isSwiping.set(false);
    if (this.swipeX() <= -SWIPE_THRESHOLD) {
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

  // ── Two-step desktop delete ──────────────────────────────────────────────────

  armDelete(event: MouseEvent): void {
    event.stopPropagation();
    clearTimeout(this.armTimer);
    this.deleteArmed.set(true);
    this.armTimer = setTimeout(() => this.deleteArmed.set(false), 2500);
  }

  onConfirmDelete(event: MouseEvent): void {
    event.stopPropagation();
    clearTimeout(this.armTimer);
    this.deleteArmed.set(false);
    this.delete.emit(this.tx().id!);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    if (!this.deleteArmed()) return;
    if (!this.el.nativeElement.contains(e.target)) {
      clearTimeout(this.armTimer);
      this.deleteArmed.set(false);
    }
  }
}
