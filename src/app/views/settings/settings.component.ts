import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/store.service';
import { ToastService } from '../../core/toast.service';
import { Category, RecurringInterval } from '../../core/db';
import { generateSlug, exportToCsv, PALETTE } from '../../core/utils';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div style="padding:20px 16px 100px;">
      <h1 style="font-size:26px;margin-bottom:28px;">Ajustes</h1>

      <!-- Currency -->
      <section style="background:var(--surface);border-radius:16px;padding:20px;margin-bottom:16px;">
        <p style="color:var(--text-muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 12px;">Moneda</p>
        <div style="display:flex;gap:10px;align-items:center;">
          <input
            [(ngModel)]="symbolInput"
            maxlength="3"
            placeholder="€"
            style="
              width:70px;text-align:center;
              background:var(--surface2);border:1px solid var(--border);
              border-radius:8px;padding:10px;
              color:var(--text);font-family:'JetBrains Mono',monospace;font-size:18px;
            "
          >
          <button
            (click)="saveCurrency()"
            style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:10px 16px;cursor:pointer;font-family:'DM Sans',sans-serif;"
          >Guardar</button>
          @if (currencySaved()) {
            <span style="color:var(--income);font-size:13px;">✓ Guardado</span>
          }
        </div>
      </section>

      <!-- Categories -->
      <section style="background:var(--surface);border-radius:16px;padding:20px;margin-bottom:16px;">
        <p style="color:var(--text-muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 16px;">Categorías</p>

        @for (cat of store.categories(); track cat.id) {
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
            <div [style]="'width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;background:' + cat.color + '22;'">{{ cat.icon }}</div>
            <span style="flex:1;font-size:14px;">{{ cat.name }}</span>
            <span style="font-size:11px;color:var(--text-muted);">{{ cat.type }}</span>
            @if (!cat.isDefault) {
              <button
                (click)="deleteCategory(cat)"
                style="background:none;border:none;color:var(--expense);cursor:pointer;font-size:16px;opacity:0.7;"
              >✕</button>
            } @else {
              <span style="width:24px;"></span>
            }
          </div>
        }

        <!-- Add category form -->
        <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:16px;">
          <p style="font-size:13px;color:var(--text-muted);margin:0 0 10px;">Nueva categoría</p>
          <div style="display:flex;gap:8px;margin-bottom:8px;">
            <input [(ngModel)]="newCatIcon" maxlength="2" placeholder="🏷" style="width:50px;text-align:center;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px;color:var(--text);font-size:18px;">
            <input [(ngModel)]="newCatName" placeholder="Nombre" style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-family:'DM Sans',sans-serif;">
          </div>
          <div style="display:flex;gap:8px;margin-bottom:10px;">
            <select [(ngModel)]="newCatType" style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px;color:var(--text);font-family:'DM Sans',sans-serif;">
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
              <option value="both">Ambos</option>
            </select>
          </div>
          <!-- Color picker -->
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
            @for (color of palette; track color) {
              <button
                (click)="newCatColor = color"
                [style]="'width:24px;height:24px;border-radius:50%;background:' + color + ';border:2px solid ' + (newCatColor === color ? '#fff' : 'transparent') + ';cursor:pointer;'"
              ></button>
            }
          </div>
          <button
            (click)="addCategory()"
            [disabled]="!newCatName.trim() || !newCatIcon.trim()"
            style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 16px;color:var(--text);cursor:pointer;font-family:'DM Sans',sans-serif;"
          >+ Agregar</button>
        </div>
      </section>

      <!-- Budgets -->
      <section style="background:var(--surface);border-radius:16px;padding:20px;margin-bottom:16px;">
        <p style="color:var(--text-muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 16px;">Presupuestos mensuales</p>
        @for (cat of store.expenseCategories(); track cat.id) {
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
            <div [style]="'width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;background:' + cat.color + '22;flex-shrink:0;'">{{ cat.icon }}</div>
            <span style="flex:1;font-size:14px;">{{ cat.name }}</span>
            <div style="display:flex;align-items:center;gap:6px;">
              <input
                type="number"
                [value]="store.budgetMap().get(cat.id) ?? ''"
                (change)="onBudgetChange(cat.id, $event)"
                placeholder="—"
                min="0"
                step="1"
                style="width:80px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:6px 8px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:13px;text-align:right;"
              >
              <span style="font-size:13px;color:var(--text-muted);">{{ store.currencySymbol() }}</span>
            </div>
          </div>
        }
        <p style="font-size:11px;color:var(--text-muted);margin:8px 0 0;">Deja vacío para sin límite. Se muestra como barra de progreso en la vista mensual.</p>
      </section>

      <!-- Data: export + import -->
      <section style="background:var(--surface);border-radius:16px;padding:20px;margin-bottom:16px;">
        <p style="color:var(--text-muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 12px;">Datos</p>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <button
            (click)="exportCsv()"
            style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px;color:var(--text);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;"
          >📤 Exportar a CSV</button>
          <label style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px;color:var(--text);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;text-align:center;display:block;">
            📥 Importar desde CSV
            <input type="file" accept=".csv" (change)="importCsv($event)" style="display:none;">
          </label>
          @if (importResult()) {
            <p style="font-size:13px;color:var(--income);margin:0;">✓ {{ importResult() }}</p>
          }
        </div>
      </section>

      <!-- Danger zone -->
      <section style="background:#ff4d4d11;border:1px solid #ff4d4d33;border-radius:16px;padding:20px;">
        <p style="color:var(--expense);font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 12px;">Zona peligrosa</p>
        @if (!confirmDelete()) {
          <button
            (click)="confirmDelete.set(true)"
            style="width:100%;background:none;border:1px solid var(--expense);border-radius:10px;padding:14px;color:var(--expense);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;"
          >🗑 Borrar todos los datos</button>
        } @else {
          <p style="color:var(--expense);font-size:14px;margin:0 0 12px;">¿Estás seguro? Esta acción es irreversible.</p>
          <div style="display:flex;gap:10px;">
            <button
              (click)="confirmDelete.set(false)"
              style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px;color:var(--text);cursor:pointer;font-family:'DM Sans',sans-serif;"
            >Cancelar</button>
            <button
              (click)="deleteAll()"
              style="flex:1;background:var(--expense);border:none;border-radius:10px;padding:12px;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:600;"
            >Sí, borrar todo</button>
          </div>
        }
      </section>
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);
  readonly palette = PALETTE;

  symbolInput = '';
  importResult = signal('');
  currencySaved = signal(false);

  newCatName = '';
  newCatIcon = '';
  newCatType: 'expense' | 'income' | 'both' = 'expense';
  newCatColor = PALETTE[0];

  confirmDelete = signal(false);

  ngOnInit(): void {
    this.symbolInput = this.store.currencySymbol();
  }

  async saveCurrency(): Promise<void> {
    await this.store.updateSetting('currencySymbol', this.symbolInput);
    this.currencySaved.set(true);
    setTimeout(() => this.currencySaved.set(false), 2000);
  }

  async addCategory(): Promise<void> {
    if (!this.newCatName.trim() || !this.newCatIcon.trim()) return;
    const cat: Omit<Category, 'createdAt'> = {
      id: generateSlug(this.newCatName),
      name: this.newCatName.trim(),
      icon: this.newCatIcon.trim(),
      color: this.newCatColor,
      type: this.newCatType,
      isDefault: false,
    };
    await this.store.addCategory(cat);
    this.newCatName = '';
    this.newCatIcon = '';
    this.newCatColor = PALETTE[0];
  }

  async deleteCategory(cat: Category): Promise<void> {
    if (cat.isDefault) return;
    if (confirm(`¿Eliminar categoría "${cat.name}"?`)) {
      await this.store.deleteCategory(cat.id);
    }
  }

  async exportCsv(): Promise<void> {
    const txs = await this.store.getAllTransactions();
    if (!txs.length) { this.toast.show('No hay transacciones para exportar.'); return; }
    const rows = txs.map(t => ({
      fecha: t.date,
      tipo: t.type,
      monto: t.amount,
      categoria: this.store.getCategoryById(t.categoryId)?.name ?? t.categoryId,
      nota: t.note,
      recurring: t.recurring,
      creado: t.createdAt,
    }));
    exportToCsv(rows, `gastos-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  async importCsv(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.trim().split('\n').filter(l => l.trim());
      if (lines.length < 2) { this.toast.error('El CSV está vacío o no tiene datos.'); return; }

      const headers = lines[0].split(',').map(h => h.trim());
      const col = (name: string) => headers.indexOf(name);
      const iDate = col('fecha'), iType = col('tipo'), iAmount = col('monto');
      const iCat = col('categoria'), iNote = col('nota'), iRecurring = col('recurring');

      if (iDate < 0 || iType < 0 || iAmount < 0 || iCat < 0) {
        this.toast.error('Formato no reconocido. Exporta primero desde esta app.');
        return;
      }

      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = this.parseCsvLine(lines[i]);
        const date = cols[iDate]?.trim();
        const type = cols[iType]?.trim() as 'expense' | 'income';
        const amount = parseFloat(cols[iAmount]);
        const catName = cols[iCat]?.trim() ?? '';
        const note = cols[iNote]?.trim() ?? '';
        const recurring = (iRecurring >= 0 ? cols[iRecurring]?.trim() : 'none') as RecurringInterval;

        if (!date || !['expense', 'income'].includes(type) || isNaN(amount) || amount <= 0) continue;

        const cat = this.store.categories().find(c =>
          c.name.toLowerCase() === catName.toLowerCase() && (c.type === type || c.type === 'both')
        ) ?? this.store.categories().find(c => c.type === type || c.type === 'both');
        if (!cat) continue;

        await this.store.addTransaction({
          amount, type, categoryId: cat.id, note, date,
          recurring: ['none', 'daily', 'weekly', 'monthly'].includes(recurring) ? recurring : 'none',
        });
        imported++;
      }

      this.importResult.set(`${imported} transacciones importadas`);
      setTimeout(() => this.importResult.set(''), 4000);
    } catch {
      this.toast.error('Error al leer el archivo. Comprueba que es un CSV válido.');
    } finally {
      (event.target as HTMLInputElement).value = '';
    }
  }

  private parseCsvLine(line: string): string[] {
    const cols: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { cols.push(current); current = ''; }
      else { current += ch; }
    }
    cols.push(current);
    return cols;
  }

  async onBudgetChange(categoryId: string, event: Event): Promise<void> {
    const val = parseFloat((event.target as HTMLInputElement).value);
    if (isNaN(val) || val <= 0) {
      await this.store.deleteBudget(categoryId);
    } else {
      await this.store.upsertBudget(categoryId, val);
    }
  }

  async deleteAll(): Promise<void> {
    const { db } = await import('../../core/db');
    await db.transactions.clear();
    await db.categories.clear();
    await db.settings.clear();
    // Re-init will re-seed on next open; just reload
    window.location.reload();
  }
}
