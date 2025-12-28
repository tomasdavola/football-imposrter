export const locales = ["en", "es", "pt", "it", "fr"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español", 
  pt: "Português",
  it: "Italiano",
  fr: "Français",
};

export const localeFlags: Record<Locale, string> = {
  en: "🇬🇧",
  es: "🇪🇸",
  pt: "🇧🇷",
  it: "🇮🇹",
  fr: "🇫🇷",
};
