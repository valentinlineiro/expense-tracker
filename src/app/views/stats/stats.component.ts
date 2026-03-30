import { Component, inject, signal, computed, OnInit, effect, ElementRef, ViewChild } from '@angular/core';
import { StoreService } from '../../core/store.service';
import { Transaction, getTransactionsByYear } from '../../core/db';
import { fmtAmount, fmtMonth, fmtMonthShort, currentYearMonth } from '../../core/utils';
import { Chart, DoughnutController, ArcElement, Tooltip, Legend, BarController, BarElement, CategoryScale, LinearScale } from 'chart.js';
import { LocalizationService } from '../../core/localization.service';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend, BarController, BarElement, CategoryScale, LinearScale);

@Component({
  selector: 'app-stats',
  standalone: true,
  template: `
    <div style="padding:20px 16px 100px;">
      <h1 style="font-size:26px;margin-bottom:16px;">{{ localization.strings().stats.title }}</h1>

      <!-- Month navigator -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <button (click)="prevMonth()" style="background:var(--surface);border:none;color:var(--text);width:38px;height:38px;border-radius:10px;font-size:18px;cursor:pointer;">‹</button>
        <span style="font-size:15px;text-transform:capitalize;font-weight:500;">{{ fmtMonth(year(), month()) }}</span>
        <button
          (click)="nextMonth()"
          [disabled]="isCurrentMonth()"
          [style]="'background:var(--surface);border:none;color:' + (isCurrentMonth() ? 'var(--border)' : 'var(--text)') + ';width:38px;height:38px;border-radius:10px;font-size:18px;cursor:pointer;'"
        >›</button>
      </div>

      @if (loading()) {
        <div style="text-align:center;padding:60px;color:var(--text-muted);">{{ localization.strings().stats.loading }}</div>
      }

      @if (!loading() && totalTransactions() === 0) {
        <div style="text-align:center;padding:60px 20px;color:var(--text-muted);">
          <div style="font-size:52px;margin-bottom:16px;">📊</div>
          <p style="margin:0 0 8px;font-size:16px;color:var(--text);">{{ localization.strings().stats.noDataTitle }}</p>
          <p style="margin:0;font-size:13px;line-height:1.6;">
            {{ localization.strings().stats.noDataBodyPrefix }}
            <strong>{{ localization.strings().nav.today }}</strong>
            {{ localization.strings().stats.noDataBodySuffix }}
          </p>
        </div>
      }

      @if (!loading() && totalTransactions() > 0) {

        <!-- Global balance -->
        <div style="margin-bottom:16px;">
          <div style="background:var(--surface);border-radius:16px;padding:16px;text-align:center;">
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">
              {{ localization.strings().globalBalanceLabel }}
            </div>
            <div class="mono" [style]="netBalanceStyle()">
              {{ store.netBalance() >= 0 ? '+' : '−' }}{{ fmtAmount(Math.abs(store.netBalance()), store.currencySymbol()) }}
            </div>
          </div>
        </div>

        <!-- KPI cards -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px;">
          <div style="background:var(--surface);border-radius:12px;padding:14px;text-align:center;">
            <p style="color:var(--text-muted);font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin:0 0 6px;">{{ localization.strings().stats.cards.savings }}</p>
            @if (savingsRate() !== null) {
              <div class="mono" [style]="savingsRateStyle()">{{ savingsRate() }}%</div>
            } @else {
              <div class="mono" style="font-size:16px;font-weight:600;color:var(--text-muted);">—</div>
            }
          </div>
          <div style="background:var(--surface);border-radius:12px;padding:14px;text-align:center;">
            <p style="color:var(--text-muted);font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin:0 0 6px;">{{ localization.strings().stats.cards.avgDaily }}</p>
            <div class="mono" style="font-size:16px;font-weight:600;color:var(--text);">
              {{ fmtAmount(avgDailySpend(), store.currencySymbol()) }}
            </div>
          </div>
          <div style="background:var(--surface);border-radius:12px;padding:14px;text-align:center;">
            <p style="color:var(--text-muted);font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin:0 0 6px;">{{ localization.strings().stats.cards.mom }}</p>
            @if (momDelta() !== null) {
              <div class="mono" [style]="momDeltaStyle()">{{ momDelta()! > 0 ? '+' : '' }}{{ momDelta() }}%</div>
            } @else {
              <div class="mono" style="font-size:16px;font-weight:600;color:var(--text-muted);">—</div>
            }
          </div>
        </div>

        <!-- YTD Summary -->
        <div style="background:var(--surface);border-radius:16px;padding:20px;margin-bottom:20px;">
          <p style="color:var(--text-muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 14px;">{{ localization.strings().stats.ytd.title }}</p>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
            <div style="background:var(--surface2);border-radius:10px;padding:12px;text-align:center;">
              <p style="color:var(--text-muted);font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin:0 0 4px;">{{ localization.strings().stats.ytd.income }}</p>
              <div class="mono" style="font-size:14px;font-weight:600;color:var(--income);">+{{ fmtAmount(ytdIncome(), store.currencySymbol()) }}</div>
            </div>
            <div style="background:var(--surface2);border-radius:10px;padding:12px;text-align:center;">
              <p style="color:var(--text-muted);font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin:0 0 4px;">{{ localization.strings().stats.ytd.expense }}</p>
              <div class="mono" style="font-size:14px;font-weight:600;color:var(--expense);">−{{ fmtAmount(ytdExpense(), store.currencySymbol()) }}</div>
            </div>
            <div style="background:var(--surface2);border-radius:10px;padding:12px;text-align:center;">
              <p style="color:var(--text-muted);font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin:0 0 4px;">{{ localization.strings().stats.ytd.net }}</p>
              <div class="mono" [style]="ytdNetStyle()">{{ ytdNet() >= 0 ? '+' : '' }}{{ fmtAmount(ytdNet(), store.currencySymbol()) }}</div>
            </div>
            <div style="background:var(--surface2);border-radius:10px;padding:12px;text-align:center;">
              <p style="color:var(--text-muted);font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin:0 0 4px;">{{ localization.strings().stats.ytd.rate }}</p>
              <div class="mono" [style]="ytdRateStyle()">{{ ytdSavingsRate() !== null ? ytdSavingsRate() + '%' : '—' }}</div>
            </div>
          </div>
        </div>

        <!-- Doughnut -->
        <div style="background:var(--surface);border-radius:16px;padding:20px;margin-bottom:20px;">
          <p style="color:var(--text-muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 16px;">{{ donutTitle() }}</p>
          @if (donutData().length === 0) {
            <p style="color:var(--text-muted);text-align:center;padding:20px 0;">{{ localization.strings().stats.donut.empty }}</p>
          } @else {
            <div style="position:relative;max-width:220px;margin:0 auto 20px;">
              <canvas #donutCanvas></canvas>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              @for (item of donutData(); track item.label) {
                <div style="display:flex;align-items:center;gap:10px;">
                  <div [style]="'width:10px;height:10px;border-radius:50%;background:' + item.color + ';flex-shrink:0;'"></div>
                  <span style="flex:1;font-size:13px;">{{ item.label }}</span>
                  <span class="mono" style="font-size:13px;color:var(--text-muted);">{{ fmtAmount(item.amount, store.currencySymbol()) }}</span>
                  <span style="font-size:12px;color:var(--text-muted);">{{ item.pct }}%</span>
                </div>
              }
            </div>
          }
        </div>

        <!-- Bar chart -->
        <div style="background:var(--surface);border-radius:16px;padding:20px;margin-bottom:20px;">
          <p style="color:var(--text-muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 4px;">{{ localization.strings().stats.trend.title }}</p>
          <div style="display:flex;gap:16px;margin-bottom:14px;">
            <span style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:5px;">
              <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#7c6df0;"></span>{{ localization.strings().stats.trend.expense }}
            </span>
            <span style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:5px;">
              <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#4dff91;"></span>{{ localization.strings().stats.trend.income }}
            </span>
          </div>
          <canvas #barCanvas style="max-height:180px;"></canvas>
        </div>

        <!-- Top 3 categories -->
        @if (top3().length > 0) {
          <div style="background:var(--surface);border-radius:16px;padding:20px;margin-bottom:20px;">
            <p style="color:var(--text-muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 16px;">{{ localization.strings().stats.topCategoriesTitle }}</p>
            @for (item of top3(); track item.label; let i = $index) {
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:var(--text-muted);width:20px;">{{ i + 1 }}</div>
                <div [style]="'width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;background:' + item.color + '22;'">{{ item.icon }}</div>
                <div style="flex:1;">
                  <div style="font-size:14px;">{{ item.label }}</div>
                  <div style="font-size:12px;color:var(--text-muted);">{{ item.pct }}% {{ localization.strings().stats.topPercentSuffix }}</div>
                </div>
                <div class="mono" style="font-size:14px;color:var(--expense);">{{ fmtAmount(item.amount, store.currencySymbol()) }}</div>
              </div>
            }
          </div>
        }

        <!-- Insights -->
        @if (insights().length > 0) {
          <div style="background:var(--surface);border-radius:16px;padding:20px;">
            <p style="color:var(--text-muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 14px;">{{ localization.strings().stats.insightsTitle }}</p>
            @for (insight of insights(); track insight.text) {
              <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;">
                <span style="font-size:18px;flex-shrink:0;line-height:1.4;">{{ insight.icon }}</span>
                <span style="font-size:13px;line-height:1.5;color:var(--text);">{{ insight.text }}</span>
              </div>
            }
          </div>
        }

      }
    </div>
  `,
})
export class StatsComponent implements OnInit {
  @ViewChild('donutCanvas') donutCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barCanvas') barCanvasRef!: ElementRef<HTMLCanvasElement>;

