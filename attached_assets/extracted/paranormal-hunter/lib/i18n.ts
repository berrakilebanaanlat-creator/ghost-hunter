/**
 * Internationalization (i18n) System
 * 
 * Cihazın diline göre otomatik dil seçimi.
 * Desteklenen diller: TR, EN, ES, PT, DE, FR, RU, JA, KO, AR
 * Desteklenmeyen dillerde İngilizce (fallback).
 */

import { I18n } from "i18n-js";
import * as Localization from "expo-localization";

import tr from "@/locales/tr.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import pt from "@/locales/pt.json";
import de from "@/locales/de.json";
import fr from "@/locales/fr.json";
import ru from "@/locales/ru.json";
import ja from "@/locales/ja.json";
import ko from "@/locales/ko.json";
import ar from "@/locales/ar.json";

const i18n = new I18n({
  tr,
  en,
  es,
  pt,
  de,
  fr,
  ru,
  ja,
  ko,
  ar,
});

// Cihaz dilini al - NullPointerException koruması
// Crashlytics: LanguageUtils.transformCountryISO NullPointerException
// Bazı cihazlarda getLocales() boş array veya null dönebilir
let deviceLocale = "en";
try {
  const locales = Localization.getLocales();
  if (locales && locales.length > 0 && locales[0]) {
    // languageCode null olabilir (bazı Android cihazlarda)
    const langCode = locales[0].languageCode;
    if (langCode && typeof langCode === 'string' && langCode.length > 0) {
      deviceLocale = langCode;
    }
  }
} catch (localeError) {
  // Native tarafta LanguageUtils crash'i olursa sessizce "en" kullan
  console.warn('[i18n] Locale alınamadı, varsayılan "en" kullanılıyor:', localeError);
}
i18n.locale = deviceLocale;
i18n.enableFallback = true;
i18n.defaultLocale = "en";

export default i18n;
export const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options);
