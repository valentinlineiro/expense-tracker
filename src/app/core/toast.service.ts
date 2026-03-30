import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  text: string;
  isError: boolean;
  action?: { label: string; callback: () => void };
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly message = signal<ToastMessage | null>(null);
  private _timer?: ReturnType<typeof setTimeout>;

  show(text: string, duration = 3000): void {
    this._clearTimer();
    this.message.set({ text, isError: false });
    this._timer = setTimeout(() => this.message.set(null), duration);
  }

  error(text: string, duration = 4000): void {
    this._clearTimer();
    this.message.set({ text, isError: true });
    this._timer = setTimeout(() => this.message.set(null), duration);
  }

  showWithAction(text: string, actionLabel: string, callback: () => void, duration = 4500): void {
    this._clearTimer();
    this.message.set({ text, isError: false, action: { label: actionLabel, callback } });
    this._timer = setTimeout(() => this.message.set(null), duration);
  }

  dismiss(): void {
    this._clearTimer();
    this.message.set(null);
  }

  private _clearTimer(): void {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = undefined;
    }
  }
}
