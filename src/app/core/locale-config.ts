import type { Locale } from 'date-fns';
import { es } from 'date-fns/locale';
import { enUS } from 'date-fns/locale/en-US';

export type Language = 'es' | 'en';

export interface LocaleInfo {
  value: Language;
  label: string;
  locale: Locale;
  intl: string;
}

const LOCALE_MAP: Record<Language, LocaleInfo> = {
  es: { value: 'es', label: 'Español', locale: es, intl: 'es-ES' },
  en: { value: 'en', label: 'English', locale: enUS, intl: 'en-US' },
};

let activeLanguage: Language = 'es';

export const LANGUAGE_OPTIONS: LocaleInfo[] = Object.values(LOCALE_MAP);

export function getActiveLanguage(): Language {
  return activeLanguage;
}

export function setActiveLanguage(lang: Language): void {
  if (LOCALE_MAP[lang]) {
    activeLanguage = lang;
  }
}

export function getActiveLocale(): Locale {
  return LOCALE_MAP[activeLanguage].locale;
}

export function getActiveNumberLocale(): string {
  return LOCALE_MAP[activeLanguage].intl;
}

export function getLocaleLabel(lang: Language): string {
  return LOCALE_MAP[lang]?.label ?? lang;
}
