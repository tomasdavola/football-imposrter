"use client";

import { Player } from "@/lib/gameState";

interface PassPhoneScreenProps {
  player: Player;
  onReady: () => void;
  onSettings?: () => void;
}

export default function PassPhoneScreen({ player, onReady, onSettings }: PassPhoneScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in relative">
      {/* Discrete settings button */}
      {onSettings && (
        <button
          onClick={onSettings}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 rounded-full transition-all"
          title="Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </button>
      )}
      <div className="text-center space-y-8 max-w-md">
        {/* Phone icon with animation */}
        <div className="relative">
          <div className="w-32 h-32 mx-auto rounded-3xl bg-gradient-to-br from-zinc-700 to-zinc-800 border-4 border-zinc-600 flex items-center justify-center animate-bounce-slow">
            <div className="text-5xl">📱</div>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-3 bg-zinc-900/50 rounded-full blur-sm" />
        </div>

        {/* Pass instruction */}
        <div className="space-y-3">
          <p className="text-zinc-400 text-lg">Pass the phone to</p>
          <h1 className="text-4xl font-black text-white">
            {player.name}
          </h1>
          <p className="text-zinc-500">Make sure no one else can see the screen!</p>
        </div>

        {/* Ready button */}
        <button
          onClick={onReady}
          className="w-full py-5 bg-gradient-to-r from-emerald-500 to-green-600 text-black font-bold text-xl rounded-xl hover:from-emerald-400 hover:to-green-500 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/25"
        >
          I&apos;m {player.name} — Show My Role
        </button>

        {/* Privacy reminder */}
        <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm">
          <span>🔒</span>
          <span>Only tap when you&apos;re alone with the phone</span>
        </div>
      </div>
    </div>
  );
}

