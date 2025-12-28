"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { locales, localeFlags, localeNames, Locale } from "@/i18n/config";

interface LanguageSwitcherProps {
  currentLocale: string;
}

export default function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLocaleChange = async (locale: Locale) => {
    // Set cookie (matches what request.ts expects)
    document.cookie = `locale=${locale}; path=/; max-age=31536000`; // 1 year
    setIsOpen(false);
    // Refresh to apply new locale
    router.refresh();
  };

  const current = currentLocale as Locale;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 transition-all text-sm"
        aria-label="Change language"
      >
        <span className="text-base">{localeFlags[current]}</span>
        <span className="text-zinc-300 hidden sm:inline">{localeNames[current]}</span>
        <svg
          className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 py-1 w-40 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50">
          {locales.map((locale) => (
            <button
              key={locale}
              onClick={() => handleLocaleChange(locale)}
              className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-zinc-700 transition-colors ${
                locale === current ? "bg-zinc-700/50" : ""
              }`}
            >
              <span className="text-base">{localeFlags[locale]}</span>
              <span className="text-sm text-zinc-200">{localeNames[locale]}</span>
              {locale === current && (
                <svg className="w-4 h-4 ml-auto text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

