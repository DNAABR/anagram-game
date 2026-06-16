import { useState, useEffect, useCallback, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { 
  createRoom, 
  joinRoom, 
  isFirebaseConnected, 
  findPublicRoom, 
  joinBotToRoom 
} from "./utils/firebase";
import { loadDictionary } from "./utils/dictionary";
import { playSound, toggleMute, getMuteStatus } from "./utils/audio";
import { useGameState } from "./hooks/useGameState";
import LoadingScreen from "./components/LoadingScreen";
import LobbyScreen from "./components/LobbyScreen";
import GameBoard from "./components/GameBoard";

function App() {
  // Player state
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem("anagram_magic_player_name") || "Mage_" + Math.floor(100 + Math.random() * 900);
  });
  const [playerId] = useState(() => {
    let id = localStorage.getItem("anagram_magic_player_id");
    if (!id) {
      id = "p_" + Math.floor(100000 + Math.random() * 900000);
      localStorage.setItem("anagram_magic_player_id", id);
    }
    return id;
  });

  // UI state
  const [screen, setScreen] = useState("lobby"); // lobby | matchmaking | game | settings
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [isMuted, setIsMuted] = useState(getMuteStatus());

  // Matchmaking State
  const [matchmakingTimer, setMatchmakingTimer] = useState(8);
  const [matchmakingStatus, setMatchmakingStatus] = useState("searching"); // searching | matching | filling
  const [isCustomMatch, setIsCustomMatch] = useState(false);

  // Dictionary state
  const [dictionary, setDictionary] = useState(null);
  const [dictLoading, setDictLoading] = useState(true);

  // Custom visual shuffle map for standard rounds
  const [visualShuffleMap, setVisualShuffleMap] = useState(() => Array.from({ length: 9 }, (_, i) => i));

  // Timer reference for matchmaking
  const matchmakingTimeoutRef = useRef(null);

  // Load words dictionary on mount
  useEffect(() => {
    loadDictionary().then(set => {
      setDictionary(set);
      setDictLoading(false);
    });
  }, []);

  // Initialize Game State hook
  const {
    room,
    timeLeft,
    isPicker,
    localWord,
    setLocalWord,
    errorMessage,
    confettiTrigger,
    activeIndices,
    setActiveIndices,
    pickLetter,
    pickAllLettersRandomly,
    submitWord,
    nextRound,
    restartLocalGame
  } = useGameState(
    roomId, 
    playerId, 
    playerName, 
    isMultiplayer, 
    dictionary, 
    "medium" // Default bot difficulty parameter
  );

  // Synchronized room ref for matchmaking timer ticks to prevent stale closures
  const roomRef = useRef(room);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // Clear matchmaking countdown if a human joins before the timer runs out
  useEffect(() => {
    if (room && room.status !== "waiting") {
      if (matchmakingTimeoutRef.current) {
        clearTimeout(matchmakingTimeoutRef.current);
        matchmakingTimeoutRef.current = null;
      }
    }
  }, [room]);

  // Clean up matchmaking timer on unmount
  useEffect(() => {
    return () => {
      if (matchmakingTimeoutRef.current) clearTimeout(matchmakingTimeoutRef.current);
    };
  }, []);

  // Confetti trigger — lazy-load canvas-confetti (H10)
  useEffect(() => {
    if (confettiTrigger > 0) {
      import("canvas-confetti").then(mod => {
        mod.default({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      });
    }
  }, [confettiTrigger]);

  // Handle Game Over confetti once
  useEffect(() => {
    if (room?.status === "game_over") {
      playSound("win");
      import("canvas-confetti").then(mod => {
        const confetti = mod.default;
        const duration = 3 * 1000;
        const end = Date.now() + duration;

        const frame = () => {
          confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
          });
          confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();
      });
    }
  }, [room?.status]);

  // Save name helper
  const savePlayerName = useCallback((name) => {
    const clean = name.trim().slice(0, 16);
    setPlayerName(clean);
    localStorage.setItem("anagram_magic_player_name", clean);
  }, []);

  // Sound Toggle
  const handleToggleMute = useCallback(() => {
    const muted = toggleMute();
    setIsMuted(muted);
    playSound("click");
  }, []);

  // Copy room code to clipboard
  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      playSound("success");
    } catch {
      playSound("fail");
    }
  }, [roomId]);

  // Keyboard typing layout listener
  useEffect(() => {
    if (!room || room.status !== "playing") return;

    const handleKeyDown = (e) => {
      const key = e.key.toUpperCase();
      
      if (e.key === "Backspace") {
        if (activeIndices.length > 0) {
          setActiveIndices(prev => prev.slice(0, -1));
          playSound("remove");
        }
        return;
      }

      if (e.key === "Enter") {
        const typedWord = activeIndices.map(idx => room.letters[idx]).join("");
        if (typedWord.length >= 2) {
          submitWord(typedWord);
          setActiveIndices([]);
        }
        return;
      }

      if (e.key === "Escape") {
        setActiveIndices([]);
        playSound("remove");
        return;
      }

      if (/^[A-Z]$/.test(key)) {
        const matchIdx = room.letters.findIndex((char, idx) => {
          return char === key && !activeIndices.includes(idx);
        });

        if (matchIdx !== -1) {
          setActiveIndices(prev => [...prev, matchIdx]);
          playSound("click");
        } else {
          playSound("remove");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [room, activeIndices, setActiveIndices, submitWord]);

  // Visual tile shuffle
  const handleShuffleTiles = useCallback(() => {
    playSound("click");
    setVisualShuffleMap(prev => {
      const arr = [...prev];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    });
  }, []);

  // Reset visual shuffle on round change (render-time state adjustment pattern)
  const [prevRound, setPrevRound] = useState(room?.currentRound);
  if (room?.currentRound !== prevRound) {
    setPrevRound(room?.currentRound);
    setVisualShuffleMap(Array.from({ length: 9 }, (_, i) => i));
    setLocalWord("");
    setActiveIndices([]);
  }

  // Click handler for tiles
  const handleTileClick = useCallback((boardIdx) => {
    setActiveIndices(prev => {
      const scrollIdx = prev.indexOf(boardIdx);
      if (scrollIdx !== -1) {
        playSound("remove");
        return prev.filter(idx => idx !== boardIdx);
      } else {
        playSound("click");
        return [...prev, boardIdx];
      }
    });
  }, [setActiveIndices]);

  // Action: Launch Public Matchmaking
  const handleStartMatchmaking = useCallback(async () => {
    playSound("click");
    if (!isFirebaseConnected()) {
      playSound("fail");
      alert("Firebase Realtime Database is not connected.");
      return;
    }

    setIsMultiplayer(true);
    setScreen("matchmaking");
    setMatchmakingStatus("searching");
    setMatchmakingTimer(8);
    setIsCustomMatch(false);

    try {
      // 1. Try to find an open public room
      const foundRoomId = await findPublicRoom(playerId);

      if (foundRoomId) {
        setRoomId(foundRoomId);
        await joinRoom(foundRoomId, playerId, playerName);
        setScreen("game");
        playSound("success");
      } else {
        // 2. Create a new public room
        const newRoomId = "magic-" + Math.floor(1000 + Math.random() * 9000);
        setRoomId(newRoomId);
        await createRoom(newRoomId, playerId, playerName, true); // true = public room

        // 3. Start countdown to fill with bot if no human player joins
        let timeLeft = 8;
        const tick = async () => {
          if (roomRef.current && roomRef.current.status !== "waiting") {
            // Match has been found/started with a human!
            return;
          }

          timeLeft -= 1;
          setMatchmakingTimer(timeLeft);

          if (timeLeft <= 0) {
            setMatchmakingStatus("filling");
            const difficulties = ["easy", "medium", "hard"];
            const selectedDiff = difficulties[Math.floor(Math.random() * difficulties.length)];
            const REAL_NAMES = [
              "Alex M.", "Emma S.", "Liam K.", "Olivia W.", "Noah B.", 
              "Ava J.", "Sophia H.", "Jackson T.", "Isabella D.", "Lucas R.", 
              "Mia C.", "Benjamin L.", "Charlotte G.", "Oliver P.", "Amelia F.", 
              "James N.", "Harper V.", "Logan E.", "Evelyn Y.", "Alexander Z.", 
              "Emily A.", "Daniel Q.", "Elizabeth U.", "Henry O.", "Sofia X.", 
              "Sebastian I.", "Avery W.", "Jack D.", "Chloe M.", "Owen B.",
              "Grace L.", "Connor K.", "Zoe H.", "Caleb S.", "Lily G.",
              "Ryan N.", "Hannah C.", "Nathan T.", "Aria J.", "Isaac P."
            ];
            const botName = REAL_NAMES[Math.floor(Math.random() * REAL_NAMES.length)];
            const botId = "bot_" + Math.floor(1000 + Math.random() * 9000);

            await joinBotToRoom(newRoomId, botId, botName, selectedDiff);
            setScreen("game");
          } else {
            matchmakingTimeoutRef.current = setTimeout(tick, 1000);
          }
        };
        matchmakingTimeoutRef.current = setTimeout(tick, 1000);
      }
    } catch (err) {
      playSound("fail");
      alert(err.message || "Matchmaking failed. Please try again.");
      setScreen("lobby");
      setRoomId("");
    }
  }, [playerId, playerName]);

  // Action: Create Online Custom Room (Play with Friend)
  const handleCreateOnlineRoom = useCallback(async () => {
    playSound("click");
    if (!isFirebaseConnected()) {
      playSound("fail");
      alert("Firebase Realtime Database is not connected.");
      return;
    }
    setIsMultiplayer(true);
    setIsCustomMatch(true); // Custom game
    const newRoomId = "magic-" + Math.floor(1000 + Math.random() * 9000);
    setRoomId(newRoomId);
    setScreen("matchmaking");
    await createRoom(newRoomId, playerId, playerName, false); // false = private room
  }, [playerId, playerName]);

  // Action: Join Online Custom Room (Play with Friend)
  const handleJoinOnlineRoom = useCallback(async (e) => {
    e.preventDefault();
    if (!roomId) return;
    
    if (!isFirebaseConnected()) {
      playSound("fail");
      alert("Firebase Realtime Database is not connected.");
      return;
    }

    setIsMultiplayer(true);
    setIsCustomMatch(true); // Custom game
    playSound("click");
    try {
      await joinRoom(roomId.trim(), playerId, playerName);
      setScreen("game");
      playSound("success");
    } catch (err) {
      playSound("fail");
      alert(err.message || "Failed to join room.");
    }
  }, [roomId, playerId, playerName]);

  // Transition matchmaking → game when room status changes (render-time state adjustment)
  const [prevRoomStatus, setPrevRoomStatus] = useState(room?.status);
  if (room?.status !== prevRoomStatus) {
    setPrevRoomStatus(room?.status);
    if (isMultiplayer && screen === "matchmaking" && room?.status !== "waiting" && room?.status !== undefined) {
      setScreen("game");
    }
  }

  const handleExitToLobby = useCallback(() => {
    playSound("remove");
    setScreen("lobby");
    setRoomId("");
    if (matchmakingTimeoutRef.current) {
      clearTimeout(matchmakingTimeoutRef.current);
      matchmakingTimeoutRef.current = null;
    }
    if (!isMultiplayer) {
      restartLocalGame();
    }
  }, [isMultiplayer, restartLocalGame]);

  // Loading Screen
  if (dictLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-white text-gray-800">
      
      {/* RED GAME CANVAS AREA */}
      <div className="flex-1 red-canvas w-full flex flex-col items-center justify-center py-4 sm:py-6 px-3 sm:px-4 relative">
        
        {/* SCREEN: LOBBY */}
        {screen === "lobby" && (
          <LobbyScreen
            playerName={playerName}
            savePlayerName={savePlayerName}
            handleStartMatchmaking={handleStartMatchmaking}
            handleCreateOnlineRoom={handleCreateOnlineRoom}
            handleJoinOnlineRoom={handleJoinOnlineRoom}
            roomId={roomId}
            setRoomId={setRoomId}
          />
        )}

        {/* SCREEN: MATCHMAKING & GAME */}
        {(screen === "matchmaking" || screen === "game") && (
          <GameBoard
            room={room}
            playerId={playerId}
            playerName={playerName}
            isMultiplayer={isMultiplayer}
            timeLeft={timeLeft}
            isPicker={isPicker}
            localWord={localWord}
            activeIndices={activeIndices}
            setActiveIndices={setActiveIndices}
            pickLetter={pickLetter}
            pickAllLettersRandomly={pickAllLettersRandomly}
            submitWord={submitWord}
            nextRound={nextRound}
            restartLocalGame={restartLocalGame}
            errorMessage={errorMessage}
            visualShuffleMap={visualShuffleMap}
            handleTileClick={handleTileClick}
            handleShuffleTiles={handleShuffleTiles}
            handleCopyCode={handleCopyCode}
            handleExitToLobby={handleExitToLobby}
            roomId={roomId}
            screen={screen}
            matchmakingTimer={matchmakingTimer}
            matchmakingStatus={matchmakingStatus}
            isCustomMatch={isCustomMatch}
          />
        )}

        {/* Global Sound controller at bottom left */}
        <div className="absolute bottom-4 left-4 z-40">
          <button 
            onClick={handleToggleMute}
            className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 transition text-white/80 hover:text-white shadow-lg"
            title={isMuted ? "Unmute Sound" : "Mute Sound"}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* WHITE ZIGZAG EDGE SEPARATOR */}
      <div className="zigzag-border"></div>

      {/* WOOD PLANK DECK FOOTER TABLE */}
      <footer className="wood-bg w-full py-12 px-6 text-center text-white/50 border-t-2 border-[#8b5a2b]/30">
        <div className="max-w-md mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#cca07a] mb-2">
            Miniclip Anagram Magic Remake &copy; 2026
          </p>
          <p className="text-[10px] text-[#cca07a]/60 leading-relaxed font-semibold">
            Recreated with HTML5 web APIs to preserve Flash nostalgia. Features fully client-side synthesized Audio Context oscillators and optimized letter spell boards.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
