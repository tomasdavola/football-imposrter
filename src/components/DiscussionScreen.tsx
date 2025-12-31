"use client";

import { useState, useEffect, useCallback } from "react";
import { Player } from "@/lib/gameState";

interface DiscussionScreenProps {
  players: Player[];
  timeSeconds: number;
  noTimer: boolean;
  skipVoting: boolean;
  startingPlayerIndex: number;
  onEndDiscussion: () => void;
  onSettings?: () => void;
}

export default function DiscussionScreen({ players, timeSeconds, noTimer, skipVoting, startingPlayerIndex, onEndDiscussion, onSettings }: DiscussionScreenProps) {
  const startingPlayer = players[startingPlayerIndex];
  const [timeLeft, setTimeLeft] = useState(timeSeconds);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    
    if (noTimer) {
      // Count up mode
      const interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      // Countdown mode
      if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    }
  }, [isPaused, timeLeft, noTimer]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const progress = noTimer ? 100 : (timeLeft / timeSeconds) * 100;
  const isLowTime = !noTimer && timeLeft <= 30;
  const isVeryLowTime = !noTimer && timeLeft <= 10;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
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
      <div className="w-full max-w-md space-y-8">
        {/* Timer Circle */}
        <div className="relative w-64 h-64 mx-auto">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-zinc-800"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeDasharray={`${progress * 2.83} 283`}
              strokeLinecap="round"
              className={`transition-all duration-1000 ${
                isVeryLowTime
                  ? "text-red-500"
                  : isLowTime
                  ? "text-amber-500"
                  : "text-emerald-500"
              }`}
            />
          </svg>
          {/* Timer text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`text-6xl font-black tabular-nums ${
                isVeryLowTime
                  ? "text-red-500 animate-pulse"
                  : isLowTime
                  ? "text-amber-500"
                  : noTimer
                  ? "text-amber-400"
                  : "text-white"
              }`}
            >
              {noTimer ? formatTime(elapsedTime) : formatTime(timeLeft)}
            </span>
            <span className="text-zinc-500 text-sm mt-1">
              {isPaused ? "PAUSED" : noTimer ? "elapsed" : "remaining"}
            </span>
          </div>
        </div>

        {/* Discussion prompt */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-emerald-400">Discussion Time!</h1>
          <p className="text-zinc-400">
            Ask questions and discuss to find the Imposter.<br/>
            Be careful not to give too much away!
          </p>
        </div>

        {/* Starting player callout */}
        <div className="p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl border border-amber-500/50 text-center">
          <p className="text-amber-400 text-sm mb-1">🎯 Starts first:</p>
          <p className="text-2xl font-bold text-white">{startingPlayer?.name}</p>
        </div>

        {/* Players list */}
        <div className="flex flex-wrap justify-center gap-2">
          {players.map(player => (
            <span
              key={player.id}
              className={`px-4 py-2 rounded-full text-sm border transition-all ${
                player.id === startingPlayerIndex
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/50 font-medium"
                  : "bg-zinc-800 text-zinc-300 border-zinc-700"
              }`}
            >
              {player.id === startingPlayerIndex && "👉 "}{player.name}
            </span>
          ))}
        </div>

        {/* Question suggestions */}
        <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700 space-y-2">
          <p className="text-zinc-400 text-sm font-medium">💡 Question ideas:</p>
          <ul className="text-zinc-500 text-sm space-y-1">
            <li>• &quot;What position does he play?&quot;</li>
            <li>• &quot;Has he ever won the Champions League?&quot;</li>
            <li>• &quot;What&apos;s his nationality?&quot;</li>
            <li>• &quot;Name one team he&apos;s played for&quot;</li>
          </ul>
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="flex-1 py-4 bg-zinc-800 text-zinc-300 font-bold text-lg rounded-xl hover:bg-zinc-700 transition-all border border-zinc-700"
          >
            {isPaused ? "▶️ Resume" : "⏸️ Pause"}
          </button>
          <button
            onClick={onEndDiscussion}
            className="flex-[2] py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-bold text-lg rounded-xl hover:from-amber-400 hover:to-orange-500 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-500/25"
          >
            {skipVoting ? "🎭 Reveal Results" : "🗳️ Start Voting"}
          </button>
        </div>
      </div>
    </div>
  );
}

