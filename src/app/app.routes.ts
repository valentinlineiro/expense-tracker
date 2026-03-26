import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'today', pathMatch: 'full' },
  { path: 'today', loadComponent: () => import('./views/today/today.component').then(m => m.TodayComponent) },
  { path: 'month', loadComponent: () => import('./views/month/month.component').then(m => m.MonthComponent) },
  { path: 'stats', loadComponent: () => import('./views/stats/stats.component').then(m => m.StatsComponent) },
  { path: 'settings', loadComponent: () => import('./views/settings/settings.component').then(m => m.SettingsComponent) },
  { path: '**', redirectTo: 'today' },
];