  readonly store = inject(StoreService);
  readonly fmtAmount = fmtAmount;
  readonly fmtMonth = fmtMonth;
  readonly fmtMonthShort = fmtMonthShort;
  readonly Math = Math;
  readonly localization = inject(LocalizationService);

  // ── Month navigation ──────────────────────────────────────────────────────────

  year = signal(currentYearMonth().year);
  month = signal(currentYearMonth().month);

  isCurrentMonth = computed(() => {
    const now = currentYearMonth();
    return this.year() === now.year && this.month() === now.month;
  });

  prevMonth(): void {
    if (this.month() === 1) { this.year.update(y => y - 1); this.month.set(12); }
    else { this.month.update(m => m - 1); }
    this.load();
  }

  nextMonth(): void {
    if (this.isCurrentMonth()) return;
    if (this.month() === 12) { this.year.update(y => y + 1); this.month.set(1); }
    else { this.month.update(m => m + 1); }
    this.load();
  }

  // ── Data signals ──────────────────────────────────────────────────────────────

  loading = signal(true);
  monthlyTransactions = signal<Transaction[]>([]);
  last6Transactions = signal<Transaction[]>([]);
  ytdTransactions = signal<Transaction[]>([]);

  totalTransactions = computed(() => this.last6Transactions().length);

