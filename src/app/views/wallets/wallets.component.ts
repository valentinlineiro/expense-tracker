import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StoreService } from '../../core/store.service';
import { LocalizationService } from '../../core/localization.service';
import { Wallet, getWalletBalances } from '../../core/db';
import { fmtAmount, PALETTE, EMOJI_PRESETS } from '../../core/utils';

@Component({
  selector: 'app-wallets',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div style="padding:20px 16px 100px;max-width:480px;margin:0 auto;">

      <!-- Header -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px;">
        <button
          (click)="goBack()"
          style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:8px 14px;color:var(--text);cursor:pointer;font-size:18px;line-height:1;"
        >←</button>
        <h1 style="font-size:24px;font-family:'Syne',sans-serif;margin:0;">{{ strings().wallets.title }}</h1>
      </div>

      <!-- Wallet list -->
      @for (wallet of wallets(); track wallet.id) {
        <div style="background:var(--surface);border-radius:14px;padding:16px;margin-bottom:10px;border:1px solid var(--border);">
          <div style="display:flex;align-items:center;gap:12px;">
            <div
              style="width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;"
              [style.background]="wallet.color + '22'"
            >{{ wallet.icon }}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:16px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ wallet.name }}</div>
              <div
                class="mono"
                [style]="'font-size:14px;color:' + ((balances().get(wallet.id!) ?? 0) >= 0 ? 'var(--income)' : 'var(--expense)') + ';'"
              >{{ fmtBalance(balances().get(wallet.id!) ?? 0) }}</div>
            </div>
            <button
              (click)="startEdit(wallet)"
              style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px;padding:6px;flex-shrink:0;"
            >✏️</button>
            <button
              (click)="confirmDelete(wallet)"
              style="background:none;border:none;color:var(--expense);cursor:pointer;font-size:18px;padding:6px;opacity:0.7;flex-shrink:0;"
            >✕</button>
          </div>
        </div>
      }

      <!-- Empty state -->
      @if (wallets().length === 0) {
        <p style="text-align:center;color:var(--text-muted);padding:32px 0;">{{ strings().wallets.empty }}</p>
      }

      <!-- Add / Edit form -->
      @if (editing() !== null) {
        <div style="background:var(--surface);border:1px solid var(--accent);border-radius:14px;padding:20px;margin-top:12px;">

          <!-- Icon + Name row -->
          <div style="display:flex;gap:10px;margin-bottom:12px;align-items:flex-start;">
            <div style="position:relative;">
              <button
                (click)="iconPickerOpen.set(!iconPickerOpen())"
                style="width:50px;height:42px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;"
              >{{ formIcon }}</button>
              @if (iconPickerOpen()) {
                <div style="position:absolute;top:48px;left:0;z-index:50;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:10px;display:flex;flex-wrap:wrap;gap:6px;width:220px;box-shadow:0 4px 20px rgba(0,0,0,0.5);">
                  @for (emoji of emojiPresets; track emoji) {
                    <button
                      (click)="formIcon = emoji; iconPickerOpen.set(false)"
                      [style]="'background:' + (formIcon === emoji ? 'var(--accent)22' : 'none') + ';border:1px solid ' + (formIcon === emoji ? 'var(--accent)' : 'transparent') + ';border-radius:6px;padding:4px;font-size:18px;cursor:pointer;width:34px;height:34px;'"
                    >{{ emoji }}</button>
                  }
                </div>
              }
            </div>
            <input
              [(ngModel)]="formName"
              [placeholder]="strings().wallets.namePlaceholder"
              style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:15px;"
            >
          </div>

          <!-- Color picker -->
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
            @for (color of palette; track color) {
              <button
                (click)="formColor = color"
                [style]="'width:26px;height:26px;border-radius:50%;background:' + color + ';border:3px solid ' + (formColor === color ? '#fff' : 'transparent') + ';cursor:pointer;'"
              ></button>
            }
          </div>

          <!-- Preview -->
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding:10px;background:var(--surface2);border-radius:10px;">
            <div [style]="'width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;background:' + formColor + '22;'">{{ formIcon }}</div>
            <span style="font-size:14px;color:var(--text);">{{ formName || strings().wallets.namePlaceholder }}</span>
          </div>

          <!-- Actions -->
          <div style="display:flex;gap:10px;">
            <button
              (click)="cancelEdit()"
              style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px;color:var(--text);cursor:pointer;font-family:'DM Sans',sans-serif;"
            >{{ strings().settings.cancel }}</button>
            <button
              (click)="saveWallet()"
              [disabled]="!formName.trim()"
              [style.opacity]="formName.trim() ? 1 : 0.4"
              style="flex:2;background:var(--accent);border:none;border-radius:10px;padding:12px;color:#fff;cursor:pointer;font-family:'Syne',sans-serif;font-weight:600;"
            >{{ strings().wallets.save }}</button>
          </div>
        </div>
      }

      <!-- Add button (only when not already editing) -->
      @if (editing() === null) {
        <button
          (click)="startAdd()"
          style="width:100%;margin-top:10px;background:var(--surface);border:1px dashed var(--border);border-radius:14px;padding:16px;color:var(--text-muted);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:15px;"
        >{{ strings().wallets.addWallet }}</button>
      }
    </div>
  `,
})
export class WalletsComponent implements OnInit {
  private store = inject(StoreService);
  private router = inject(Router);
  private localization = inject(LocalizationService);

  readonly fmtAmount = fmtAmount;
  readonly palette = PALETTE;
  readonly emojiPresets = EMOJI_PRESETS;

  balances = signal(new Map<number, number>());
  editing = signal<Wallet | null | 'new'>(null);
  iconPickerOpen = signal(false);

  formName = '';
  formIcon = '💰';
  formColor = PALETTE[0];

  readonly wallets = computed(() => this.store.wallets());
  readonly strings = computed(() => this.localization.strings());

  async ngOnInit(): Promise<void> {
    await this.loadBalances();
  }

  private async loadBalances(): Promise<void> {
    const map = await getWalletBalances();
    this.balances.set(map);
  }

  fmtBalance(amount: number): string {
    return fmtAmount(amount, this.store.currencySymbol());
  }

  goBack(): void {
    this.router.navigate(['/settings']);
  }

  startAdd(): void {
    this.formName = '';
    this.formIcon = '💰';
    this.formColor = PALETTE[0];
    this.editing.set('new');
    this.iconPickerOpen.set(false);
  }

  startEdit(wallet: Wallet): void {
    this.formName = wallet.name;
    this.formIcon = wallet.icon;
    this.formColor = wallet.color;
    this.editing.set(wallet);
    this.iconPickerOpen.set(false);
  }

  cancelEdit(): void {
    this.editing.set(null);
    this.iconPickerOpen.set(false);
  }

  async saveWallet(): Promise<void> {
    if (!this.formName.trim()) return;
    const editing = this.editing();
    if (!editing) return;

    if (editing === 'new') {
      await this.store.addWallet({
        name: this.formName.trim(),
        icon: this.formIcon,
        color: this.formColor,
      });
    } else {
      await this.store.updateWallet(editing.id!, {
        name: this.formName.trim(),
        icon: this.formIcon,
        color: this.formColor,
      });
    }
    this.editing.set(null);
    this.iconPickerOpen.set(false);
    await this.loadBalances();
  }

  confirmDelete(wallet: Wallet): void {
    if (this.wallets().length <= 1) {
      alert(this.strings().wallets.cannotDeleteLast);
      return;
    }
    if (confirm(this.localization.interpolate(
      this.strings().wallets.deleteConfirm,
      { name: wallet.name }
    ))) {
      void this.store.deleteWallet(wallet.id!).then(() => this.loadBalances());
    }
  }
}
