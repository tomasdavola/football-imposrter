"use client";

import { useState, useCallback, useRef } from "react";
import { GameState, GamePhase, GameOptions, createInitialGameState, setupGame } from "@/lib/gameState";
import { getRandomPlayer, getRandomPlayers, FootballPlayer } from "@/lib/players";
import SetupScreen, { SavedSettings } from "@/components/SetupScreen";
import PassPhoneScreen from "@/components/PassPhoneScreen";
import RevealScreen from "@/components/RevealScreen";
import DiscussionScreen from "@/components/DiscussionScreen";
import VotingScreen from "@/components/VotingScreen";
import ResultsScreen from "@/components/ResultsScreen";

// Using SavedSettings from SetupScreen for type consistency

export default function GamePage() {
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());
  const [showReveal, setShowReveal] = useState(false);
  const [currentVoterIndex, setCurrentVoterIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const lastSettingsRef = useRef<SavedSettings | null>(null);

  const handleStartGame = useCallback(async (playerNames: string[], discussionTime: number, options: GameOptions) => {
    // Save settings for "Play Again"
    lastSettingsRef.current = { playerNames, discussionTime, options };
    
    setIsLoading(true);
    try {
      const { sourceSelection } = options;
      // Fetch player(s) based on source
      const secretPlayer = await getRandomPlayer(sourceSelection);
      // Get additional players for potential "differentPlayers" troll mode
      const additionalPlayers: FootballPlayer[] | undefined = options.trollChance > 0 
        ? await getRandomPlayers(playerNames.length, sourceSelection) 
        : undefined;
      const newState = setupGame(playerNames, secretPlayer, discussionTime, options, additionalPlayers);
      setGameState(newState);
    } catch (error) {
      console.error("Failed to start game:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleReadyToReveal = useCallback(() => {
    setShowReveal(true);
  }, []);

  const handleHideAndPass = useCallback(() => {
    setShowReveal(false);
    setGameState(prev => {
      const nextIndex = prev.currentPlayerIndex + 1;
      if (nextIndex >= prev.players.length) {
        // All players have seen their roles, move to discussion
        return { ...prev, phase: "discussion" as GamePhase };
      }
      return { ...prev, currentPlayerIndex: nextIndex };
    });
  }, []);

  const handleEndDiscussion = useCallback(() => {
    setGameState(prev => {
      // Skip voting if option is enabled, go directly to results
      const nextPhase = prev.options.skipVoting ? "results" : "voting";
      return { ...prev, phase: nextPhase as GamePhase };
    });
    setCurrentVoterIndex(0);
  }, []);

  const handleVote = useCallback((voterId: number, votedForId: number) => {
    setGameState(prev => {
      const updatedPlayers = prev.players.map(p =>
        p.id === voterId ? { ...p, votedFor: votedForId } : p
      );
      return { ...prev, players: updatedPlayers };
    });
    setCurrentVoterIndex(prev => prev + 1);
  }, []);

  const handleFinishVoting = useCallback(() => {
    setGameState(prev => ({ ...prev, phase: "results" as GamePhase }));
  }, []);

  const handlePlayAgain = useCallback(async () => {
    if (lastSettingsRef.current) {
      setIsLoading(true);
      try {
        // Restart with same settings
        const { playerNames, discussionTime, options } = lastSettingsRef.current;
        const { sourceSelection } = options;
        const secretPlayer = await getRandomPlayer(sourceSelection);
        const additionalPlayers: FootballPlayer[] | undefined = options.trollChance > 0 
          ? await getRandomPlayers(playerNames.length, sourceSelection) 
          : undefined;
        const newState = setupGame(playerNames, secretPlayer, discussionTime, options, additionalPlayers);
        setGameState(newState);
      } catch (error) {
        console.error("Failed to restart game:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setGameState(createInitialGameState());
    }
    setShowReveal(false);
    setCurrentVoterIndex(0);
  }, []);

  const handleChangeSettings = useCallback(() => {
    setGameState(createInitialGameState());
    setShowReveal(false);
    setCurrentVoterIndex(0);
  }, []);

  const handleReroll = useCallback(async () => {
    if (lastSettingsRef.current) {
      setIsLoading(true);
      setShowReveal(false);
      try {
        // Restart with same settings but new player and roles
        const { playerNames, discussionTime, options } = lastSettingsRef.current;
        const { sourceSelection } = options;
        const secretPlayer = await getRandomPlayer(sourceSelection);
        const additionalPlayers: FootballPlayer[] | undefined = options.trollChance > 0 
          ? await getRandomPlayers(playerNames.length, sourceSelection) 
          : undefined;
        const newState = setupGame(playerNames, secretPlayer, discussionTime, options, additionalPlayers);
        setGameState(newState);
      } catch (error) {
        console.error("Failed to reroll:", error);
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  // Show loading screen while fetching players
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center animate-pulse">
            <span className="text-5xl">⚽</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Setting Up Game...</h2>
            <p className="text-zinc-400">Picking the secret player</p>
          </div>
          <div className="flex justify-center gap-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    );
  }

  // Render based on game phase
  switch (gameState.phase) {
    case "setup":
      return <SetupScreen onStartGame={handleStartGame} initialSettings={lastSettingsRef.current} />;

    case "passing":
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (showReveal) {
        return (
          <RevealScreen
            player={currentPlayer}
            secretPlayer={gameState.secretPlayer!}
            trollEvent={gameState.trollEvent}
            onHide={handleHideAndPass}
            onReroll={handleReroll}
            onSettings={handleChangeSettings}
          />
        );
      }
      return (
        <PassPhoneScreen
          player={currentPlayer}
          onReady={handleReadyToReveal}
          onSettings={handleChangeSettings}
        />
      );

    case "discussion":
      return (
        <DiscussionScreen
          players={gameState.players}
          timeSeconds={gameState.discussionTimeSeconds}
          noTimer={gameState.options.noTimer}
          skipVoting={gameState.options.skipVoting}
          startingPlayerIndex={gameState.startingPlayerIndex}
          onEndDiscussion={handleEndDiscussion}
          onSettings={handleChangeSettings}
        />
      );

    case "voting":
      return (
        <VotingScreen
          players={gameState.players}
          currentVoterIndex={currentVoterIndex}
          onVote={handleVote}
          onFinishVoting={handleFinishVoting}
          onSettings={handleChangeSettings}
        />
      );

    case "results":
      return (
        <ResultsScreen
          players={gameState.players}
          secretPlayer={gameState.secretPlayer!}
          imposterIndices={gameState.imposterIndices}
          skipVoting={gameState.options.skipVoting}
          trollEvent={gameState.trollEvent}
          onPlayAgain={handlePlayAgain}
          onChangeSettings={handleChangeSettings}
        />
      );

    default:
      return <SetupScreen onStartGame={handleStartGame} initialSettings={lastSettingsRef.current} />;
  }
}