  private donutChart?: Chart;
  private barChart?: Chart;
  private readonly redrawCharts = effect(() => {
    this.localization.language();
    if (!this.loading()) {
      setTimeout(() => this.initCharts(), 0);
    }
  });

  // ── Donut ─────────────────────────────────────────────────────────────────────

  donutData = computed(() => {
    const expenses = this.monthlyTransactions().filter(t => t.type === 'expense');
    const total = expenses.reduce((s, t) => s + t.amount, 0);
    if (total === 0) return [];
    const byCategory = new Map<string, number>();
    for (const tx of expenses) {
      byCategory.set(tx.categoryId, (byCategory.get(tx.categoryId) ?? 0) + tx.amount);
    }
    return Array.from(byCategory.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([id, amount]) => {
        const cat = this.store.getCategoryById(id);
        return {
          label: cat ? `${cat.icon} ${cat.name}` : id,
          icon: cat?.icon ?? '📦',
          color: cat?.color ?? '#6b6b6b',
          amount,
          pct: Math.round((amount / total) * 100),
        };
      });
  });

  top3 = computed(() => this.donutData().slice(0, 3));

  donutTitle = computed((): string => {
    if (this.isCurrentMonth()) return this.localization.strings().stats.donut.title;
    return this.localization.interpolate(
      this.localization.strings().stats.donut.titleMonth,
      { month: fmtMonth(this.year(), this.month()) }
    );
  });

