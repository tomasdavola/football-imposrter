"use client";

import { Player } from "@/lib/gameState";

interface PassPhoneScreenProps {
  player: Player;
  onReady: () => void;
}

export default function PassPhoneScreen({ player, onReady }: PassPhoneScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in">
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

