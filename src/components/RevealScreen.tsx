"use client";

import { useState } from "react";
import { Player, TrollEvent } from "@/lib/gameState";
import { FootballPlayer } from "@/lib/players";

interface RevealScreenProps {
  player: Player;
  secretPlayer: FootballPlayer;
  trollEvent: TrollEvent;
  onHide: () => void;
  onReroll: () => void;
  onSettings?: () => void;
}

export default function RevealScreen({ player, secretPlayer, trollEvent, onHide, onReroll, onSettings }: RevealScreenProps) {
  const [revealed, setRevealed] = useState(false);
  const [showRerollConfirm, setShowRerollConfirm] = useState(false);
  
  // For differentPlayers mode, use player's individual secretPlayer
  const displayPlayer = player.secretPlayer || secretPlayer;

  // Reroll confirmation modal
  const RerollConfirmModal = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in">
      <div className="bg-zinc-900 rounded-2xl border border-zinc-700 p-6 max-w-sm w-full space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <h3 className="text-xl font-bold text-white">Reroll Round?</h3>
          <p className="text-zinc-400 text-sm">
            This will restart the round with a <strong className="text-white">new player</strong> and <strong className="text-white">reassign all roles</strong>. 
            Everyone will need to reveal their roles again.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowRerollConfirm(false)}
            className="flex-1 py-3 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700 transition-all border border-zinc-700"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setShowRerollConfirm(false);
              onReroll();
            }}
            className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-bold rounded-xl hover:from-amber-400 hover:to-orange-500 transition-all"
          >
            🎲 Reroll
          </button>
        </div>
      </div>
    </div>
  );

  // Settings button component
  const SettingsButton = () => onSettings ? (
    <button
      onClick={onSettings}
      className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 rounded-full transition-all z-10"
      title="Settings"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    </button>
  ) : null;

  if (!revealed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in relative">
        <SettingsButton />
        <div className="text-center space-y-8 max-w-md">
          <div className="w-40 h-40 mx-auto rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 border-4 border-zinc-600 flex items-center justify-center">
            <span className="text-7xl">🤫</span>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">{player.name}</h1>
            <p className="text-zinc-400">Tap to reveal your role</p>
          </div>

          <button
            onClick={() => setRevealed(true)}
            className="w-[calc(100%+2rem)] -mx-4 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-bold text-xl rounded-xl hover:from-amber-400 hover:to-orange-500 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-500/25"
          >
            👁️ Reveal My Role
          </button>
        </div>
      </div>
    );
  }

  if (player.isImposter) {
    return (
      <>
        {showRerollConfirm && <RerollConfirmModal />}
        <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in bg-gradient-to-b from-red-950/30 to-transparent relative">
          <SettingsButton />
          <div className="text-center space-y-8 max-w-md">
            {/* Imposter reveal */}
            <div className="relative">
              <div className="w-40 h-40 mx-auto rounded-full bg-gradient-to-br from-red-600 to-red-800 border-4 border-red-500 flex items-center justify-center animate-pulse-slow shadow-2xl shadow-red-500/50">
                <span className="text-7xl">🕵️</span>
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl font-black text-red-500 tracking-tight">
                IMPOSTER
              </h1>
              <p className="text-xl text-zinc-300">
                You don&apos;t know the player!
              </p>
              <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
                <p className="text-zinc-400 text-sm">
                  🎯 Blend in by listening carefully to others<br/>
                  🤔 Give vague but believable answers<br/>
                  🎭 Try to figure out who the player is
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={onHide}
                className="w-full py-5 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold text-xl rounded-xl hover:from-red-400 hover:to-red-500 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-500/25"
              >
                Got it — Hide & Pass Phone
              </button>
              <button
                onClick={() => setShowRerollConfirm(true)}
                className="w-full py-3 bg-zinc-800/50 text-zinc-400 font-medium rounded-xl hover:bg-zinc-800 hover:text-zinc-300 transition-all border border-zinc-700"
              >
                🎲 Don&apos;t want to be imposter? Reroll
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in bg-gradient-to-b from-emerald-950/30 to-transparent relative">
      <SettingsButton />
      <div className="text-center space-y-8 max-w-md">
        {/* Player reveal with photo */}
        <div className="relative">
          {displayPlayer.photo ? (
            <div className="w-40 h-40 mx-auto rounded-full border-4 border-emerald-500 overflow-hidden shadow-2xl shadow-emerald-500/50 bg-zinc-800">
              <img 
                src={displayPlayer.photo} 
                alt={displayPlayer.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Hide image on error, show fallback
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="w-40 h-40 mx-auto rounded-full bg-gradient-to-br from-emerald-600 to-green-700 border-4 border-emerald-500 flex items-center justify-center shadow-2xl shadow-emerald-500/50">
              <span className="text-7xl">⚽</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <p className="text-zinc-400 text-lg">
            {trollEvent === "differentPlayers" ? "Your secret player is..." : "The secret player is..."}
          </p>
          <h1 className="text-4xl font-black text-white tracking-tight">
            {displayPlayer.name}
          </h1>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="px-3 py-1 bg-zinc-800 rounded-full text-sm text-emerald-400">
              {displayPlayer.position}
            </span>
            <span className="px-3 py-1 bg-zinc-800 rounded-full text-sm text-zinc-400">
              {displayPlayer.team}
            </span>
            <span className="px-3 py-1 bg-zinc-800 rounded-full text-sm text-zinc-400">
              {displayPlayer.nationality}
            </span>
          </div>
          <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
            <p className="text-zinc-400 text-sm">
              {trollEvent === "differentPlayers" ? (
                <>
                  🎲 Everyone has a different player - chaos mode!<br/>
                  🤔 Try to figure out who has who...
                </>
              ) : (
                <>
                  🎯 Find the Imposter through discussion<br/>
                  ⚠️ Don&apos;t reveal too much or the Imposter will blend in!
                </>
              )}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onHide}
            className="w-full py-5 bg-gradient-to-r from-emerald-500 to-green-600 text-black font-bold text-xl rounded-xl hover:from-emerald-400 hover:to-green-500 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/25"
          >
            Got it — Hide & Pass Phone
          </button>
          <button
            onClick={() => setShowRerollConfirm(true)}
            className="w-full py-3 bg-zinc-800/50 text-zinc-400 font-medium rounded-xl hover:bg-zinc-800 hover:text-zinc-300 transition-all border border-zinc-700"
          >
            🎲 Don&apos;t know this player? Reroll
          </button>
        </div>
      </div>
      {showRerollConfirm && <RerollConfirmModal />}
    </div>
  );
}

