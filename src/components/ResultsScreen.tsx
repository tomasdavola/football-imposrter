"use client";

import { Player, calculateVotes, TrollEvent } from "@/lib/gameState";
import { FootballPlayer } from "@/lib/players";

interface ResultsScreenProps {
  players: Player[];
  secretPlayer: FootballPlayer;
  imposterIndices: number[];
  skipVoting: boolean;
  trollEvent: TrollEvent;
  onPlayAgain: () => void;
  onChangeSettings: () => void;
}

const trollEventLabels: Record<NonNullable<TrollEvent>, { emoji: string; title: string; description: string }> = {
  extraImposter: { emoji: "👥", title: "Extra Imposter!", description: "An additional imposter was added" },
  allImposters: { emoji: "🔴", title: "Everyone was an Imposter!", description: "There was no one to trust" },
  noImposters: { emoji: "🟢", title: "No Imposters!", description: "There was no imposter this round" },
  differentPlayers: { emoji: "🎲", title: "Different Players!", description: "Everyone had a different footballer" },
};

export default function ResultsScreen({
  players,
  secretPlayer,
  imposterIndices,
  skipVoting,
  trollEvent,
  onPlayAgain,
  onChangeSettings,
}: ResultsScreenProps) {
  const voteResults = calculateVotes(players);
  const imposters = imposterIndices.map(idx => players[idx]);
  
  // Find who got the most votes (eliminated player) - only relevant if voting happened
  const eliminatedPlayerId = voteResults[0]?.playerId;
  const eliminatedPlayer = !skipVoting ? players.find(p => p.id === eliminatedPlayerId) : null;
  
  // Check if imposter was caught (only relevant if voting happened)
  const imposterCaught = !skipVoting && (eliminatedPlayer?.isImposter ?? false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Troll event banner */}
        {trollEvent && (
          <div className="p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/50 text-center animate-pulse">
            <span className="text-3xl">{trollEventLabels[trollEvent].emoji}</span>
            <p className="text-purple-300 font-bold text-lg mt-1">{trollEventLabels[trollEvent].title}</p>
            <p className="text-purple-400 text-sm">{trollEventLabels[trollEvent].description}</p>
          </div>
        )}

        {/* Result banner - only show win/lose if voting happened */}
        {!skipVoting ? (
        <div className="text-center space-y-4">
          <div
            className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center shadow-2xl ${
              imposterCaught
                ? "bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/50"
                : "bg-gradient-to-br from-red-500 to-red-700 shadow-red-500/50"
            }`}
          >
            <span className="text-6xl">{imposterCaught ? "🏆" : "🕵️"}</span>
          </div>

          <h1
            className={`text-4xl font-black ${
              imposterCaught ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {imposterCaught ? "IMPOSTER CAUGHT!" : "IMPOSTER WINS!"}
          </h1>
          
          <p className="text-xl text-zinc-300">
            {imposterCaught
              ? "The crew found the imposter!"
              : "The imposter escaped detection!"}
          </p>
        </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-32 h-32 mx-auto rounded-full flex items-center justify-center shadow-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/50">
              <span className="text-6xl">🎭</span>
            </div>
            <h1 className="text-4xl font-black text-amber-400">
              GAME OVER!
            </h1>
            <p className="text-xl text-zinc-300">
              Time to reveal the truth...
            </p>
          </div>
        )}

        {/* Eliminated player - only show if voting happened */}
        {!skipVoting && eliminatedPlayer && (
        <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700 text-center">
          <p className="text-zinc-400 text-sm mb-2">Most votes went to:</p>
            <p className="text-2xl font-bold text-white">{eliminatedPlayer.name}</p>
          <p
            className={`text-lg font-medium mt-1 ${
                eliminatedPlayer.isImposter ? "text-red-400" : "text-emerald-400"
            }`}
          >
              {eliminatedPlayer.isImposter ? "🕵️ Was the Imposter!" : "✅ Was innocent!"}
          </p>
        </div>
        )}

        {/* Vote breakdown - only show if voting happened */}
        {!skipVoting && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-zinc-400 text-center">Vote Results</h3>
          <div className="space-y-2">
            {voteResults.map(({ playerId, votes }) => {
              const player = players.find(p => p.id === playerId);
              if (!player) return null;
              const maxVotes = voteResults[0]?.votes || 1;
              const barWidth = (votes / maxVotes) * 100;
              
              return (
                <div key={playerId} className="flex items-center gap-3">
                  <span className="w-24 truncate text-sm text-zinc-300">
                    {player.name}
                    {player.isImposter && " 🕵️"}
                  </span>
                  <div className="flex-1 h-6 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        player.isImposter ? "bg-red-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-zinc-400 w-8 text-right">
                    {votes}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* Reveal the imposters and player */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-br from-red-900/30 to-red-950/30 rounded-xl border border-red-800/50 text-center">
            {imposters.length === 0 ? (
              <>
                <p className="text-emerald-400 text-sm mb-1">No Imposters!</p>
                <p className="text-lg font-bold text-white">Everyone was innocent</p>
                <span className="text-2xl">😇</span>
              </>
            ) : imposters.length === players.length ? (
              <>
                <p className="text-red-400 text-sm mb-1">Everyone was an Imposter!</p>
                <p className="text-lg font-bold text-white">No one knew the player</p>
                <span className="text-2xl">🔴</span>
              </>
            ) : (
              <>
                <p className="text-red-400 text-sm mb-1">
                  {imposters.length > 1 ? "The Imposters were" : "The Imposter was"}
                </p>
                <div className="space-y-1">
                  {imposters.map(imposter => (
                    <p key={imposter.id} className="text-lg font-bold text-white">{imposter.name}</p>
                  ))}
                </div>
            <span className="text-2xl">🕵️</span>
              </>
            )}
          </div>
          <div className="p-4 bg-gradient-to-br from-emerald-900/30 to-emerald-950/30 rounded-xl border border-emerald-800/50 text-center">
            <p className="text-emerald-400 text-sm mb-1">
              {trollEvent === "differentPlayers" ? "The Players were" : "The Player was"}
            </p>
            {trollEvent === "differentPlayers" ? (
              <p className="text-lg font-bold text-white">Everyone had a different one!</p>
            ) : (
              <>
                {secretPlayer.photo && (
                  <div className="w-16 h-16 mx-auto mb-2 rounded-full overflow-hidden border-2 border-emerald-500 bg-zinc-800">
                    <img 
                      src={secretPlayer.photo} 
                      alt={secretPlayer.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
            <p className="text-lg font-bold text-white">{secretPlayer.name}</p>
              </>
            )}
            {!secretPlayer.photo && <span className="text-2xl">⚽</span>}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onChangeSettings}
            className="flex-1 py-4 bg-zinc-800 text-zinc-300 font-bold text-lg rounded-xl hover:bg-zinc-700 transition-all border border-zinc-700"
          >
            ⚙️ Settings
          </button>
        <button
          onClick={onPlayAgain}
            className="flex-[2] py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-black font-bold text-xl rounded-xl hover:from-emerald-400 hover:to-green-500 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/25"
        >
          🔄 Play Again
        </button>
        </div>
      </div>
    </div>
  );
}

