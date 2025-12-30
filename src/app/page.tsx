"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const t = useTranslations();
  const locale = useLocale();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-emerald-500/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-emerald-500/5 rounded-full" />
        
        {/* Football pattern */}
        {mounted && (
          <>
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute text-4xl opacity-5 animate-float"
                style={{
                  left: `${15 + i * 15}%`,
                  top: `${10 + (i % 3) * 30}%`,
                  animationDelay: `${i * 0.5}s`,
                }}
              >
                ⚽
              </div>
            ))}
          </>
        )}
      </div>

      {/* Language switcher */}
      <div className={`absolute top-4 right-4 z-20 transition-all duration-1000 ${mounted ? "opacity-100" : "opacity-0"}`}>
        <LanguageSwitcher currentLocale={locale} />
      </div>

      {/* Main content */}
      <div className={`relative z-10 text-center space-y-8 max-w-lg transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        {/* Logo/Icon */}
        <div className="relative inline-block">
          <div className="w-36 h-36 mx-auto rounded-full bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30 animate-pulse-slow">
            <span className="text-7xl">⚽</span>
          </div>
          <div className="absolute -bottom-2 -right-2 w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-500/30 border-4 border-zinc-950">
            <span className="text-2xl">🕵️</span>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 bg-clip-text text-transparent">
              Football
            </span>
            <br />
            <span className="text-white">Imposter</span>
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl max-w-md mx-auto">
            {t("home.description")}
          </p>
        </div>

        {/* Game modes */}
        <div className="space-y-4 pt-4">
          <Link
            href="/game"
            className="block w-full py-5 bg-gradient-to-r from-emerald-500 to-green-600 text-black font-bold text-xl rounded-2xl hover:from-emerald-400 hover:to-green-500 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-emerald-500/25"
          >
            🎮 {t("common.start")}
          </Link>
          
          <p className="text-zinc-600 text-sm">
            Pass-the-phone mode • 3-10 {t("common.players")}
          </p>
        </div>

        {/* How to play hint */}
        <div className="pt-4">
          <details className="group">
            <summary className="cursor-pointer text-zinc-500 hover:text-zinc-400 transition-colors flex items-center justify-center gap-2">
              <span>📖 {t("home.howToPlay")}</span>
              <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="mt-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 text-left space-y-3 animate-fade-in">
              <div className="flex gap-3">
                <span className="text-2xl">1️⃣</span>
                <p className="text-zinc-400 text-sm">
                  <strong className="text-white">{t("howToPlay.step1Title")}:</strong> {t("setup.enterPlayerNames")}
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl">2️⃣</span>
                <p className="text-zinc-400 text-sm">
                  <strong className="text-white">{t("howToPlay.step2Title")}:</strong> {t("howToPlay.step2Desc")}.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl">3️⃣</span>
                <p className="text-zinc-400 text-sm">
                  <strong className="text-white"> {t("howToPlay.step3Title")}:</strong> {t("howToPlay.step3Desc")}
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl">4️⃣</span>
                <p className="text-zinc-400 text-sm">
                  <strong className="text-white">{t("howToPlay.step4Title")}:</strong> {t("howToPlay.step4Desc")}
                </p>
              </div>
            </div>
          </details>
        </div>
      </div>

      {/* Footer */}
      <div className={`absolute bottom-6 transition-all duration-1000 delay-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
        <div className="group relative cursor-pointer">
          <span className="text-zinc-600 text-sm group-hover:text-zinc-400 transition-colors">
            {t("home.madeFor")} 🌟
          </span>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-zinc-800 rounded-lg text-xs text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-zinc-700 shadow-lg">
            <a href="mailto:tomasdavola@gmail.com" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
              tomasdavola@gmail.com
            </a>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
