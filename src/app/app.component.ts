import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { StoreService } from './core/store.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <!-- Main content -->
    <div style="height:100dvh;overflow-y:auto;padding-bottom:env(safe-area-inset-bottom);">
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
        <span style="font-size:20px;">{{ today.isActive ? '🏠' : '🏠' }}</span>
        <span [style]="'color:' + (today.isActive ? 'var(--accent)' : 'var(--text-muted)') + ';'">Hoy</span>
      </a>
      <a routerLink="/month" routerLinkActive="active" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;text-decoration:none;color:var(--text-muted);font-size:12px;padding:4px 0;" #month="routerLinkActive">
        <span style="font-size:20px;">📅</span>
        <span [style]="'color:' + (month.isActive ? 'var(--accent)' : 'var(--text-muted)') + ';'">Mes</span>
      </a>
      <a routerLink="/stats" routerLinkActive="active" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;text-decoration:none;color:var(--text-muted);font-size:12px;padding:4px 0;" #stats="routerLinkActive">
        <span style="font-size:20px;">📊</span>
        <span [style]="'color:' + (stats.isActive ? 'var(--accent)' : 'var(--text-muted)') + ';'">Stats</span>
      </a>
      <a routerLink="/settings" routerLinkActive="active" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;text-decoration:none;color:var(--text-muted);font-size:12px;padding:4px 0;" #settings="routerLinkActive">
        <span style="font-size:20px;">⚙️</span>
        <span [style]="'color:' + (settings.isActive ? 'var(--accent)' : 'var(--text-muted)') + ';'">Ajustes</span>
      </a>
    </nav>
  `,
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private store = inject(StoreService);

  async ngOnInit(): Promise<void> {
    await this.store.init();
  }
}
