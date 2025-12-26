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
}

export default function DiscussionScreen({ players, timeSeconds, noTimer, skipVoting, startingPlayerIndex, onEndDiscussion }: DiscussionScreenProps) {
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
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

