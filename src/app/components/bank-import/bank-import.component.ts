import { Component, inject, signal, computed, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/store.service';
import { ToastService } from '../../core/toast.service';
import { addTransaction } from '../../core/db';
import { LocalizationService } from '../../core/localization.service';

interface BankPreset {
  id: string;
  nameEs: string;
  nameEn: string;
  separator: string; // 'auto' | ',' | ';' | '\t'
  skipRows: number;
  dateColHint: string;
  descColHint: string;
  amountColHint: string;
  dateFormat: string; // 'auto' | 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY'
  amountFormat: string; // 'auto' | 'eu' | 'us'
  negativeIsExpense: boolean;
}

const PRESETS: BankPreset[] = [
  { id: 'generic', nameEs: 'Genérico / Otro', nameEn: 'Generic / Other', separator: 'auto', skipRows: 0, dateColHint: '', descColHint: '', amountColHint: '', dateFormat: 'auto', amountFormat: 'auto', negativeIsExpense: true },
  { id: 'santander', nameEs: 'Santander', nameEn: 'Santander', separator: ';', skipRows: 0, dateColHint: 'Fecha', descColHint: 'Concepto', amountColHint: 'Importe', dateFormat: 'DD/MM/YYYY', amountFormat: 'eu', negativeIsExpense: true },
  { id: 'bbva', nameEs: 'BBVA', nameEn: 'BBVA', separator: ';', skipRows: 0, dateColHint: 'Fecha', descColHint: 'Concepto', amountColHint: 'Importe', dateFormat: 'DD/MM/YYYY', amountFormat: 'eu', negativeIsExpense: true },
  { id: 'ing', nameEs: 'ING', nameEn: 'ING', separator: ';', skipRows: 0, dateColHint: 'Fecha', descColHint: 'Nombre', amountColHint: 'Importe', dateFormat: 'DD/MM/YYYY', amountFormat: 'eu', negativeIsExpense: true },
  { id: 'caixabank', nameEs: 'CaixaBank', nameEn: 'CaixaBank', separator: ';', skipRows: 0, dateColHint: 'Data', descColHint: 'Concepte', amountColHint: 'Import', dateFormat: 'DD/MM/YYYY', amountFormat: 'eu', negativeIsExpense: true },
  { id: 'n26', nameEs: 'N26', nameEn: 'N26', separator: ',', skipRows: 0, dateColHint: 'Date', descColHint: 'Payee', amountColHint: 'Amount', dateFormat: 'YYYY-MM-DD', amountFormat: 'us', negativeIsExpense: true },
  { id: 'revolut', nameEs: 'Revolut', nameEn: 'Revolut', separator: ',', skipRows: 0, dateColHint: 'Started Date', descColHint: 'Description', amountColHint: 'Amount', dateFormat: 'YYYY-MM-DD', amountFormat: 'us', negativeIsExpense: true },
];

interface ParsedRow {
  date: string;
  desc: string;
  amount: number;
  type: 'expense' | 'income';
  valid: boolean;
}

@Component({
  selector: 'app-bank-import',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  template: `
    <!-- Backdrop -->
    <div
      style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:200;display:flex;align-items:flex-end;"
      (click)="close.emit()"
    >
      <!-- Sheet -->
      <div
        style="background:var(--surface);width:100%;border-radius:20px 20px 0 0;padding:24px 20px 40px;max-height:90dvh;overflow-y:auto;"
        (click)="$event.stopPropagation()"
      >
        <!-- Handle -->
        <div style="width:40px;height:4px;background:var(--border);border-radius:2px;margin:0 auto 20px;"></div>

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <div>
            <h2 style="font-size:18px;margin:0;">{{ t().title }}</h2>
            <p style="font-size:12px;color:var(--text-muted);margin:4px 0 0;">{{ t().stepLabel[step() - 1] }}</p>
          </div>
          <button (click)="close.emit()" style="background:none;border:none;color:var(--text-muted);font-size:22px;cursor:pointer;padding:4px;">✕</button>
        </div>

        <!-- Step indicators -->
        <div style="display:flex;gap:6px;margin-bottom:24px;">
          @for (s of [1, 2, 3]; track s) {
            <div [style]="stepDotStyle(s)"></div>
          }
        </div>

        <!-- ── STEP 1: Upload + Preset ── -->
        @if (step() === 1) {
          <!-- File upload -->
          <div style="margin-bottom:16px;">
            <p style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;margin:0 0 8px;">{{ t().uploadLabel }}</p>
            <label style="display:flex;align-items:center;gap:10px;background:var(--surface2);border:1px dashed var(--border);border-radius:12px;padding:16px;cursor:pointer;">
              <span style="font-size:22px;">📁</span>
              <div>
                <p style="margin:0;font-size:14px;">{{ fileName() || t().chooseFile }}</p>
                @if (dataRows().length) {
                  <p style="margin:4px 0 0;font-size:12px;color:var(--income);">{{ dataRows().length }} {{ t().rowsFound }}</p>
                }
              </div>
              <input type="file" accept=".csv,.txt" (change)="onFileChange($event)" style="display:none;">
            </label>
          </div>

          <!-- Bank preset -->
          <div style="margin-bottom:16px;">
            <p style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;margin:0 0 8px;">{{ t().bankLabel }}</p>
            <select
              [(ngModel)]="selectedPresetId"
              (ngModelChange)="onPresetChange($event)"
              style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:14px;"
            >
              @for (preset of presets; track preset.id) {
                <option [value]="preset.id">{{ isEs() ? preset.nameEs : preset.nameEn }}</option>
              }
            </select>
          </div>

          <!-- Separator -->
          <div style="margin-bottom:16px;">
            <p style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;margin:0 0 8px;">{{ t().separatorLabel }}</p>
            <select
              [(ngModel)]="separatorChoice"
              (ngModelChange)="onSeparatorChange($event)"
              style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:14px;"
            >
              <option value="auto">{{ t().separatorAuto }}</option>
              <option value=",">Comma (,)</option>
              <option value=";">Semicolon (;)</option>
              <option value="&#9;">Tab</option>
            </select>
          </div>

          <!-- Skip rows -->
          <div style="margin-bottom:24px;">
            <p style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;margin:0 0 8px;">{{ t().skipRowsLabel }}</p>
            <input
              type="number"
              [(ngModel)]="skipRows"
              (ngModelChange)="reparseWithSettings()"
              min="0"
              max="20"
              style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:14px;"
            >
            <p style="font-size:11px;color:var(--text-muted);margin:6px 0 0;">{{ t().skipRowsHint }}</p>
          </div>

          <button
            (click)="toStep2()"
            [disabled]="!dataRows().length"
            style="width:100%;background:var(--accent);border:none;border-radius:12px;padding:16px;color:#fff;font-size:15px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;"
          >{{ t().next }}</button>
        }

        <!-- ── STEP 2: Column mapping ── -->
        @if (step() === 2) {
          <!-- Preview table -->
          @if (headers().length) {
            <div style="overflow-x:auto;margin-bottom:20px;border-radius:10px;border:1px solid var(--border);">
              <table style="width:100%;border-collapse:collapse;font-size:12px;font-family:'JetBrains Mono',monospace;">
                <thead>
                  <tr>
                    @for (h of headers(); track $index) {
                      <th style="padding:8px 10px;background:var(--surface2);border-bottom:1px solid var(--border);text-align:left;white-space:nowrap;color:var(--text-muted);">{{ h }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of previewDataRows(); track $index) {
                    <tr>
                      @for (cell of row; track $index) {
                        <td style="padding:6px 10px;border-bottom:1px solid var(--border);white-space:nowrap;color:var(--text);">{{ cell }}</td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <!-- Column selectors -->
          <div style="display:grid;gap:12px;margin-bottom:16px;">
            <!-- Date column -->
            <div>
              <p style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;margin:0 0 6px;">{{ t().dateCol }}</p>
              <select [(ngModel)]="dateColIdx" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;">
                <option [value]="-1">— {{ t().selectCol }} —</option>
                @for (h of headers(); track $index) {
                  <option [value]="$index">{{ $index }}: {{ h }}</option>
                }
              </select>
            </div>

            <!-- Description column -->
            <div>
              <p style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;margin:0 0 6px;">{{ t().descCol }}</p>
              <select [(ngModel)]="descColIdx" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;">
                <option [value]="-1">— {{ t().selectCol }} —</option>
                @for (h of headers(); track $index) {
                  <option [value]="$index">{{ $index }}: {{ h }}</option>
                }
              </select>
            </div>

            <!-- Amount column -->
            <div>
              <p style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;margin:0 0 6px;">{{ t().amountCol }}</p>
              <select [(ngModel)]="amountColIdx" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;">
                <option [value]="-1">— {{ t().selectCol }} —</option>
                @for (h of headers(); track $index) {
                  <option [value]="$index">{{ $index }}: {{ h }}</option>
                }
              </select>
            </div>
          </div>

          <!-- Date format -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
            <div>
              <p style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;margin:0 0 6px;">{{ t().dateFormat }}</p>
              <select [(ngModel)]="dateFormatChoice" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:12px;">
                <option value="auto">{{ t().auto }}</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              </select>
            </div>
            <div>
              <p style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;margin:0 0 6px;">{{ t().amountFormat }}</p>
              <select [(ngModel)]="amountFormatChoice" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:12px;">
                <option value="auto">{{ t().auto }}</option>
                <option value="eu">1.234,56</option>
                <option value="us">1,234.56</option>
              </select>
            </div>
          </div>

          <!-- Sign convention -->
          <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:24px;">
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
              <input type="checkbox" [(ngModel)]="negativeIsExpense" style="width:16px;height:16px;accent-color:var(--accent);">
              <span style="font-size:13px;">{{ t().negativeIsExpense }}</span>
            </label>
          </div>

          <div style="display:flex;gap:10px;">
            <button (click)="step.set(1)" style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px;color:var(--text);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;">{{ t().back }}</button>
            <button
              (click)="toStep3()"
              [disabled]="dateColIdx < 0 || descColIdx < 0 || amountColIdx < 0"
              style="flex:2;background:var(--accent);border:none;border-radius:12px;padding:14px;color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;"
            >{{ t().next }}</button>
          </div>
        }

        <!-- ── STEP 3: Preview + import ── -->
        @if (step() === 3) {
          <!-- Stats bar -->
          <div style="display:flex;gap:8px;margin-bottom:16px;">
            <div style="flex:1;background:var(--income)22;border-radius:10px;padding:10px;text-align:center;">
              <p style="margin:0;font-size:11px;color:var(--text-muted);">{{ t().validRows }}</p>
              <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:var(--income);">{{ validCount() }}</p>
            </div>
            <div style="flex:1;background:var(--expense)22;border-radius:10px;padding:10px;text-align:center;">
              <p style="margin:0;font-size:11px;color:var(--text-muted);">{{ t().skippedRows }}</p>
              <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:var(--expense);">{{ skippedCount() }}</p>
            </div>
          </div>

          <!-- Preview rows -->
          <div style="margin-bottom:16px;max-height:220px;overflow-y:auto;border-radius:10px;border:1px solid var(--border);">
            @for (row of previewParsed(); track $index) {
              <div [style]="'display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--border);' + (!row.valid ? 'opacity:0.4;' : '')">
                <span style="font-size:11px;color:var(--text-muted);font-family:monospace;min-width:80px;">{{ row.date }}</span>
                <span style="flex:1;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ row.desc }}</span>
                <span [style]="'font-size:13px;font-weight:600;font-family:monospace;' + (row.type === 'expense' ? 'color:var(--expense)' : 'color:var(--income)')">
                  {{ row.type === 'expense' ? '-' : '+' }}{{ store.currencySymbol() }}{{ row.amount | number:'1.2-2' }}
                </span>
                @if (!row.valid) { <span style="font-size:10px;color:var(--expense);">✕</span> }
              </div>
            }
            @if (validCount() > 10) {
              <div style="padding:8px 12px;font-size:12px;color:var(--text-muted);text-align:center;">
                + {{ validCount() - 10 }} {{ t().moreRows }}
              </div>
            }
          </div>

          <!-- Default wallet -->
          <div style="margin-bottom:12px;">
            <p style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;margin:0 0 6px;">{{ t().walletLabel }}</p>
            <select [(ngModel)]="defaultWalletId" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;">
              @for (w of store.wallets(); track w.id) {
                <option [value]="w.id">{{ w.icon }} {{ w.name }}</option>
              }
            </select>
          </div>

          <!-- Default categories -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px;">
            <div>
              <p style="font-size:11px;color:var(--text-muted);margin:0 0 6px;">{{ t().defaultExpenseCat }}</p>
              <select [(ngModel)]="defaultExpenseCatId" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:8px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:12px;">
                @for (c of store.expenseCategories(); track c.id) {
                  <option [value]="c.id">{{ c.icon }} {{ c.name }}</option>
                }
              </select>
            </div>
            <div>
              <p style="font-size:11px;color:var(--text-muted);margin:0 0 6px;">{{ t().defaultIncomeCat }}</p>
              <select [(ngModel)]="defaultIncomeCatId" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:8px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:12px;">
                @for (c of store.incomeCategories(); track c.id) {
                  <option [value]="c.id">{{ c.icon }} {{ c.name }}</option>
                }
              </select>
            </div>
          </div>

          <div style="display:flex;gap:10px;">
            <button (click)="step.set(2)" [disabled]="importing()" style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px;color:var(--text);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;">{{ t().back }}</button>
            <button
              (click)="doImport()"
              [disabled]="importing() || validCount() === 0"
              style="flex:2;background:var(--accent);border:none;border-radius:12px;padding:14px;color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;"
            >{{ importing() ? t().importing : t().importBtn + ' ' + validCount() }}</button>
          </div>
        }
      </div>
    </div>
  `,
})
export class BankImportComponent {
  readonly close = output<void>();

  readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);
  private readonly localization = inject(LocalizationService);

  readonly presets = PRESETS;

  // ── Step state ────────────────────────────────────────────────────────────
  readonly step = signal<1 | 2 | 3>(1);

  // ── Step 1 state ──────────────────────────────────────────────────────────
  readonly fileName = signal('');
  readonly rawText = signal('');
  readonly headers = signal<string[]>([]);
  readonly dataRows = signal<string[][]>([]);

  selectedPresetId = 'generic';
  separatorChoice = 'auto';
  skipRows = 0;

  // ── Step 2 state ──────────────────────────────────────────────────────────
  dateColIdx = -1;
  descColIdx = -1;
  amountColIdx = -1;
  dateFormatChoice = 'auto';
  amountFormatChoice = 'auto';
  negativeIsExpense = true;

  // ── Step 3 state ──────────────────────────────────────────────────────────
  readonly importing = signal(false);
  defaultWalletId: number | undefined;
  defaultExpenseCatId = 'other-exp';
  defaultIncomeCatId = 'other-inc';

  // ── Computed ──────────────────────────────────────────────────────────────

  readonly isEs = computed(() => this.localization.language() === 'es');

  readonly t = computed(() => {
    const es = this.localization.language() === 'es';
    return {
      title: es ? 'Importar desde banco' : 'Import from bank',
      stepLabel: [
        es ? 'Paso 1 de 3 — Archivo y banco' : 'Step 1 of 3 — File & bank',
        es ? 'Paso 2 de 3 — Mapeo de columnas' : 'Step 2 of 3 — Column mapping',
        es ? 'Paso 3 de 3 — Vista previa e importar' : 'Step 3 of 3 — Preview & import',
      ],
      uploadLabel: es ? 'Archivo CSV' : 'CSV File',
      chooseFile: es ? 'Seleccionar archivo CSV...' : 'Choose a CSV file...',
      rowsFound: es ? 'filas detectadas' : 'rows detected',
      bankLabel: es ? 'Banco / Formato' : 'Bank / Format',
      separatorLabel: es ? 'Separador' : 'Separator',
      separatorAuto: es ? 'Auto-detectar' : 'Auto-detect',
      skipRowsLabel: es ? 'Filas a omitir al inicio' : 'Rows to skip at top',
      skipRowsHint: es ? 'Omite filas de cabecera adicionales antes de las columnas.' : 'Skip extra header rows before the column row.',
      next: es ? 'Siguiente →' : 'Next →',
      back: es ? '← Atrás' : '← Back',
      dateCol: es ? 'Columna de fecha' : 'Date column',
      descCol: es ? 'Columna de descripción' : 'Description column',
      amountCol: es ? 'Columna de importe' : 'Amount column',
      selectCol: es ? 'Seleccionar' : 'Select',
      dateFormat: es ? 'Formato de fecha' : 'Date format',
      amountFormat: es ? 'Formato de importe' : 'Amount format',
      auto: es ? 'Auto' : 'Auto',
      negativeIsExpense: es ? 'Negativo = gasto, positivo = ingreso' : 'Negative = expense, positive = income',
      validRows: es ? 'Válidas' : 'Valid',
      skippedRows: es ? 'Omitidas' : 'Skipped',
      moreRows: es ? 'más filas' : 'more rows',
      walletLabel: es ? 'Billetera destino' : 'Target wallet',
      defaultExpenseCat: es ? 'Cat. de gasto por defecto' : 'Default expense cat.',
      defaultIncomeCat: es ? 'Cat. de ingreso por defecto' : 'Default income cat.',
      importBtn: es ? 'Importar' : 'Import',
      importing: es ? 'Importando...' : 'Importing...',
    };
  });

  previewDataRows(): string[][] {
    return this.dataRows().slice(0, 3);
  }

  readonly allParsed = computed<ParsedRow[]>(() => {
    const rows = this.dataRows();
    if (!rows.length) return [];
    return rows.map(row => this.parseRow(row));
  });

  readonly previewParsed = computed<ParsedRow[]>(() => {
    const all = this.allParsed();
    const valid = all.filter(r => r.valid);
    return valid.slice(0, 10).concat(all.filter(r => !r.valid).slice(0, 3));
  });

  readonly validCount = computed(() => this.allParsed().filter(r => r.valid).length);
  readonly skippedCount = computed(() => this.allParsed().filter(r => !r.valid).length);

  // ── Step navigation ───────────────────────────────────────────────────────

  toStep2(): void {
    if (!this.dataRows().length) return;
    this.step.set(2);
  }

  toStep3(): void {
    if (this.dateColIdx < 0 || this.descColIdx < 0 || this.amountColIdx < 0) return;
    // Set default wallet
    if (this.store.wallets().length) {
      this.defaultWalletId = this.store.wallets()[0].id;
    }
    this.step.set(3);
  }

  // ── File handling ─────────────────────────────────────────────────────────

  async onFileChange(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.fileName.set(file.name);
    const text = await file.text();
    this.rawText.set(text);
    this.reparseWithSettings();
    (event.target as HTMLInputElement).value = '';
  }

  onPresetChange(presetId: string): void {
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    if (preset.separator !== 'auto') this.separatorChoice = preset.separator;
    else this.separatorChoice = 'auto';
    this.skipRows = preset.skipRows;
    this.dateFormatChoice = preset.dateFormat;
    this.amountFormatChoice = preset.amountFormat;
    this.negativeIsExpense = preset.negativeIsExpense;
    this.reparseWithSettings();
  }

  onSeparatorChange(_: string): void {
    this.reparseWithSettings();
  }

  reparseWithSettings(): void {
    const text = this.rawText();
    if (!text) return;
    const sep = this.detectSeparator(text);
    const allLines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const skipCount = Math.max(0, this.skipRows);
    if (allLines.length <= skipCount) {
      this.headers.set([]);
      this.dataRows.set([]);
      return;
    }
    const headerLine = allLines[skipCount];
    const parsedHeaders = this.splitLine(headerLine, sep);
    this.headers.set(parsedHeaders);

    const rows = allLines.slice(skipCount + 1).map(l => this.splitLine(l, sep));
    this.dataRows.set(rows);

    // Auto-select columns based on preset hints
    const preset = PRESETS.find(p => p.id === this.selectedPresetId);
    if (preset) {
      this.autoSelectColumns(parsedHeaders, preset);
    }
  }

  private autoSelectColumns(headers: string[], preset: BankPreset): void {
    const findCol = (hint: string): number => {
      if (!hint) return -1;
      const lower = hint.toLowerCase();
      const exact = headers.findIndex(h => h.toLowerCase() === lower);
      if (exact >= 0) return exact;
      return headers.findIndex(h => h.toLowerCase().includes(lower));
    };
    if (preset.dateColHint) this.dateColIdx = findCol(preset.dateColHint);
    if (preset.descColHint) this.descColIdx = findCol(preset.descColHint);
    if (preset.amountColHint) this.amountColIdx = findCol(preset.amountColHint);
  }

  // ── Parsing helpers ───────────────────────────────────────────────────────

  private detectSeparator(text: string): string {
    if (this.separatorChoice !== 'auto') return this.separatorChoice;
    const firstLine = text.split(/\r?\n/)[0] ?? '';
    const counts = {
      ';': (firstLine.match(/;/g) ?? []).length,
      ',': (firstLine.match(/,/g) ?? []).length,
      '\t': (firstLine.match(/\t/g) ?? []).length,
    };
    if (counts[';'] >= counts[','] && counts[';'] >= counts['\t']) return ';';
    if (counts['\t'] >= counts[',']) return '\t';
    return ',';
  }

  private splitLine(line: string, sep: string): string[] {
    const cols: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === sep && !inQuotes) {
        cols.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cols.push(current.trim());
    return cols;
  }

  private parseDate(raw: string): string | null {
    const s = (raw ?? '').trim().replace(/["']/g, '');
    if (!s) return null;
    const fmt = this.dateFormatChoice;

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // DD/MM/YYYY or D/M/YYYY
    const slashMatch = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (slashMatch) {
      const [, a, b, y] = slashMatch;
      if (fmt === 'MM/DD/YYYY') {
        return `${y}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
      }
      // Default: DD/MM/YYYY
      return `${y}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
    }

    // Try native Date
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return null;
  }

  private parseAmount(raw: string): number {
    let s = (raw ?? '').trim().replace(/["'\s]/g, '');
    s = s.replace(/[€$£¥]/g, '');

    // Parentheses = negative
    const negParen = s.startsWith('(') && s.endsWith(')');
    const negSign = s.startsWith('-');
    const negative = negParen || negSign;
    s = s.replace(/[()]/g, '').replace(/^-/, '');

    const fmt = this.amountFormatChoice;

    if (fmt === 'eu') {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (fmt === 'us') {
      s = s.replace(/,/g, '');
    } else {
      // Auto-detect
      const lastComma = s.lastIndexOf(',');
      const lastDot = s.lastIndexOf('.');
      if (lastComma >= 0 && lastDot >= 0) {
        if (lastComma > lastDot) {
          s = s.replace(/\./g, '').replace(',', '.'); // EU
        } else {
          s = s.replace(/,/g, ''); // US
        }
      } else if (lastComma >= 0) {
        const afterComma = s.length - lastComma - 1;
        if (afterComma <= 2) {
          s = s.replace(',', '.'); // decimal comma
        } else {
          s = s.replace(',', ''); // thousands comma
        }
      }
    }

    const num = parseFloat(s);
    if (isNaN(num)) return NaN;
    return negative ? -Math.abs(num) : Math.abs(num);
  }

  private parseRow(row: string[]): ParsedRow {
    const dateRaw = row[this.dateColIdx] ?? '';
    const desc = (row[this.descColIdx] ?? '').replace(/^["']|["']$/g, '').trim();
    const amountRaw = row[this.amountColIdx] ?? '';

    const date = this.parseDate(dateRaw);
    const signedAmount = this.parseAmount(amountRaw);

    if (!date || isNaN(signedAmount) || signedAmount === 0) {
      return { date: date ?? dateRaw, desc, amount: 0, type: 'expense', valid: false };
    }

    let type: 'expense' | 'income';
    const absAmount = Math.abs(signedAmount);

    if (this.negativeIsExpense) {
      type = signedAmount < 0 ? 'expense' : 'income';
    } else {
      type = signedAmount > 0 ? 'expense' : 'income';
    }

    return { date, desc, amount: absAmount, type, valid: true };
  }

  // ── Import ─────────────────────────────────────────────────────────────────

  async doImport(): Promise<void> {
    if (this.importing()) return;
    this.importing.set(true);
    try {
      const validRows = this.allParsed().filter(r => r.valid);
      let count = 0;
      for (const row of validRows) {
        const categoryId = row.type === 'expense' ? this.defaultExpenseCatId : this.defaultIncomeCatId;
        await addTransaction({
          amount: row.amount,
          type: row.type,
          categoryId,
          note: row.desc,
          date: row.date,
          recurring: 'none',
          walletId: this.defaultWalletId,
        });
        count++;
      }
      await this.store.init();
      const msg = this.isEs()
        ? `${count} transacciones importadas del banco`
        : `${count} bank transactions imported`;
      this.toast.show(msg);
      this.close.emit();
    } catch {
      const msg = this.isEs()
        ? 'Error al importar. Comprueba el formato.'
        : 'Import failed. Check the file format.';
      this.toast.error(msg);
    } finally {
      this.importing.set(false);
    }
  }

  // ── Styles ─────────────────────────────────────────────────────────────────

  stepDotStyle(s: number): string {
    const active = this.step() === s;
    const done = this.step() > s;
    return `height:4px;flex:1;border-radius:2px;background:${active ? 'var(--accent)' : done ? 'var(--accent)66' : 'var(--border)'};transition:background 0.2s;`;
  }
}
