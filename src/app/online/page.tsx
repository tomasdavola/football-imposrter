"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { RoomState, RoomSettings, RoomPlayer } from "@/lib/roomState";
import { getDefaultSourceSelection, CLUBS } from "@/lib/players";
import { TrollEventType, TROLL_EVENT_INFO, ALL_TROLL_EVENTS } from "@/lib/gameState";
import { getPusherClient, getRoomChannel, ROOM_EVENTS } from "@/lib/pusher";
import type PusherClient from "pusher-js";
import type { Channel } from "pusher-js";

type OnlinePhase = "menu" | "create" | "join" | "lobby" | "game";

export default function OnlinePage() {
  const [phase, setPhase] = useState<OnlinePhase>("menu");
  const [room, setRoom] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [initialJoinCode, setInitialJoinCode] = useState<string | null>(null);
  
  // Pusher refs
  const pusherRef = useRef<PusherClient | null>(null);
  const channelRef = useRef<Channel | null>(null);

  // Get current player
  const currentPlayer = room?.players.find(p => p.id === playerId);
  const isAdmin = currentPlayer?.isAdmin ?? false;

  // Check for join code in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get("join");
    if (joinCode) {
      setInitialJoinCode(joinCode.toUpperCase());
      setPhase("join");
      // Clean up URL without reload
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Fetch room state (sanitized for current player)
  const fetchRoom = async (roomCode: string, pId: string) => {
    try {
      const res = await fetch(`/api/room/${roomCode}?playerId=${pId}`);
      if (res.ok) {
        const data = await res.json();
        setRoom(data.room);
      }
    } catch (err) {
      console.error("Failed to fetch room:", err);
    }
  };

  // Subscribe to room updates via WebSocket
  useEffect(() => {
    if (!room?.code || !playerId) return;

    // Initialize Pusher client
    if (!pusherRef.current) {
      pusherRef.current = getPusherClient();
    }

    const pusher = pusherRef.current;
    const channelName = getRoomChannel(room.code);
    const currentRoomCode = room.code;
    const currentPlayerId = playerId;

    // Subscribe to room channel
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    // Handle connection state
    channel.bind("pusher:subscription_succeeded", () => {
      setConnected(true);
      console.log("Connected to room:", room.code);
    });

    // Handle room updates - fetch fresh sanitized data for this player
    const handleRoomUpdate = (data: { event: string; phase?: string; updatedAt: number }) => {
      console.log("Room update notification:", data.event);
      // Fetch our sanitized view of the room
      fetchRoom(currentRoomCode, currentPlayerId);
    };

    // Handle player left/kicked - check if we were kicked
    const handlePlayerLeft = (data: { event: string; kickedPlayerId?: string; updatedAt: number }) => {
      console.log("Player left notification:", data);
      if (data.kickedPlayerId === currentPlayerId) {
        // We were kicked! Redirect to menu
        alert("You have been removed from the room by the admin.");
        setRoom(null);
        setPlayerId(null);
        setPhase("menu");
        return;
      }
      // Otherwise just refresh room
      fetchRoom(currentRoomCode, currentPlayerId);
    };

    // Bind to all room events
    channel.bind(ROOM_EVENTS.ROOM_UPDATED, handleRoomUpdate);
    channel.bind(ROOM_EVENTS.PLAYER_JOINED, handleRoomUpdate);
    channel.bind(ROOM_EVENTS.PLAYER_LEFT, handlePlayerLeft);
    channel.bind(ROOM_EVENTS.GAME_STARTED, handleRoomUpdate);
    channel.bind(ROOM_EVENTS.PLAYER_REVEALED, handleRoomUpdate);
    channel.bind(ROOM_EVENTS.PHASE_CHANGED, handleRoomUpdate);

    // Cleanup on unmount or room change
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      channelRef.current = null;
      setConnected(false);
    };
  }, [room?.code, playerId]);

  // Update phase based on room state
  useEffect(() => {
    if (room) {
      if (room.phase === "waiting") {
        setPhase("lobby");
      } else {
        setPhase("game");
      }
    }
  }, [room?.phase]);

  // Handle tab close / browser close - leave the room
  useEffect(() => {
    if (!room?.code || !playerId) return;

    const roomCode = room.code;
    const pId = playerId;

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable delivery during page unload
      // This POSTs to a dedicated leave endpoint since sendBeacon only does POST
      const url = `/api/room/${roomCode}/leave?playerId=${pId}`;
      navigator.sendBeacon(url, "");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [room?.code, playerId]);

  // Menu screen
  if (phase === "menu") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <span className="text-5xl">📱</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Online Mode</h1>
            <p className="text-zinc-400">Play on multiple devices</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setPhase("create")}
              className="w-full py-5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-xl rounded-2xl hover:from-purple-400 hover:to-indigo-500 transition-all"
            >
              🏠 Create Room
            </button>
            
            <button
              onClick={() => setPhase("join")}
              className="w-full py-5 bg-zinc-800 text-white font-bold text-xl rounded-2xl hover:bg-zinc-700 transition-all border-2 border-zinc-700"
            >
              🚪 Join Room
            </button>
          </div>

          <Link 
            href="/game"
            className="block text-center text-zinc-500 hover:text-zinc-400 transition-colors"
          >
            ← Back to Local Mode
          </Link>
        </div>
      </div>
    );
  }

  // Create room screen
  if (phase === "create") {
    return (
      <CreateRoomScreen
        onBack={() => setPhase("menu")}
        onCreated={(code, id, roomState) => {
          setRoom(roomState);
          setPlayerId(id);
          setPhase("lobby");
        }}
        error={error}
        setError={setError}
        loading={loading}
        setLoading={setLoading}
      />
    );
  }

  // Join room screen
  if (phase === "join") {
    return (
      <JoinRoomScreen
        onBack={() => { setPhase("menu"); setInitialJoinCode(null); }}
        onJoined={(id, roomState) => {
          setRoom(roomState);
          setPlayerId(id);
          setPhase("lobby");
          setInitialJoinCode(null);
        }}
        error={error}
        setError={setError}
        loading={loading}
        setLoading={setLoading}
        initialCode={initialJoinCode}
      />
    );
  }

  // Lobby screen
  if (phase === "lobby" && room) {
    return (
      <LobbyScreen
        room={room}
        playerId={playerId!}
        isAdmin={isAdmin}
        connected={connected}
        onRoomUpdate={setRoom}
        onLeave={() => {
          setRoom(null);
          setPlayerId(null);
          setPhase("menu");
        }}
        error={error}
        setError={setError}
      />
    );
  }

  // Game screen
  if (phase === "game" && room && playerId) {
    return (
      <GameScreen
        room={room}
        playerId={playerId}
        isAdmin={isAdmin}
        connected={connected}
        onRoomUpdate={setRoom}
        onLeave={() => {
          setRoom(null);
          setPlayerId(null);
          setPhase("menu");
        }}
      />
    );
  }

  return null;
}

