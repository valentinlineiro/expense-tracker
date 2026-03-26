import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { StoreService } from './store.service';
import { getTranslations } from './translations';
import { Language, LANGUAGE_OPTIONS, setActiveLanguage } from './locale-config';

@Injectable({ providedIn: 'root' })
export class LocalizationService {
  private store = inject(StoreService);

  readonly language = signal<Language>('es');
  readonly strings = computed(() => getTranslations(this.language()));
  readonly languageOptions = LANGUAGE_OPTIONS;

  constructor() {
    effect(() => {
      setActiveLanguage(this.language());
    });

    effect(() => {
      const savedLang = this.store.settings()['language'] as Language | undefined;
      if (savedLang && savedLang !== this.language()) {
        this.language.set(savedLang);
      }
    });
  }

  setLanguage(lang: Language): void {
    if (lang === this.language()) return;
    this.language.set(lang);
    this.store.updateSetting('language', lang);
  }

  interpolate(template: string, params?: Record<string, string | number>): string {
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, key) => {
      const value = params[key];
      return value != null ? String(value) : '';
    });
  }
}
