import { format, parseISO } from 'date-fns';
import { getActiveLocale, getActiveNumberLocale } from './locale-config';

// ── Emoji presets for category picker ────────────────────────────────────────

export const EMOJI_PRESETS = [
  '🍔','🍕','☕','🍺','🛒','🍎','🍜','🥗',
  '🚗','🚌','✈️','⛽','🚲','🛵',
  '🏠','💡','🛁','📦','🛋️',
  '💊','🏥','🏋️','🧘',
  '🎬','🎮','🎵','📚','🎓','🎁',
  '👕','👟','💄',
  '💼','💻','📱','🖥️',
  '💰','💳','🏦','📈','💎',
  '🐕','🌱','✏️','🔧','➕',
];

// ── Palette (shared across the app) ──────────────────────────────────────────

export const PALETTE = [
  '#ff6b35', '#f7c59f', '#efefd0', '#4ecdc4', '#7c6df0',
  '#a8dadc', '#ff4d4d', '#4dff91', '#00d4aa', '#ffd166',
  '#06d6a0', '#118ab2', '#ef476f', '#ffd60a', '#6b6b6b',
];

// ── Date helpers ──────────────────────────────────────────────────────────────

export function today(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function toDateStr(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function fmtDate(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMM yyyy', { locale: getActiveLocale() });
}

export function fmtDateShort(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMM', { locale: getActiveLocale() });
}

export function fmtMonth(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return format(d, 'MMMM yyyy', { locale: getActiveLocale() });
}

export function fmtMonthShort(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return format(d, 'MMM', { locale: getActiveLocale() });
}

export function currentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

// ── Amount helpers ────────────────────────────────────────────────────────────

export function fmtAmount(amount: number, symbol: string): string {
  return `${symbol}${amount.toLocaleString(getActiveNumberLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Slug generator ────────────────────────────────────────────────────────────

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Date.now().toString(36);
}

// ── CSV export ────────────────────────────────────────────────────────────────

export function exportToCsv(rows: Record<string, unknown>[], filename: string): void {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r =>
      headers.map(h => {
        const v = String(r[h] ?? '');
        return v.includes(',') ? `"${v}"` : v;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