// ============================================
// CREATE ROOM SCREEN
// ============================================
interface CreateRoomScreenProps {
  onBack: () => void;
  onCreated: (code: string, playerId: string, room: RoomState) => void;
  error: string | null;
  setError: (error: string | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

function CreateRoomScreen({ onBack, onCreated, error, setError, loading, setLoading }: CreateRoomScreenProps) {
  const [name, setName] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create with default settings - admin can adjust in lobby
      const settings: RoomSettings = {
        discussionTime: 180, // 3 minutes default
        imposterCount: 1,
        imposterLessLikelyToStart: true,
        trollChance: 25,
        enabledTrollEvents: ALL_TROLL_EVENTS,
        sourceSelection: {
          currentStars: true,
          legends: true,
          clubs: [],
        },
      };

      const res = await fetch("/api/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminName: name, settings }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create room");
        return;
      }

      onCreated(data.code, data.playerId, data.room);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-4">
            <span className="text-4xl">🏠</span>
          </div>
          <h1 className="text-2xl font-bold text-purple-400">Create Room</h1>
          <p className="text-zinc-400">Enter your name to create a room</p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-zinc-400 text-sm mb-2">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && name.trim() && handleCreate()}
              placeholder="Enter your name"
              className="w-full px-4 py-4 bg-zinc-800 border-2 border-zinc-700 rounded-xl text-white text-lg placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
              maxLength={20}
              autoFocus
            />
          </div>

          <p className="text-zinc-500 text-sm text-center">
            You can configure game settings after players join
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-4 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700 transition-all"
          >
            ← Back
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="flex-1 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-400 hover:to-indigo-500 transition-all disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// JOIN ROOM SCREEN
// ============================================
interface JoinRoomScreenProps {
  onBack: () => void;
  onJoined: (playerId: string, room: RoomState) => void;
  error: string | null;
  setError: (error: string | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  initialCode?: string | null;
}

function JoinRoomScreen({ onBack, onJoined, error, setError, loading, setLoading, initialCode }: JoinRoomScreenProps) {
  const [code, setCode] = useState(initialCode || "");
  const [name, setName] = useState("");

  const handleJoin = async () => {
    if (!code.trim() || code.length !== 6) {
      setError("Please enter a valid 6-character room code");
      return;
    }
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/room/${code.toUpperCase()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to join room");
        return;
      }

      onJoined(data.playerId, data.room);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-purple-400">Join Room</h1>
          <p className="text-zinc-400">Enter the room code</p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-zinc-400 text-sm mb-2">Room Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABC123"
              className="w-full px-4 py-4 bg-zinc-800 border-2 border-zinc-700 rounded-xl text-white text-center text-2xl font-mono tracking-widest placeholder-zinc-600 focus:border-purple-500 focus:outline-none uppercase"
              maxLength={6}
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-sm mb-2">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 bg-zinc-800 border-2 border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
              maxLength={20}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-4 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700 transition-all"
          >
            ← Back
          </button>
          <button
            onClick={handleJoin}
            disabled={loading || !code.trim() || !name.trim()}
            className="flex-1 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-400 hover:to-indigo-500 transition-all disabled:opacity-50"
          >
            {loading ? "Joining..." : "Join Room"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// LOBBY SCREEN
// ============================================
interface LobbyScreenProps {
  room: RoomState;
  playerId: string;
  isAdmin: boolean;
  connected: boolean;
  onRoomUpdate: (room: RoomState) => void;
  onLeave: () => void;
  error: string | null;
  setError: (error: string | null) => void;
}

function LobbyScreen({ room, playerId, isAdmin, connected, onRoomUpdate, onLeave, error, setError }: LobbyScreenProps) {
  const [savingSettings, setSavingSettings] = useState(false);
  const [loadingStart, setLoadingStart] = useState(false);
  const [kickingPlayer, setKickingPlayer] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(isAdmin); // Show settings by default for admin
  const [copied, setCopied] = useState(false);
  const [showSourcePopup, setShowSourcePopup] = useState(false);

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = room.code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareRoom = async () => {
    const shareUrl = `${window.location.origin}/online?join=${room.code}`;
    const shareData = {
      title: "Join my Football Imposter game!",
      text: `Join my game! Room code: ${room.code}`,
      url: shareUrl,
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy link to clipboard
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      // User cancelled or error - silently ignore
      console.log("Share cancelled or failed:", err);
    }
  };
  
  // Local settings state (for admin to edit)
  const [discussionTime, setDiscussionTime] = useState(room.settings.discussionTime);
  const [noTimer, setNoTimer] = useState(room.settings.discussionTime === 0);
  const [imposterCount, setImposterCount] = useState(room.settings.imposterCount);
  const [trollChance, setTrollChance] = useState(room.settings.trollChance);
  const [enabledTrollEvents, setEnabledTrollEvents] = useState<TrollEventType[]>(
    room.settings.enabledTrollEvents || ALL_TROLL_EVENTS
  );
  const [imposterLessLikely, setImposterLessLikely] = useState(room.settings.imposterLessLikelyToStart);
  const [selectCurrentStars, setSelectCurrentStars] = useState(room.settings.sourceSelection.currentStars);
  const [selectLegends, setSelectLegends] = useState(room.settings.sourceSelection.legends);
  const [selectedClubs, setSelectedClubs] = useState<string[]>(room.settings.sourceSelection.clubs || []);

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

  // Sync local state when room settings change (from polling)
  useEffect(() => {
    if (!showSettings) {
      setDiscussionTime(room.settings.discussionTime);
      setNoTimer(room.settings.discussionTime === 0);
      setImposterCount(room.settings.imposterCount);
      setTrollChance(room.settings.trollChance);
      setImposterLessLikely(room.settings.imposterLessLikelyToStart);
      setSelectCurrentStars(room.settings.sourceSelection.currentStars);
      setSelectLegends(room.settings.sourceSelection.legends);
    }
  }, [room.settings, showSettings]);

  // Max imposters based on player count
  const maxImposters = Math.max(1, room.players.length - 2);

  const handleUpdateSettings = async () => {
    setSavingSettings(true);
    setError(null);

    try {
      const res = await fetch(`/api/room/${room.code}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateSettings",
          playerId,
          settings: {
            discussionTime: noTimer ? 0 : discussionTime,
            imposterCount: Math.min(imposterCount, maxImposters),
            imposterLessLikelyToStart: imposterLessLikely,
            trollChance,
            enabledTrollEvents,
            sourceSelection: {
              currentStars: selectCurrentStars,
              legends: selectLegends,
              clubs: selectedClubs,
            },
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update settings");
        return;
      }

      onRoomUpdate(data.room);
      setShowSettings(false);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleStart = async () => {
    if (room.players.length < 3) {
      setError("Need at least 3 players to start");
      return;
    }

    setLoadingStart(true);
    setError(null);

    try {
      const res = await fetch(`/api/room/${room.code}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", playerId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start game");
        return;
      }

      onRoomUpdate(data.room);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoadingStart(false);
    }
  };

  const handleLeave = async () => {
    try {
      await fetch(`/api/room/${room.code}?playerId=${playerId}`, {
        method: "DELETE",
      });
    } catch (err) {
      // Ignore errors on leave
    }
    onLeave();
  };

  const handleKick = async (targetPlayerId: string) => {
    if (!isAdmin) return;
    
    setKickingPlayer(targetPlayerId);
    setError(null);

    try {
      const res = await fetch(
        `/api/room/${room.code}?playerId=${targetPlayerId}&adminId=${playerId}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to kick player");
        return;
      }

      // Room will update via WebSocket
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setKickingPlayer(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-md space-y-6 animate-fade-in py-4">
        <div className="text-center space-y-4">
          <button
            onClick={copyRoomCode}
            className="inline-block px-6 py-3 bg-purple-500/20 rounded-2xl border-2 border-purple-500 relative hover:bg-purple-500/30 transition-all cursor-pointer group"
            title="Click to copy"
          >
            <p className="text-zinc-400 text-sm">Room Code</p>
            <p className="text-4xl font-mono font-bold text-purple-400 tracking-widest group-hover:text-purple-300 transition-colors">
              {room.code}
            </p>
            {/* Copy indicator */}
            <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full transition-all ${
              copied ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
            }`}>
              Copied!
            </div>
            {/* Connection indicator */}
            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
              connected ? "bg-green-500 animate-pulse" : "bg-yellow-500"
            }`} title={connected ? "Connected" : "Connecting..."} />
          </button>
          <p className="text-zinc-400">
            {copied ? "✅ Copied to clipboard!" : "Tap code to copy • Share with friends!"}
          </p>
          
          {/* Share button */}
          <button
            onClick={shareRoom}
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all cursor-pointer"
          >
            <span>📤</span>
            <span>Share Invite Link</span>
          </button>
          
          <p className="text-xs text-zinc-600">
            {connected ? "🟢 Live updates" : "🟡 Connecting..."}
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Players List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-zinc-400 px-2">
            <span>Players ({room.players.length}/10)</span>
            <span>{room.players.length >= 3 ? "✅ Ready" : "⏳ Need 3+"}</span>
          </div>
          <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 divide-y divide-zinc-700">
            {room.players.map((player, i) => (
              <div key={player.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    player.isAdmin ? "bg-purple-500 text-white" : "bg-zinc-700 text-zinc-300"
                  }`}>
                    {i + 1}
                  </div>
                  <span className="text-white font-medium">{player.name}</span>
                  {player.id === playerId && (
                    <span className="text-xs text-purple-400">(You)</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {player.isAdmin && (
                    <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-1 rounded">Admin</span>
                  )}
                  {/* Kick button - only visible to admin for non-admin players */}
                  {isAdmin && !player.isAdmin && player.id !== playerId && (
                    <button
                      onClick={() => handleKick(player.id)}
                      disabled={kickingPlayer === player.id}
                      className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 hover:text-red-300 transition-all flex items-center justify-center text-sm disabled:opacity-50 cursor-pointer"
                      title={`Kick ${player.name}`}
                    >
                      {kickingPlayer === player.id ? "..." : "✕"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Game Settings Box */}
        <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 overflow-hidden">
          {/* Header */}
          <div
            onClick={() => isAdmin && !showSettings && setShowSettings(true)}
            className={`flex items-center justify-between p-3 border-b border-zinc-700 ${
              isAdmin && !showSettings ? "hover:bg-zinc-800/50 cursor-pointer" : "cursor-default"
            }`}
          >
            <span className="text-zinc-400 text-sm">⚙️ Game Settings</span>
            {isAdmin && (
              showSettings ? (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowSettings(false); }}
                  className="text-zinc-500 hover:text-zinc-300 text-sm px-1 cursor-pointer"
                >
                  ✕
                </button>
              ) : (
                <span className="text-purple-400 text-xs font-medium">✎ Edit</span>
              )
            )}
          </div>

          {/* Content: Summary or Edit Form */}
          {!showSettings ? (
            /* Settings Summary */
            <div className="px-3 py-2 text-xs text-zinc-500 space-y-1">
              <div className="flex justify-between">
                <span>Discussion:</span>
                <span className="text-zinc-400">{room.settings.discussionTime === 0 ? "No timer" : `${room.settings.discussionTime / 60}m`}</span>
              </div>
              <div className="flex justify-between">
                <span>Imposters:</span>
                <span className="text-zinc-400">{room.settings.imposterCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Troll chance:</span>
                <span className="text-zinc-400">{room.settings.trollChance}%</span>
              </div>
              <div className="flex justify-between">
                <span>Sources:</span>
                <span className="text-zinc-400">
                  {(() => {
                    const parts: string[] = [];
                    if (room.settings.sourceSelection.currentStars) parts.push("Stars");
                    if (room.settings.sourceSelection.legends) parts.push("Legends");
                    const clubIds = room.settings.sourceSelection.clubs || [];
                    if (clubIds.length > 0) {
                      if (clubIds.length < 3) {
                        const clubNames = clubIds.map(id => CLUBS.find(c => c.id === id)?.shortName || id);
                        parts.push(...clubNames);
                      } else {
                        parts.push(`${clubIds.length} clubs`);
                      }
                    }
                    return parts.join(", ") || "None";
                  })()}
                </span>
              </div>
            </div>
          ) : isAdmin ? (
            /* Edit Form (admin only) */
            <div className="space-y-4 p-4 animate-fade-in">
              {/* Discussion Time */}
              <div className="space-y-2">
                <label className="block text-zinc-400 text-sm">Discussion Time</label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setNoTimer(true)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      noTimer ? "bg-purple-500 text-white" : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    ∞ None
                  </button>
                  {[60, 120, 180, 300].map(time => (
                    <button
                      key={time}
                      onClick={() => { setNoTimer(false); setDiscussionTime(time); }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        !noTimer && discussionTime === time ? "bg-purple-500 text-white" : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {time / 60}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Imposter Count */}
              <div className="space-y-2">
                <label className="block text-zinc-400 text-sm">Imposters (max {maxImposters})</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setImposterCount(Math.max(1, imposterCount - 1))}
                    className="w-8 h-8 rounded-full bg-zinc-800 text-white font-bold hover:bg-zinc-700 text-sm"
                  >
                    -
                  </button>
                  <span className="text-xl font-bold text-white w-6 text-center">{Math.min(imposterCount, maxImposters)}</span>
                  <button
                    onClick={() => setImposterCount(Math.min(maxImposters, imposterCount + 1))}
                    className="w-8 h-8 rounded-full bg-zinc-800 text-white font-bold hover:bg-zinc-700 text-sm"
                  >
                    +
                  </button>
                </div>
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
                  onChange={(e) => setTrollChance(parseInt(e.target.value))}
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

              {trollChance > 0 && (
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

              {/* Imposter Less Likely */}
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-sm">Imposter less likely to start</span>
                <button
                  onClick={() => setImposterLessLikely(!imposterLessLikely)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    imposterLessLikely ? "bg-purple-500" : "bg-zinc-700"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                    imposterLessLikely ? "translate-x-6" : "translate-x-0.5"
                  }`} />
                </button>
              </div>

              {/* Player Sources */}
              <div className="space-y-2">
                <label className="block text-zinc-400 text-sm">Player Sources</label>
                <button
                  onClick={() => setShowSourcePopup(true)}
                  className="w-full py-3 px-4 bg-zinc-800 border-2 border-zinc-700 rounded-xl text-left hover:border-zinc-600 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-zinc-200 text-sm">
                      {(() => {
                        const parts: string[] = [];
                        if (selectCurrentStars) parts.push("🔥 Stars");
                        if (selectLegends) parts.push("👑 Legends");
                        if (selectedClubs.length > 0) {
                          if (selectedClubs.length < 3) {
                            const clubNames = selectedClubs.map(id => CLUBS.find(c => c.id === id)?.shortName || id);
                            parts.push(`⚽ ${clubNames.join(", ")}`);
                          } else {
                            parts.push(`⚽ ${selectedClubs.length} clubs`);
                          }
                        }
                        if (parts.length === 0) {
                          return <span className="text-amber-400">⚠️ Select sources</span>;
                        }
                        return parts.join(" + ");
                      })()}
                    </div>
                    <span className="text-zinc-500">▶</span>
                  </div>
                </button>
              </div>

              {/* Done Button */}
              <button
                onClick={handleUpdateSettings}
                disabled={savingSettings}
                className="w-full py-3 bg-purple-500 text-white font-medium rounded-xl hover:bg-purple-400 transition-all disabled:opacity-50 cursor-pointer"
              >
                {savingSettings ? "Saving..." : "Done"}
              </button>
            </div>
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleLeave}
            className="flex-1 py-4 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700 transition-all cursor-pointer"
          >
            Leave
          </button>
          {isAdmin && (
            <button
              onClick={handleStart}
              disabled={loadingStart || room.players.length < 3}
              className="flex-1 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-400 hover:to-indigo-500 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loadingStart ? "Starting..." : "Start Game"}
            </button>
          )}
        </div>

        {!isAdmin && (
          <p className="text-center text-zinc-500 text-sm">
            Waiting for admin to start the game...
          </p>
        )}
      </div>

      {/* Player Source Selection Popup */}
      {showSourcePopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-700 w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="sticky top-0 bg-zinc-900 p-4 border-b border-zinc-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-purple-400">Choose Player Sources</h2>
              <button
                onClick={() => setShowSourcePopup(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 space-y-6">
              {/* Premade Lists Section */}
              <div className="space-y-3">
                <h3 className="text-zinc-500 text-sm font-medium uppercase tracking-wide">Premade Lists</h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* Current Stars */}
                  <button
                    onClick={() => setSelectCurrentStars(!selectCurrentStars)}
                    className={`p-4 rounded-xl border-2 transition-all text-left cursor-pointer ${
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
                    className={`p-4 rounded-xl border-2 transition-all text-left cursor-pointer ${
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
                    className="text-xs text-purple-400 hover:text-purple-300 cursor-pointer"
                  >
                    {selectedClubs.length === CLUBS.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1">
                  {CLUBS.map((club) => (
                    <button
                      key={club.id}
                      onClick={() => toggleClub(club.id)}
                      className={`p-2 rounded-lg transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                        selectedClubs.includes(club.id)
                          ? "bg-purple-500/20 border-2 border-purple-500/50 scale-105"
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
                        selectedClubs.includes(club.id) ? "text-purple-400" : "text-zinc-400"
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

              {/* Done Button */}
              <button
                onClick={() => setShowSourcePopup(false)}
                disabled={!hasAnySourceSelected}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-lg rounded-xl hover:from-purple-400 hover:to-indigo-500 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                Done ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// GAME SCREEN
// ============================================
interface GameScreenProps {
  room: RoomState;
  playerId: string;
  isAdmin: boolean;
  connected: boolean;
  onRoomUpdate: (room: RoomState) => void;
  onLeave: () => void;
}

function GameScreen({ room, playerId, isAdmin, connected, onRoomUpdate, onLeave }: GameScreenProps) {
  const [loading, setLoading] = useState(false);
  const [roleHidden, setRoleHidden] = useState(false);
  const [showRole, setShowRole] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const currentPlayer = room.players.find(p => p.id === playerId);

  // Client-side timer for discussion phase
  useEffect(() => {
    if (room.phase !== "discussion" || !room.discussionEndTime) {
      setTimeLeft(null);
      return;
    }

    // Calculate initial time left
    const calculateTimeLeft = () => {
      const remaining = Math.max(0, Math.floor((room.discussionEndTime! - Date.now()) / 1000));
      setTimeLeft(remaining);
      return remaining;
    };

    calculateTimeLeft();

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room.phase, room.discussionEndTime]);

  // Reset showRole when phase changes
  useEffect(() => {
    setShowRole(false);
  }, [room.phase]);

  const performAction = async (action: string, extra?: object) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/room/${room.code}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, playerId, ...extra }),
      });
      const data = await res.json();
      if (res.ok) {
        onRoomUpdate(data.room);
      }
    } catch (err) {
      console.error("Action error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Revealing phase - show role reveal
  if (room.phase === "revealing") {
    const displayPlayer = currentPlayer?.secretPlayer || room.secretPlayer;
    const allRevealed = room.players.every(p => p.hasRevealed);

    if (!currentPlayer?.hasRevealed) {
      // Player hasn't revealed yet
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in">
          <div className="w-full max-w-md text-center space-y-8">
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center animate-pulse">
              <span className="text-6xl">🎭</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white">Ready to see your role?</h1>
              <p className="text-zinc-400">Make sure no one else can see your screen!</p>
            </div>
            <button
              onClick={() => performAction("reveal")}
              disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-xl rounded-2xl hover:from-purple-400 hover:to-indigo-500 transition-all"
            >
              👁️ Reveal My Role
            </button>
          </div>
        </div>
      );
    }

    // Player has revealed - show their role (or hidden state)
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in ${
        roleHidden ? "" : (currentPlayer.isImposter ? "bg-gradient-to-b from-red-950/30 to-transparent" : "bg-gradient-to-b from-emerald-950/30 to-transparent")
      }`}>
        <div className="w-full max-w-md text-center space-y-6">
          {roleHidden ? (
            /* Hidden state */
            <>
              <div className="w-32 h-32 mx-auto rounded-full bg-zinc-800 border-4 border-zinc-700 flex items-center justify-center">
                <span className="text-6xl">🙈</span>
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-zinc-400">Role Hidden</h1>
                <p className="text-zinc-500 text-sm">Tap below to show your role again</p>
              </div>
            </>
          ) : currentPlayer.isImposter ? (
            <>
              <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-red-600 to-red-800 border-4 border-red-500 flex items-center justify-center shadow-2xl shadow-red-500/50">
                <span className="text-6xl">🕵️</span>
              </div>
              <h1 className="text-4xl font-black text-red-500">IMPOSTER</h1>
              <p className="text-zinc-300">You don&apos;t know the player! Blend in!</p>
            </>
          ) : (
            <>
              {displayPlayer?.photo ? (
                <div className="w-32 h-32 mx-auto rounded-full border-4 border-emerald-500 overflow-hidden shadow-2xl shadow-emerald-500/50 bg-zinc-800">
                  <img src={displayPlayer.photo} alt={displayPlayer.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-emerald-600 to-green-700 border-4 border-emerald-500 flex items-center justify-center shadow-2xl">
                  <span className="text-6xl">⚽</span>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-zinc-400">The secret player is...</p>
                <h1 className="text-3xl font-black text-white">{displayPlayer?.name}</h1>
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="px-3 py-1 bg-zinc-800 rounded-full text-sm text-emerald-400">
                    {displayPlayer?.position}
                  </span>
                  <span className="px-3 py-1 bg-zinc-800 rounded-full text-sm text-zinc-400">
                    {displayPlayer?.team}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Hide/Show toggle button */}
          <button
            onClick={() => setRoleHidden(!roleHidden)}
            className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700 hover:text-zinc-300 transition-all text-sm cursor-pointer"
          >
            {roleHidden ? "👁️ Show Role" : "🙈 Hide Role"}
          </button>

          <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
            <p className="text-zinc-400 text-sm">
              Waiting for everyone to reveal... ({room.players.filter(p => p.hasRevealed).length}/{room.players.length})
            </p>
          </div>

          {isAdmin && allRevealed && (
            <button
              onClick={() => performAction("discussion")}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl cursor-pointer"
            >
              Start Discussion →
            </button>
          )}
        </div>
      </div>
    );
  }

  // Discussion phase
  if (room.phase === "discussion") {
    const startingPlayer = room.players.find(p => p.id === room.startingPlayerId);
    const displayPlayer = currentPlayer?.secretPlayer || room.secretPlayer;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="w-full max-w-md text-center space-y-6">
          <h1 className="text-3xl font-bold text-white">Discussion Time!</h1>
          
          {/* Client-side timer */}
          {timeLeft !== null && timeLeft > 0 ? (
            <div className={`text-5xl font-mono font-bold ${timeLeft <= 30 ? "text-red-400 animate-pulse" : "text-purple-400"}`}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
            </div>
          ) : room.discussionEndTime ? (
            <div className="text-2xl font-bold text-amber-400">⏰ Time&apos;s up!</div>
          ) : (
            <div className="text-2xl font-bold text-zinc-500">∞ No timer</div>
          )}

          {/* Show/Hide Role Toggle */}
          {showRole ? (
            <div className={`p-4 rounded-xl border ${
              currentPlayer?.isImposter 
                ? "bg-red-500/10 border-red-500/50" 
                : "bg-emerald-500/10 border-emerald-500/50"
            }`}>
              {currentPlayer?.isImposter ? (
                <div className="space-y-1">
                  <p className="text-red-400 font-bold text-lg">🕵️ IMPOSTER</p>
                  <p className="text-red-300 text-sm">Blend in! Don&apos;t get caught!</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-emerald-400 font-bold text-lg">⚽ {displayPlayer?.name}</p>
                  <p className="text-emerald-300 text-sm">{displayPlayer?.position} • {displayPlayer?.team}</p>
                </div>
              )}
              <button
                onClick={() => setShowRole(false)}
                className="mt-3 px-4 py-1.5 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700 text-sm cursor-pointer"
              >
                🙈 Hide
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowRole(true)}
              className="px-4 py-2 bg-zinc-800/50 border border-zinc-700 text-zinc-400 rounded-xl hover:bg-zinc-800 hover:text-zinc-300 transition-all text-sm cursor-pointer"
            >
              👁️ Show My Role
            </button>
          )}

          <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
            <p className="text-zinc-400 text-sm">🎯 Starts first:</p>
            <p className="text-xl font-bold text-white">{startingPlayer?.name}</p>
          </div>

          <div className="space-y-2">
            <p className="text-zinc-400 text-sm">Players:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {room.players.map(p => (
                <span 
                  key={p.id} 
                  className={`px-3 py-1 rounded-full text-sm ${
                    p.id === room.startingPlayerId 
                      ? "bg-purple-500/30 text-purple-300 border border-purple-500" 
                      : "bg-zinc-800 text-zinc-300"
                  }`}
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={() => performAction("results")}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl cursor-pointer"
            >
              Skip to Results →
            </button>
          )}
        </div>
      </div>
    );
  }

  // Results phase
  if (room.phase === "results") {
    const imposters = room.players.filter(p => p.isImposter);

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="space-y-2">
            <span className="text-5xl">🎭</span>
            <h1 className="text-3xl font-bold text-white">Game Over!</h1>
          </div>

          {room.trollEvent && (
            <div className="p-4 bg-purple-500/20 border border-purple-500 rounded-xl">
              <p className="text-purple-400 font-bold">🎲 Troll Event!</p>
              <p className="text-purple-300 text-sm">
                {room.trollEvent === "extraImposter" && "There was an extra imposter!"}
                {room.trollEvent === "allImposters" && "Everyone was an imposter!"}
                {room.trollEvent === "noImposters" && "There were no imposters!"}
                {room.trollEvent === "differentPlayers" && "Everyone had a different player!"}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
              <p className="text-zinc-400 text-sm">The Imposter{imposters.length > 1 ? "s were" : " was"}</p>
              <p className="text-xl font-bold text-red-400">
                {imposters.length > 0 ? imposters.map(p => p.name).join(", ") : "No one!"}
              </p>
            </div>

            <div className="p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-xl">
              <p className="text-zinc-400 text-sm">The Player was</p>
              <p className="text-xl font-bold text-emerald-400">{room.secretPlayer?.name}</p>
            </div>
          </div>

          {isAdmin && (
            <div className="flex gap-3">
              <button
                onClick={() => performAction("playAgain")}
                disabled={loading}
                className="flex-1 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl"
              >
                🔄 Play Again
              </button>
              <button
                onClick={onLeave}
                className="flex-1 py-4 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700"
              >
                Leave
              </button>
            </div>
          )}

          {!isAdmin && (
            <p className="text-zinc-500 text-sm">Waiting for admin...</p>
          )}
        </div>
      </div>
    );
  }

  return null;
}