  // ── Bar chart ─────────────────────────────────────────────────────────────────

  barLabels = computed(() => {
    const result: string[] = [];
    const y = this.year(), m = this.month();
    for (let i = 5; i >= 0; i--) {
      let mo = m - i, yr = y;
      if (mo <= 0) { mo += 12; yr -= 1; }
      result.push(fmtMonthShort(yr, mo));
    }
    return result;
  });

  barData = computed(() => this.monthlyDataFor('expense'));
  barIncomeData = computed(() => this.monthlyDataFor('income'));

  private monthlyDataFor(type: 'expense' | 'income'): number[] {
    const txs = this.last6Transactions();
    const y = this.year(), m = this.month();
    return Array.from({ length: 6 }, (_, i) => {
      let mo = m - (5 - i), yr = y;
      if (mo <= 0) { mo += 12; yr -= 1; }
      const prefix = `${yr}-${String(mo).padStart(2, '0')}`;
      return txs
        .filter(t => t.type === type && t.date.startsWith(prefix))
        .reduce((s, t) => s + t.amount, 0);
    });
  }

  // ── KPI ───────────────────────────────────────────────────────────────────────

  savingsRate = computed(() => {
    const income = this.monthlyTransactions().filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    if (income === 0) return null;
    const expense = this.monthlyTransactions().filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return Math.round(((income - expense) / income) * 100);
  });

  avgDailySpend = computed(() => {
    const expense = this.monthlyTransactions().filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const isCurrent = this.isCurrentMonth();
    const divisor = isCurrent
      ? new Date().getDate()
      : new Date(this.year(), this.month(), 0).getDate();
    return divisor > 0 ? expense / divisor : 0;
  });

  momDelta = computed(() => {
    let prevM = this.month() - 1, prevY = this.year();
    if (prevM <= 0) { prevM = 12; prevY--; }
    const prefix = `${prevY}-${String(prevM).padStart(2, '0')}`;
    const prevExpense = this.last6Transactions()
      .filter(t => t.type === 'expense' && t.date.startsWith(prefix))
      .reduce((s, t) => s + t.amount, 0);
    if (prevExpense === 0) return null;
    const currExpense = this.monthlyTransactions().filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return Math.round(((currExpense - prevExpense) / prevExpense) * 100);
  });

  // ── YTD ───────────────────────────────────────────────────────────────────────

