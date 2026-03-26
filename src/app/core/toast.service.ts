import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly message = signal<{ text: string; isError: boolean } | null>(null);

  show(text: string, duration = 3000): void {
    this.message.set({ text, isError: false });
    setTimeout(() => this.message.set(null), duration);
  }

  error(text: string, duration = 4000): void {
    this.message.set({ text, isError: true });
    setTimeout(() => this.message.set(null), duration);
  }
}
