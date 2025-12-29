"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { RoomState, RoomSettings, RoomPlayer } from "@/lib/roomState";
import { getDefaultSourceSelection, CLUBS } from "@/lib/players";
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
  
  // Pusher refs
  const pusherRef = useRef<PusherClient | null>(null);
  const channelRef = useRef<Channel | null>(null);

  // Get current player
  const currentPlayer = room?.players.find(p => p.id === playerId);
  const isAdmin = currentPlayer?.isAdmin ?? false;

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

    // Bind to all room events
    channel.bind(ROOM_EVENTS.ROOM_UPDATED, handleRoomUpdate);
    channel.bind(ROOM_EVENTS.PLAYER_JOINED, handleRoomUpdate);
    channel.bind(ROOM_EVENTS.PLAYER_LEFT, handleRoomUpdate);
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
        onBack={() => setPhase("menu")}
        onJoined={(id, roomState) => {
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
  const [discussionTime, setDiscussionTime] = useState(180);
  const [noTimer, setNoTimer] = useState(false);
  const [imposterCount, setImposterCount] = useState(1);
  const [trollChance, setTrollChance] = useState(0);
  const [selectCurrentStars, setSelectCurrentStars] = useState(true);
  const [selectLegends, setSelectLegends] = useState(true);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const settings: RoomSettings = {
        discussionTime: noTimer ? 0 : discussionTime,
        imposterCount,
        imposterLessLikelyToStart: false,
        trollChance,
        sourceSelection: {
          currentStars: selectCurrentStars,
          legends: selectLegends,
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
          <h1 className="text-2xl font-bold text-purple-400">Create Room</h1>
          <p className="text-zinc-400">Set up your game</p>
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
              placeholder="Enter your name"
              className="w-full px-4 py-3 bg-zinc-800 border-2 border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
              maxLength={20}
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-sm mb-2">Discussion Time</label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setNoTimer(true)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  noTimer ? "bg-purple-500 text-white" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                ∞ None
              </button>
              {[60, 120, 180, 300].map(time => (
                <button
                  key={time}
                  onClick={() => { setNoTimer(false); setDiscussionTime(time); }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    !noTimer && discussionTime === time ? "bg-purple-500 text-white" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {time / 60}m
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 text-sm mb-2">Imposters</label>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setImposterCount(Math.max(1, imposterCount - 1))}
                className="w-10 h-10 rounded-full bg-zinc-800 text-white font-bold hover:bg-zinc-700"
              >
                -
              </button>
              <span className="text-2xl font-bold text-white w-8 text-center">{imposterCount}</span>
              <button
                onClick={() => setImposterCount(Math.min(4, imposterCount + 1))}
                className="w-10 h-10 rounded-full bg-zinc-800 text-white font-bold hover:bg-zinc-700"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 text-sm mb-2">Player Sources</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectCurrentStars(!selectCurrentStars)}
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                  selectCurrentStars ? "bg-purple-500/30 border-2 border-purple-500" : "bg-zinc-800 border-2 border-zinc-700"
                }`}
              >
                ⭐ Stars
              </button>
              <button
                onClick={() => setSelectLegends(!selectLegends)}
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                  selectLegends ? "bg-purple-500/30 border-2 border-purple-500" : "bg-zinc-800 border-2 border-zinc-700"
                }`}
              >
                👑 Legends
              </button>
            </div>
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
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="flex-1 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-400 hover:to-indigo-500 transition-all disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Room"}
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
}

function JoinRoomScreen({ onBack, onJoined, error, setError, loading, setLoading }: JoinRoomScreenProps) {
  const [code, setCode] = useState("");
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
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Local settings state (for admin to edit)
  const [discussionTime, setDiscussionTime] = useState(room.settings.discussionTime);
  const [noTimer, setNoTimer] = useState(room.settings.discussionTime === 0);
  const [imposterCount, setImposterCount] = useState(room.settings.imposterCount);
  const [trollChance, setTrollChance] = useState(room.settings.trollChance);
  const [imposterLessLikely, setImposterLessLikely] = useState(room.settings.imposterLessLikelyToStart);
  const [selectCurrentStars, setSelectCurrentStars] = useState(room.settings.sourceSelection.currentStars);
  const [selectLegends, setSelectLegends] = useState(room.settings.sourceSelection.legends);

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
    setLoading(true);
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
            sourceSelection: {
              currentStars: selectCurrentStars,
              legends: selectLegends,
              clubs: room.settings.sourceSelection.clubs,
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
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (room.players.length < 3) {
      setError("Need at least 3 players to start");
      return;
    }

    setLoading(true);
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
      setLoading(false);
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-md space-y-6 animate-fade-in py-4">
        <div className="text-center space-y-4">
          <div className="inline-block px-6 py-3 bg-purple-500/20 rounded-2xl border-2 border-purple-500 relative">
            <p className="text-zinc-400 text-sm">Room Code</p>
            <p className="text-4xl font-mono font-bold text-purple-400 tracking-widest">{room.code}</p>
            {/* Connection indicator */}
            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
              connected ? "bg-green-500 animate-pulse" : "bg-yellow-500"
            }`} title={connected ? "Connected" : "Connecting..."} />
          </div>
          <p className="text-zinc-400">Share this code with friends!</p>
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
                {player.isAdmin && (
                  <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-1 rounded">Admin</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Current Settings Display (for non-admins) or Settings Toggle */}
        <div className="space-y-2">
          <button
            onClick={() => isAdmin && setShowSettings(!showSettings)}
            className={`w-full flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl border border-zinc-700 ${
              isAdmin ? "hover:bg-zinc-800 cursor-pointer" : "cursor-default"
            }`}
          >
            <span className="text-zinc-400 text-sm">⚙️ Game Settings</span>
            {isAdmin && (
              <span className="text-zinc-500 text-xs">{showSettings ? "▲ Hide" : "▼ Edit"}</span>
            )}
          </button>

          {/* Settings Summary (always visible) */}
          {!showSettings && (
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
                  {[
                    room.settings.sourceSelection.currentStars && "Stars",
                    room.settings.sourceSelection.legends && "Legends",
                  ].filter(Boolean).join(", ") || "None"}
                </span>
              </div>
            </div>
          )}

          {/* Expanded Settings (admin only) */}
          {showSettings && isAdmin && (
            <div className="space-y-4 p-4 bg-zinc-800/30 rounded-xl border border-zinc-700 animate-fade-in">
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

              {/* Troll Chance */}
              <div className="space-y-2">
                <label className="block text-zinc-400 text-sm">
                  🎲 Troll Chance: <span className="text-purple-400">{trollChance}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={trollChance}
                  onChange={(e) => setTrollChance(parseInt(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

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
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectCurrentStars(!selectCurrentStars)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectCurrentStars ? "bg-purple-500/30 border-2 border-purple-500 text-white" : "bg-zinc-800 border-2 border-zinc-700 text-zinc-400"
                    }`}
                  >
                    ⭐ Stars
                  </button>
                  <button
                    onClick={() => setSelectLegends(!selectLegends)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectLegends ? "bg-purple-500/30 border-2 border-purple-500 text-white" : "bg-zinc-800 border-2 border-zinc-700 text-zinc-400"
                    }`}
                  >
                    👑 Legends
                  </button>
                </div>
              </div>

              {/* Save Settings Button */}
              <button
                onClick={handleUpdateSettings}
                disabled={loading}
                className="w-full py-3 bg-purple-500/30 border border-purple-500 text-purple-300 font-medium rounded-xl hover:bg-purple-500/40 transition-all disabled:opacity-50"
              >
                {loading ? "Saving..." : "💾 Save Settings"}
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleLeave}
            className="flex-1 py-4 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700 transition-all"
          >
            Leave
          </button>
          {isAdmin && (
            <button
              onClick={handleStart}
              disabled={loading || room.players.length < 3}
              className="flex-1 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-400 hover:to-indigo-500 transition-all disabled:opacity-50"
            >
              {loading ? "Starting..." : "Start Game"}
            </button>
          )}
        </div>

        {!isAdmin && (
          <p className="text-center text-zinc-500 text-sm">
            Waiting for admin to start the game...
          </p>
        )}
      </div>
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
  const currentPlayer = room.players.find(p => p.id === playerId);

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

    // Player has revealed - show their role
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in ${
        currentPlayer.isImposter ? "bg-gradient-to-b from-red-950/30 to-transparent" : "bg-gradient-to-b from-emerald-950/30 to-transparent"
      }`}>
        <div className="w-full max-w-md text-center space-y-6">
          {currentPlayer.isImposter ? (
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

          <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
            <p className="text-zinc-400 text-sm">
              Waiting for everyone to reveal... ({room.players.filter(p => p.hasRevealed).length}/{room.players.length})
            </p>
          </div>

          {isAdmin && allRevealed && (
            <button
              onClick={() => performAction("discussion")}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl"
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
    const timeLeft = room.discussionEndTime ? Math.max(0, Math.floor((room.discussionEndTime - Date.now()) / 1000)) : null;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="w-full max-w-md text-center space-y-6">
          <h1 className="text-3xl font-bold text-white">Discussion Time!</h1>
          
          {timeLeft !== null && (
            <div className="text-5xl font-mono font-bold text-purple-400">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
            </div>
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
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl"
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

