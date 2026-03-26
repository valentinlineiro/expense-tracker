import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { StoreService } from './core/store.service';
import { ToastService } from './core/toast.service';
import { LocalizationService } from './core/localization.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <!-- Offline banner -->
    @if (isOffline()) {
      <div style="
        position:fixed;top:0;left:0;right:0;
        background:#ff4d4d;color:#fff;
        text-align:center;padding:7px 16px;
        font-size:13px;z-index:200;
        font-family:'DM Sans',sans-serif;
      ">
        {{ localization.strings().offlineBanner }}
      </div>
    }

    <!-- Toast -->
    @if (toast.message()) {
      <div [style]="toastStyle()">{{ toast.message()!.text }}</div>
    }

    <!-- Main content -->
    <div [style]="'height:100dvh;overflow-y:auto;padding-bottom:env(safe-area-inset-bottom);' + (isOffline() ? 'padding-top:34px;' : '')">
      <router-outlet />
    </div>

    <!-- Bottom nav -->
    <nav style="
      position:fixed;
      bottom:0;left:0;right:0;
      background:var(--surface);
      border-top:1px solid var(--border);
      display:flex;
      padding:8px 0 calc(8px + env(safe-area-inset-bottom));
      z-index:50;
    ">
      <a routerLink="/today" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;text-decoration:none;color:var(--text-muted);font-size:12px;padding:4px 0;" #today="routerLinkActive">
        <span style="font-size:20px;">🏠</span>
        <span [style]="'color:' + (today.isActive ? 'var(--accent)' : 'var(--text-muted)') + ';'">{{ localization.strings().nav.today }}</span>
      </a>
      <a routerLink="/month" routerLinkActive="active" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;text-decoration:none;color:var(--text-muted);font-size:12px;padding:4px 0;" #month="routerLinkActive">
        <span style="font-size:20px;">📅</span>
        <span [style]="'color:' + (month.isActive ? 'var(--accent)' : 'var(--text-muted)') + ';'">{{ localization.strings().nav.month }}</span>
      </a>
      <a routerLink="/stats" routerLinkActive="active" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;text-decoration:none;color:var(--text-muted);font-size:12px;padding:4px 0;" #stats="routerLinkActive">
        <span style="font-size:20px;">📊</span>
        <span [style]="'color:' + (stats.isActive ? 'var(--accent)' : 'var(--text-muted)') + ';'">{{ localization.strings().nav.stats }}</span>
      </a>
      <a routerLink="/settings" routerLinkActive="active" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;text-decoration:none;color:var(--text-muted);font-size:12px;padding:4px 0;" #settings="routerLinkActive">
        <span style="font-size:20px;">⚙️</span>
        <span [style]="'color:' + (settings.isActive ? 'var(--accent)' : 'var(--text-muted)') + ';'">{{ localization.strings().nav.settings }}</span>
      </a>
    </nav>
  `,
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private store = inject(StoreService);
  readonly localization = inject(LocalizationService);
  readonly toast = inject(ToastService);

  isOffline = signal(!navigator.onLine);

  toastStyle(): string {
    const isError = this.toast.message()?.isError;
    const base = "position:fixed;bottom:90px;left:16px;right:16px;border-radius:12px;padding:13px 16px;font-size:14px;z-index:300;box-shadow:0 4px 20px rgba(0,0,0,0.4);font-family:'DM Sans',sans-serif;";
    return isError
      ? base + 'background:#3a1a1a;border:1px solid #ff4d4d;color:#ff9999;'
      : base + 'background:var(--surface);border:1px solid var(--border);color:var(--text);';
  }

  @HostListener('window:online')
  onOnline(): void { this.isOffline.set(false); }

  @HostListener('window:offline')
  onOffline(): void { this.isOffline.set(true); }

  async ngOnInit(): Promise<void> {
    try {
      await this.store.init();
    } catch {
      this.toast.error(this.localization.strings().errors.loadData);
    }
  }
}
