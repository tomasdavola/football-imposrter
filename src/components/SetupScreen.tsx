"use client";

import { useState } from "react";
import Image from "next/image";
import { GameOptions, TrollEventType, TROLL_EVENT_INFO, ALL_TROLL_EVENTS } from "@/lib/gameState";
import { PlayerSourceSelection, CLUBS } from "@/lib/players";

export interface SavedSettings {
  playerNames: string[];
  discussionTime: number;
  options: GameOptions;
}

interface SetupScreenProps {
  onStartGame: (playerNames: string[], discussionTime: number, options: GameOptions) => void;
  initialSettings?: SavedSettings | null;
}

export default function SetupScreen({ onStartGame, initialSettings }: SetupScreenProps) {
  // Initialize from saved settings if available
  const [playerCount, setPlayerCount] = useState(initialSettings?.playerNames.length ?? 4);
  const [playerNames, setPlayerNames] = useState<string[]>(initialSettings?.playerNames ?? ["", "", "", ""]);
  const [discussionTime, setDiscussionTime] = useState(initialSettings?.options.noTimer ? 180 : (initialSettings?.discussionTime ?? 180));
  const [noTimer, setNoTimer] = useState(initialSettings?.options.noTimer ?? false);
  const [skipVoting, setSkipVoting] = useState(initialSettings?.options.skipVoting ?? true);
  const [imposterCount, setImposterCount] = useState(initialSettings?.options.imposterCount ?? 1);
  const [imposterLessLikelyToStart, setImposterLessLikelyToStart] = useState(initialSettings?.options.imposterLessLikelyToStart ?? true);
  const [trollChance, setTrollChance] = useState(initialSettings?.options.trollChance ?? 25);
  const [enabledTrollEvents, setEnabledTrollEvents] = useState<TrollEventType[]>(
    initialSettings?.options.enabledTrollEvents ?? ALL_TROLL_EVENTS
  );
  const [showAdvanced, setShowAdvanced] = useState(
    (initialSettings?.options.imposterLessLikelyToStart || (initialSettings?.options.trollChance ?? 0) > 0) ?? false
  );
  const [step, setStep] = useState<"count" | "names" | "source">("count");
  
  // Multi-select source state
  const [selectCurrentStars, setSelectCurrentStars] = useState(initialSettings?.options.sourceSelection.currentStars ?? true);
  const [selectLegends, setSelectLegends] = useState(initialSettings?.options.sourceSelection.legends ?? true);
  const [selectedClubs, setSelectedClubs] = useState<string[]>(initialSettings?.options.sourceSelection.clubs ?? []);
  
  // Max imposters is n-3 if troll mode enabled (to allow +1 imposter event), otherwise n-2
  const trollEnabled = trollChance > 0;
  const maxImposters = Math.max(1, playerCount - (trollEnabled ? 3 : 2));

  const handlePlayerCountChange = (count: number) => {
    const newCount = Math.max(3, Math.min(10, count));
    setPlayerCount(newCount);
    setPlayerNames(prev => {
      const newNames = [...prev];
      while (newNames.length < newCount) newNames.push("");
      while (newNames.length > newCount) newNames.pop();
      return newNames;
    });
    // Adjust imposter count if it exceeds new max
    const newMaxImposters = Math.max(1, newCount - (trollEnabled ? 3 : 2));
    if (imposterCount > newMaxImposters) {
      setImposterCount(newMaxImposters);
    }
  };
  
  const handleTrollChanceChange = (chance: number) => {
    const wasEnabled = trollChance > 0;
    const willBeEnabled = chance > 0;
    setTrollChance(chance);
    // Adjust imposter count if troll mode is being enabled and it exceeds new max
    if (!wasEnabled && willBeEnabled) {
      const newMaxImposters = Math.max(1, playerCount - 3);
      if (imposterCount > newMaxImposters) {
        setImposterCount(newMaxImposters);
      }
    }
  };

  const handleNameChange = (index: number, name: string) => {
    setPlayerNames(prev => {
      const newNames = [...prev];
      newNames[index] = name;
      return newNames;
    });
  };

  const toggleClub = (clubId: string) => {
    setSelectedClubs(prev => 
      prev.includes(clubId) 
        ? prev.filter(c => c !== clubId)
        : [...prev, clubId]
    );
  };

  const toggleTrollEvent = (event: TrollEventType) => {
    setEnabledTrollEvents(prev => 
      prev.includes(event)
        ? prev.filter(e => e !== event)
        : [...prev, event]
    );
  };

  const hasAnySourceSelected = selectCurrentStars || selectLegends || selectedClubs.length > 0;

  const handleStart = () => {
    // Fill empty names with defaults
    const finalNames = playerNames.map((name, i) => 
      name.trim() || `Player ${i + 1}`
    );
    
    const sourceSelection: PlayerSourceSelection = {
      currentStars: selectCurrentStars,
      legends: selectLegends,
      clubs: selectedClubs,
    };
    
    onStartGame(finalNames, noTimer ? 0 : discussionTime, {
      noTimer,
      skipVoting,
      imposterCount,
      sourceSelection,
      imposterLessLikelyToStart,
      trollChance,
      enabledTrollEvents,
    });
  };

  const allNamesValid = playerNames.every((_, i) => true); // Allow empty names (will default)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      {step === "count" ? (
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-emerald-400">How many players?</h2>
            <p className="text-zinc-400">3-10 players recommended</p>
          </div>

          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => handlePlayerCountChange(playerCount - 1)}
              className="w-16 h-16 rounded-full bg-zinc-800 hover:bg-zinc-700 text-3xl font-bold text-emerald-400 transition-all hover:scale-110 active:scale-95 border-2 border-zinc-700"
              disabled={playerCount <= 3}
            >
              −
            </button>
            <div className="text-7xl font-black text-white w-24 text-center tabular-nums">
              {playerCount}
            </div>
            <button
              onClick={() => handlePlayerCountChange(playerCount + 1)}
              className="w-16 h-16 rounded-full bg-zinc-800 hover:bg-zinc-700 text-3xl font-bold text-emerald-400 transition-all hover:scale-110 active:scale-95 border-2 border-zinc-700"
              disabled={playerCount >= 10}
            >
              +
            </button>
          </div>

          {/* Imposter Count */}
          <div className="space-y-3">
            <label className="block text-center text-zinc-400">Imposters</label>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setImposterCount(Math.max(1, imposterCount - 1))}
                className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xl font-bold text-red-400 transition-all hover:scale-110 active:scale-95 border-2 border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={imposterCount <= 1}
              >
                −
              </button>
              <div className="text-4xl font-black text-red-400 w-12 text-center tabular-nums">
                {imposterCount}
              </div>
              <button
                onClick={() => setImposterCount(Math.min(maxImposters, imposterCount + 1))}
                className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xl font-bold text-red-400 transition-all hover:scale-110 active:scale-95 border-2 border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={imposterCount >= maxImposters}
              >
                +
              </button>
            </div>
            <p className="text-xs text-zinc-500 text-center">Max {maxImposters} imposter{maxImposters > 1 ? 's' : ''} for {playerCount} players</p>
          </div>

          {/* Discussion Time */}
          <div className="space-y-3">
            <label className="block text-center text-zinc-400">Discussion Time</label>
            <div className="flex justify-center gap-2 flex-wrap">
              <button
                onClick={() => setNoTimer(true)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  noTimer
                    ? "bg-amber-500 text-black"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                ∞ None
              </button>
              {[60, 120, 180, 300].map(time => (
                <button
                  key={time}
                  onClick={() => { setDiscussionTime(time); setNoTimer(false); }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    !noTimer && discussionTime === time
                      ? "bg-emerald-500 text-black"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {time / 60}m
                </button>
              ))}
            </div>
          </div>

          {/* Skip Voting Toggle */}
          <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
            <div>
              <p className="text-zinc-200 font-medium">Manual Voting (IRL)</p>
              <p className="text-zinc-500 text-sm">Skip in-app voting, do it in person</p>
            </div>
            <button
              onClick={() => setSkipVoting(!skipVoting)}
              className={`w-14 h-8 rounded-full transition-all relative ${
                skipVoting ? "bg-emerald-500" : "bg-zinc-700"
              }`}
            >
              <div
                className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all ${
                  skipVoting ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>

          {/* Advanced Settings Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full py-3 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center gap-2"
          >
            <span>{showAdvanced ? "▼" : "▶"}</span>
            <span className="font-medium">Advanced Settings</span>
          </button>

          {/* Advanced Settings */}
          {showAdvanced && (
            <div className="space-y-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
              {/* Imposter Less Likely to Start */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-200 font-medium text-sm">Imposter Less Likely to Start</p>
                  <p className="text-zinc-500 text-xs">Imposters have 50% less chance of starting first</p>
                </div>
                <button
                  onClick={() => setImposterLessLikelyToStart(!imposterLessLikelyToStart)}
                  className={`w-12 h-6 rounded-full transition-all relative ${
                    imposterLessLikelyToStart ? "bg-amber-500" : "bg-zinc-700"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all ${
                      imposterLessLikelyToStart ? "left-6" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Troll Mode Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-200 font-medium text-sm">🎲 Troll Mode</p>
                    <p className="text-zinc-500 text-xs">Chance of chaotic twist each round</p>
                  </div>
                  <span className={`text-lg font-bold tabular-nums ${trollChance > 0 ? "text-purple-400" : "text-zinc-500"}`}>
                    {trollChance}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={trollChance}
                  onChange={(e) => handleTrollChanceChange(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  style={{
                    background: `linear-gradient(to right, rgb(168, 85, 247) 0%, rgb(168, 85, 247) ${trollChance}%, rgb(63, 63, 70) ${trollChance}%, rgb(63, 63, 70) 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Off</span>
                  <span>Chaos</span>
                </div>
              </div>

              {trollEnabled && (
                <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/30 text-xs space-y-2">
                  <p className="font-medium text-purple-300">Select possible twists:</p>
                  <div className="space-y-1.5">
                    {ALL_TROLL_EVENTS.map((event) => (
                      <button
                        key={event}
                        onClick={() => toggleTrollEvent(event)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all cursor-pointer ${
                          enabledTrollEvents.includes(event)
                            ? "bg-purple-500/30 text-purple-300"
                            : "bg-zinc-800/50 text-zinc-500"
                        }`}
                      >
                        <span className={`w-4 h-4 rounded border-2 flex items-center justify-center text-[10px] ${
                          enabledTrollEvents.includes(event)
                            ? "border-purple-400 bg-purple-500 text-white"
                            : "border-zinc-600"
                        }`}>
                          {enabledTrollEvents.includes(event) && "✓"}
                        </span>
                        <span>{TROLL_EVENT_INFO[event].emoji}</span>
                        <span className="flex-1 text-left">{TROLL_EVENT_INFO[event].description}</span>
                      </button>
                    ))}
                  </div>
                  {enabledTrollEvents.length === 0 && (
                    <p className="text-amber-400 text-center mt-2">⚠️ Select at least one event</p>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setStep("names")}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-black font-bold text-xl rounded-xl hover:from-emerald-400 hover:to-green-500 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/25"
          >
            Next →
          </button>
        </div>
      ) : step === "names" ? (
        <div className="w-full max-w-md space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-emerald-400">Enter Player Names</h2>
            <p className="text-zinc-400">Or leave blank for defaults</p>
          </div>

          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
            {playerNames.map((name, index) => (
              <div key={index} className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">
                  {index + 1}.
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(index, e.target.value)}
                  placeholder={`Player ${index + 1}`}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-800/50 border-2 border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none transition-colors"
                  maxLength={20}
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("count")}
              className="flex-1 py-4 bg-zinc-800 text-zinc-300 font-bold text-lg rounded-xl hover:bg-zinc-700 transition-all"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep("source")}
              disabled={!allNamesValid}
              className="flex-[2] py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-black font-bold text-xl rounded-xl hover:from-emerald-400 hover:to-green-500 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      ) : step === "source" ? (
        <div className="w-full max-w-md space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-emerald-400">Choose Player Sources</h2>
            <p className="text-zinc-400">Select any combination (at least one)</p>
          </div>

          {/* Premade Lists Section */}
          <div className="space-y-3">
            <h3 className="text-zinc-500 text-sm font-medium uppercase tracking-wide">Premade Lists</h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Current Stars */}
              <button
                onClick={() => setSelectCurrentStars(!selectCurrentStars)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectCurrentStars
                    ? "border-orange-500 bg-orange-500/10"
                    : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                }`}
              >
                <div className="text-2xl mb-1">🔥</div>
                <div className="font-bold text-white text-sm">Current Stars</div>
                <div className="text-zinc-400 text-xs">Today&apos;s best</div>
              </button>

              {/* Legends */}
              <button
                onClick={() => setSelectLegends(!selectLegends)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectLegends
                    ? "border-yellow-500 bg-yellow-500/10"
                    : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                }`}
              >
                <div className="text-2xl mb-1">👑</div>
                <div className="font-bold text-white text-sm">Legends</div>
                <div className="text-zinc-400 text-xs">All-time greats</div>
              </button>
            </div>
          </div>

          {/* Clubs Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-zinc-500 text-sm font-medium uppercase tracking-wide">Live Club Data</h3>
              <button
                onClick={() => {
                  if (selectedClubs.length === CLUBS.length) {
                    setSelectedClubs([]);
                  } else {
                    setSelectedClubs(CLUBS.map(c => c.id));
                  }
                }}
                className="text-xs text-emerald-400 hover:text-emerald-300"
              >
                {selectedClubs.length === CLUBS.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto p-1">
              {CLUBS.map((club) => (
                <button
                  key={club.id}
                  onClick={() => toggleClub(club.id)}
                  className={`p-2 rounded-lg transition-all flex flex-col items-center gap-1.5 ${
                    selectedClubs.includes(club.id)
                      ? "bg-emerald-500/20 border-2 border-emerald-500/50 scale-105"
                      : "bg-zinc-800 border-2 border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700/50"
                  }`}
                >
                  <div className="w-10 h-10 relative">
                    <Image
                      src={club.badge}
                      alt={club.name}
                      fill
                      className="object-contain"
                      sizes="40px"
                    />
                  </div>
                  <div className={`text-xs font-medium truncate w-full text-center ${
                    selectedClubs.includes(club.id) ? "text-emerald-400" : "text-zinc-400"
                  }`}>
                    {club.shortName}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Warning if nothing selected */}
          {!hasAnySourceSelected && (
            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30 text-xs text-amber-400 text-center">
              Please select at least one source
            </div>
          )}

          {/* Selected count */}
          <div className="text-center text-sm text-zinc-500">
            {selectCurrentStars && selectLegends && selectedClubs.length === 0 && "All Stars selected (60 players)"}
            {selectCurrentStars && !selectLegends && selectedClubs.length === 0 && "Current Stars only (30 players)"}
            {!selectCurrentStars && selectLegends && selectedClubs.length === 0 && "Legends only (30 players)"}
            {selectedClubs.length > 0 && (
              <>
                {selectedClubs.length} club{selectedClubs.length > 1 ? "s" : ""} selected
                {(selectCurrentStars || selectLegends) && " + "}
                {selectCurrentStars && selectLegends && "All Stars"}
                {selectCurrentStars && !selectLegends && "Current Stars"}
                {!selectCurrentStars && selectLegends && "Legends"}
              </>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("names")}
              className="flex-1 py-4 bg-zinc-800 text-zinc-300 font-bold text-lg rounded-xl hover:bg-zinc-700 transition-all"
            >
              ← Back
            </button>
            <button
              onClick={handleStart}
              disabled={!hasAnySourceSelected}
              className="flex-[2] py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-black font-bold text-xl rounded-xl hover:from-emerald-400 hover:to-green-500 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Game ⚽
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
