import { Component, inject, signal, computed, OnInit, AfterViewInit, ElementRef, ViewChild, effect } from '@angular/core';
import { StoreService } from '../../core/store.service';
import { Transaction } from '../../core/db';
import { fmtAmount, fmtMonthShort, currentYearMonth } from '../../core/utils';
import { Chart, DoughnutController, ArcElement, Tooltip, Legend, BarController, BarElement, CategoryScale, LinearScale } from 'chart.js';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend, BarController, BarElement, CategoryScale, LinearScale);

@Component({
  selector: 'app-stats',
  standalone: true,
  template: `
    <div style="padding:20px 16px 100px;">
      <h1 style="font-size:26px;margin-bottom:24px;">Estadísticas</h1>

      @if (loading()) {
        <div style="text-align:center;padding:60px;color:var(--text-muted);">Cargando...</div>
      }

      @if (!loading() && totalTransactions() === 0) {
        <div style="text-align:center;padding:60px 20px;color:var(--text-muted);">
          <div style="font-size:52px;margin-bottom:16px;">📊</div>
          <p style="margin:0 0 8px;font-size:16px;color:var(--text);">Aún no hay datos</p>
          <p style="margin:0;font-size:13px;line-height:1.6;">Agrega tus primeros gastos e ingresos<br>en la pestaña <strong>Hoy</strong> para ver estadísticas aquí.</p>
        </div>
      }

      @if (!loading() && totalTransactions() > 0) {
        <!-- Doughnut -->
        <div style="background:var(--surface);border-radius:16px;padding:20px;margin-bottom:20px;">
          <p style="color:var(--text-muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 16px;">Gastos por categoría — este mes</p>
          @if (donutData().length === 0) {
            <p style="color:var(--text-muted);text-align:center;padding:20px 0;">Sin gastos este mes</p>
          } @else {
            <div style="position:relative;max-width:220px;margin:0 auto 20px;">
              <canvas #donutCanvas></canvas>
            </div>
            <!-- Legend -->
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
          <p style="color:var(--text-muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 16px;">Tendencia mensual</p>
          <canvas #barCanvas style="max-height:180px;"></canvas>
        </div>

        <!-- Top 3 categories -->
        @if (top3().length > 0) {
          <div style="background:var(--surface);border-radius:16px;padding:20px;">
            <p style="color:var(--text-muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 16px;">Top categorías del mes</p>
            @for (item of top3(); track item.label; let i = $index) {
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:var(--text-muted);width:20px;">{{ i + 1 }}</div>
                <div [style]="'width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;background:' + item.color + '22;'">{{ item.icon }}</div>
                <div style="flex:1;">
                  <div style="font-size:14px;">{{ item.label }}</div>
                  <div style="font-size:12px;color:var(--text-muted);">{{ item.pct }}% del total</div>
                </div>
                <div class="mono" style="font-size:14px;color:var(--expense);">{{ fmtAmount(item.amount, store.currencySymbol()) }}</div>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
})
export class StatsComponent implements OnInit, AfterViewInit {
  @ViewChild('donutCanvas') donutCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barCanvas') barCanvasRef!: ElementRef<HTMLCanvasElement>;

  readonly store = inject(StoreService);
  readonly fmtAmount = fmtAmount;
  readonly fmtMonthShort = fmtMonthShort;

  loading = signal(true);
  monthlyTransactions = signal<Transaction[]>([]);
  last6Transactions = signal<Transaction[]>([]);

  totalTransactions = computed(() => this.last6Transactions().length);

  private donutChart?: Chart;
  private barChart?: Chart;

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

  barLabels = computed(() => {
    const result: string[] = [];
    const { year, month } = currentYearMonth();
    for (let i = 5; i >= 0; i--) {
      let m = month - i;
      let y = year;
      if (m <= 0) { m += 12; y -= 1; }
      result.push(fmtMonthShort(y, m));
    }
    return result;
  });

  barData = computed(() => {
    const txs = this.last6Transactions();
    const { year, month } = currentYearMonth();
    return Array.from({ length: 6 }, (_, i) => {
      let m = month - (5 - i);
      let y = year;
      if (m <= 0) { m += 12; y -= 1; }
      const pad = (n: number) => String(n).padStart(2, '0');
      const prefix = `${y}-${pad(m)}`;
      return txs
        .filter(t => t.type === 'expense' && t.date.startsWith(prefix))
        .reduce((s, t) => s + t.amount, 0);
    });
  });

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    // Charts drawn after data loads
  }

  async load(): Promise<void> {
    this.loading.set(true);
    const { year, month } = currentYearMonth();
    const [monthly, last6] = await Promise.all([
      this.store.getTransactionsByMonth(year, month),
      this.store.getTransactionsLast6Months(),
    ]);
    this.monthlyTransactions.set(monthly);
    this.last6Transactions.set(last6);
    this.loading.set(false);

    // Defer chart init until DOM is rendered
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
        datasets: [{
          data: data.map(d => d.amount),
          backgroundColor: data.map(d => d.color + 'cc'),
          borderColor: data.map(d => d.color),
          borderWidth: 1,
        }],
      },
      options: {
        cutout: '65%',
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
      },
    });
  }

  private initBar(): void {
    const canvas = this.barCanvasRef?.nativeElement;
    if (!canvas) return;
    this.barChart?.destroy();

    this.barChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: this.barLabels(),
        datasets: [{
          label: 'Gastos',
          data: this.barData(),
          backgroundColor: '#7c6df066',
          borderColor: '#7c6df0',
          borderWidth: 1,
          borderRadius: 6,
        }],
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