  ytdIncome = computed(() => this.ytdTransactions().filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0));
  ytdExpense = computed(() => this.ytdTransactions().filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
  ytdNet = computed(() => this.ytdIncome() - this.ytdExpense());
  ytdSavingsRate = computed(() => {
    if (this.ytdIncome() === 0) return null;
    return Math.round(((this.ytdIncome() - this.ytdExpense()) / this.ytdIncome()) * 100);
  });

  // ── Insights ──────────────────────────────────────────────────────────────────

  insights = computed(() => {
    const strings = this.localization.strings().stats;
    const map = strings.insights;
    const list: { icon: string; text: string }[] = [];

    const mom = this.momDelta();
    if (mom !== null) {
      if (mom > 0) list.push({ icon: '📈', text: this.localization.interpolate(map.moreSpent, { percent: mom }) });
      else if (mom < 0) list.push({ icon: '📉', text: this.localization.interpolate(map.lessSpent, { percent: Math.abs(mom) }) });
      else list.push({ icon: '↔️', text: map.sameSpent });
    }

    const top = this.top3()[0];
    if (top) {
      list.push({ icon: '🏆', text: this.localization.interpolate(map.topCategory, { label: top.label, percent: top.pct }) });
    }

    const rate = this.savingsRate();
    if (rate !== null) {
      if (rate >= 20) list.push({ icon: '✅', text: this.localization.interpolate(map.savingsHigh, { rate }) });
      else if (rate > 0) list.push({ icon: '💡', text: this.localization.interpolate(map.savingsPositive, { rate }) });
      else list.push({ icon: '⚠️', text: this.localization.interpolate(map.savingsNegative, { rate: Math.abs(rate) }) });
    }

    // Only show projection for the current month
    if (this.isCurrentMonth()) {
      const avg = this.avgDailySpend();
      const day = new Date().getDate();
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      if (day > 5 && avg > 0) {
        list.push({
          icon: '🔮',
          text: this.localization.interpolate(map.projection, {
            amount: fmtAmount(avg * daysInMonth, this.store.currencySymbol()),
          }),
        });
      }
    }

    return list;
  });

  // ── Style helpers (no single-quotes inside [style] bindings) ─────────────────

  netBalanceStyle(): string {
    const color = this.store.netBalance() >= 0 ? 'var(--income)' : 'var(--expense)';
    return `font-size:24px;font-weight:600;color:${color};`;
  }

  savingsRateStyle(): string {
    const color = (this.savingsRate() ?? 0) >= 0 ? 'var(--income)' : 'var(--expense)';
    return `font-size:16px;font-weight:600;color:${color};`;
  }

  momDeltaStyle(): string {
    const color = (this.momDelta() ?? 1) <= 0 ? 'var(--income)' : 'var(--expense)';
    return `font-size:16px;font-weight:600;color:${color};`;
  }

  ytdNetStyle(): string {
    const color = this.ytdNet() >= 0 ? 'var(--income)' : 'var(--expense)';
    return `font-size:14px;font-weight:600;color:${color};`;
  }

  ytdRateStyle(): string {
    const r = this.ytdSavingsRate();
    const color = r === null ? 'var(--text-muted)' : r >= 0 ? 'var(--income)' : 'var(--expense)';
    return `font-size:14px;font-weight:600;color:${color};`;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    const [monthly, last6, ytd] = await Promise.all([
      this.store.getTransactionsByMonth(this.year(), this.month()),
      this.store.getTransactionsLast6Months(),
      getTransactionsByYear(this.year()),
    ]);
    this.monthlyTransactions.set(monthly);
    this.last6Transactions.set(last6);
    this.ytdTransactions.set(ytd);
    this.loading.set(false);
    setTimeout(() => this.initCharts(), 0);
  }

  private initCharts(): void {
    this.initDonut();
    this.initBar();
  }

  private initDonut(): void {
    const canvas = this.donutCanvasRef?.nativeElement;
    if (!canvas) return;
    this.donutChart?.destroy();
    const data = this.donutData();
    if (!data.length) return;
    this.donutChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.label),
        datasets: [{ data: data.map(d => d.amount), backgroundColor: data.map(d => d.color + 'cc'), borderColor: data.map(d => d.color), borderWidth: 1 }],
      },
      options: { cutout: '65%', plugins: { legend: { display: false }, tooltip: { enabled: true } } },
    });
  }

  private initBar(): void {
    const canvas = this.barCanvasRef?.nativeElement;
    if (!canvas) return;
    this.barChart?.destroy();
    const trendStrings = this.localization.strings().stats.trend;
    this.barChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: this.barLabels(),
        datasets: [
          { label: trendStrings.expense, data: this.barData(), backgroundColor: '#7c6df066', borderColor: '#7c6df0', borderWidth: 1, borderRadius: 4 },
          { label: trendStrings.income, data: this.barIncomeData(), backgroundColor: '#4dff9166', borderColor: '#4dff91', borderWidth: 1, borderRadius: 4 },
        ],
      },
      options: {
        scales: {
          x: { ticks: { color: '#6b6b6b' }, grid: { color: '#2a2a2a' } },
          y: { ticks: { color: '#6b6b6b' }, grid: { color: '#2a2a2a' } },
        },
        plugins: { legend: { display: false } },
      },
    });
  }
}
