"use client";

import { useState } from "react";
import { Player } from "@/lib/gameState";

interface VotingScreenProps {
  players: Player[];
  currentVoterIndex: number;
  onVote: (voterId: number, votedForId: number) => void;
  onFinishVoting: () => void;
}

export default function VotingScreen({
  players,
  currentVoterIndex,
  onVote,
  onFinishVoting,
}: VotingScreenProps) {
  const [phase, setPhase] = useState<"pass" | "vote">("pass");
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  
  const currentVoter = players[currentVoterIndex];
  const isLastVoter = currentVoterIndex === players.length - 1;

  const handleVoteSubmit = () => {
    if (selectedPlayer === null) return;
    onVote(currentVoter.id, selectedPlayer);
    setSelectedPlayer(null);
    setPhase("pass");
    
    if (isLastVoter) {
      onFinishVoting();
    }
  };

  if (phase === "pass") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="text-center space-y-8 max-w-md">
          <div className="w-32 h-32 mx-auto rounded-3xl bg-gradient-to-br from-amber-600 to-orange-700 border-4 border-amber-500 flex items-center justify-center animate-bounce-slow shadow-2xl shadow-amber-500/30">
            <span className="text-5xl">🗳️</span>
          </div>

          <div className="space-y-3">
            <p className="text-zinc-400 text-lg">Pass the phone to</p>
            <h1 className="text-4xl font-black text-white">{currentVoter.name}</h1>
            <p className="text-zinc-500">Time to vote for who you think is the Imposter!</p>
          </div>

          <button
            onClick={() => setPhase("vote")}
            className="w-full py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-bold text-xl rounded-xl hover:from-amber-400 hover:to-orange-500 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-500/25"
          >
            I&apos;m {currentVoter.name} — Vote Now
          </button>

          <div className="text-zinc-500 text-sm">
            Voter {currentVoterIndex + 1} of {players.length}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <p className="text-zinc-400">{currentVoter.name}&apos;s vote</p>
          <h1 className="text-3xl font-bold text-amber-400">Who is the Imposter?</h1>
        </div>

        {/* Player selection */}
        <div className="space-y-3">
          {players.map(player => {
            const isCurrentVoter = player.id === currentVoter.id;
            const isSelected = selectedPlayer === player.id;
            
            return (
              <button
                key={player.id}
                onClick={() => !isCurrentVoter && setSelectedPlayer(player.id)}
                disabled={isCurrentVoter}
                className={`w-full p-4 rounded-xl text-left transition-all ${
                  isCurrentVoter
                    ? "bg-zinc-900 text-zinc-600 cursor-not-allowed border-2 border-zinc-800"
                    : isSelected
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 text-black border-2 border-amber-400 shadow-lg shadow-amber-500/25 scale-[1.02]"
                    : "bg-zinc-800 text-white border-2 border-zinc-700 hover:border-zinc-600 hover:bg-zinc-750"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg">
                    {player.name}
                    {isCurrentVoter && " (You)"}
                  </span>
                  {isSelected && <span className="text-2xl">🎯</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Vote button */}
        <button
          onClick={handleVoteSubmit}
          disabled={selectedPlayer === null}
          className="w-full py-5 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold text-xl rounded-xl hover:from-red-400 hover:to-red-500 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {selectedPlayer === null
            ? "Select a player to vote"
            : isLastVoter
            ? "Submit Final Vote & See Results"
            : "Submit Vote & Pass Phone"}
        </button>

        <div className="text-center text-zinc-500 text-sm">
          🔒 Your vote is secret
        </div>
      </div>
    </div>
  );
}

