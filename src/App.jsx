import { useState, useEffect } from "react";
import { 
  Volume2, 
  VolumeX, 
  Copy, 
  RefreshCw, 
  CheckCircle, 
  Trophy, 
  Users, 
  Sparkles,
  ArrowRight,
  User,
  Sliders,
  LogOut
} from "lucide-react";
import confetti from "canvas-confetti";
import { createRoom, joinRoom, isFirebaseConnected } from "./utils/firebase";
import { loadDictionary } from "./utils/dictionary";
import { playSound, toggleMute, getMuteStatus } from "./utils/audio";
import { useGameState } from "./hooks/useGameState";

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
  const [botDifficulty, setBotDifficulty] = useState("medium"); // easy | medium | hard
  const [isMuted, setIsMuted] = useState(getMuteStatus());

  // Dictionary state
  const [dictionary, setDictionary] = useState(null);
  const [dictLoading, setDictLoading] = useState(true);

  // Custom visual shuffle map for standard rounds
  const [visualShuffleMap, setVisualShuffleMap] = useState([0, 1, 2, 3, 4, 5, 6, 7, 8]);

  // Load saved Firebase configs on startup
  useEffect(() => {
    // Load words dictionary
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
    botDifficulty
  );

  // Confetti trigger
  useEffect(() => {
    if (confettiTrigger > 0) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  }, [confettiTrigger]);

  // Handle Game Over confetti once
  useEffect(() => {
    if (room?.status === "game_over") {
      playSound("win");
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
    }
  }, [room?.status]);

  // Save name helper
  const savePlayerName = (name) => {
    const clean = name.trim().slice(0, 16);
    setPlayerName(clean);
    localStorage.setItem("anagram_magic_player_name", clean);
  };

  // Sound Toggle
  const handleToggleMute = () => {
    const muted = toggleMute();
    setIsMuted(muted);
    playSound("click");
  };

  // Copy room code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId);
    playSound("success");
  };

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
  const handleShuffleTiles = () => {
    playSound("click");
    const arr = [...visualShuffleMap];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setVisualShuffleMap(arr);
  };

  // Reset visual shuffle on round increase
  useEffect(() => {
    if (room?.currentRound) {
      const timer = setTimeout(() => {
        setVisualShuffleMap([0, 1, 2, 3, 4, 5, 6, 7, 8]);
        setLocalWord("");
        setActiveIndices([]);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [room?.currentRound, setVisualShuffleMap, setLocalWord, setActiveIndices]);

  // Click handler for tiles
  const handleTileClick = (boardIdx) => {
    const scrollIdx = activeIndices.indexOf(boardIdx);
    if (scrollIdx !== -1) {
      setActiveIndices(prev => prev.filter(idx => idx !== boardIdx));
      playSound("remove");
    } else {
      setActiveIndices(prev => [...prev, boardIdx]);
      playSound("click");
    }
  };

  // Action: Launch Bot Practice Room
  const startPracticeGame = () => {
    playSound("success");
    setIsMultiplayer(false);
    const newRoomId = "local_" + Math.floor(1000 + Math.random() * 9000);
    setRoomId(newRoomId);
    setScreen("game");
  };

  // Action: Create Online Room
  const handleCreateOnlineRoom = async () => {
    playSound("click");
    if (!isFirebaseConnected()) {
      playSound("fail");
      alert("Firebase Realtime Database is not connected.");
      return;
    }
    setIsMultiplayer(true);
    const newRoomId = "magic-" + Math.floor(1000 + Math.random() * 9000);
    setRoomId(newRoomId);
    setScreen("matchmaking");
    await createRoom(newRoomId, playerId, playerName);
  };

  // Action: Join Online Room
  const handleJoinOnlineRoom = async (e) => {
    e.preventDefault();
    if (!roomId) return;
    
    if (!isFirebaseConnected()) {
      playSound("fail");
      alert("Firebase Realtime Database is not connected.");
      return;
    }

    setIsMultiplayer(true);
    playSound("click");
    try {
      await joinRoom(roomId.trim(), playerId, playerName);
      setScreen("game");
      playSound("success");
    } catch (err) {
      playSound("fail");
      alert(err.message || "Failed to join room.");
    }
  };

  // Transition screen changes on room status updates
  useEffect(() => {
    if (isMultiplayer && room && screen === "matchmaking" && room.status !== "waiting") {
      const timer = setTimeout(() => {
        setScreen("game");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [room?.status, screen, isMultiplayer, room]);

  const handleExitToLobby = () => {
    playSound("remove");
    setScreen("lobby");
    setRoomId("");
    if (!isMultiplayer) {
      restartLocalGame();
    }
  };

  // Loading Screen
  if (dictLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#800c0c] relative overflow-hidden">
        <div className="absolute w-[400px] h-[400px] border border-white/5 rounded-full animate-rotate-slow flex items-center justify-center">
          <div className="absolute w-[300px] h-[300px] border border-dashed border-white/5 rounded-full"></div>
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-gray-900 text-3xl font-black shadow-2xl animate-bounce mb-6">
            A
          </div>
          <h1 className="text-4xl font-extrabold tracking-widest text-white drop-shadow">
            ANAGRAM MAGIC
          </h1>
          <p className="text-xs text-white/50 mt-2 tracking-widest uppercase">
            Loading Dictionary Grimoire...
          </p>
        </div>
      </div>
    );
  }

  // Calculate stopwatch rotation
  const timerDuration = room?.timerDuration || 30;
  const needleAngle = room ? (timeLeft / timerDuration) * 360 : 360;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-white text-gray-800">
      
      {/* RED GAME CANVAS AREA */}
      <div className="flex-1 red-canvas w-full flex flex-col items-center justify-center py-4 sm:py-6 px-3 sm:px-4 relative">
        
        {/* ==================== SCREEN: LOBBY ==================== */}
        {screen === "lobby" && (
          <div className="w-full max-w-xl flex flex-col items-center">
            {/* Logo/Banner title */}
            <div className="text-center mb-8">
              <div className="bg-black/30 text-xs text-white/80 font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-3 inline-block">
                MINICLIP.COM
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-white tracking-wide uppercase drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]">
                ANAGRAM MAGIC
              </h1>
            </div>

            {/* Lobby form board */}
            <div className="w-full max-w-md bg-white border-4 border-gray-200 rounded-3xl p-6 shadow-2xl text-left">
              
              {/* Mage Name */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-gray-500" /> Enter Player Name
                </label>
                <input 
                  type="text" 
                  value={playerName}
                  onChange={(e) => savePlayerName(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-200 focus:border-orange-500 rounded-xl px-4 py-3 text-gray-900 font-bold text-md focus:outline-none transition shadow-inner"
                  placeholder="Your Name..."
                  maxLength={16}
                />
              </div>

              {/* Bot Difficulty Settings */}
              <div className="mb-5 p-4 rounded-xl bg-gray-50 border-2 border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-4 h-4" /> AI Bot Difficulty
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-700 uppercase">
                    {botDifficulty}
                  </span>
                </div>
                
                <div className="flex gap-2">
                  {["easy", "medium", "hard"].map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => { playSound("click"); setBotDifficulty(diff); }}
                      className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border-2 transition capitalize ${
                        botDifficulty === diff 
                          ? "bg-gray-800 border-gray-900 text-white shadow" 
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      {diff === "hard" ? "Archmage" : diff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Practice Play Action */}
              <button
                onClick={startPracticeGame}
                className="w-full btn-miniclip-orange btn-glossy text-white text-md font-black py-4 px-6 rounded-2xl transition tracking-wider uppercase hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Play Practice VS. Bot ▶
              </button>

              {/* Multiplayer section split */}
              <div className="flex items-center gap-4 my-5">
                <div className="h-[2px] bg-gray-100 flex-1"></div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Multiplayer Arena
                </span>
                <div className="h-[2px] bg-gray-100 flex-1"></div>
              </div>              {/* Multiplayer actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleCreateOnlineRoom}
                  className="w-full btn-miniclip-grey btn-glossy text-white font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2"
                >
                  Create Custom Room
                </button>
 
                <form onSubmit={handleJoinOnlineRoom} className="flex gap-2">
                  <input 
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.toLowerCase())}
                    className="flex-1 bg-gray-50 border-2 border-gray-200 focus:border-gray-400 rounded-xl px-4 py-2 text-sm text-gray-900 font-bold uppercase tracking-wider focus:outline-none transition shadow-inner"
                    placeholder="Room Code (e.g. magic-1234)"
                  />
                  <button
                    type="submit"
                    className="bg-gray-800 hover:bg-gray-700 text-white font-bold px-5 rounded-xl transition flex items-center justify-center border-2 border-gray-800 shadow"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SCREEN: MATCHMAKING ==================== */}
        {screen === "matchmaking" && (
          <div className="w-full max-w-md flex flex-col items-center py-6">
            {/* Pulsing matchmaking card */}
            <div className="w-32 h-32 rounded-full border-4 border-white/20 animate-spin flex items-center justify-center mb-6">
              <Users className="w-12 h-12 text-white animate-pulse" />
            </div>

            <h2 className="text-2xl font-black text-white uppercase tracking-wider text-center">Opening Match Portal</h2>
            <p className="text-sm text-white/70 text-center mt-2 mb-6">
              Send this code to your opponent:
            </p>

            <div className="w-full bg-white border-4 border-gray-200 rounded-3xl p-6 shadow-2xl flex flex-col items-center mb-6">
              <div className="bg-gray-50 px-5 py-3.5 rounded-xl border-2 border-gray-100 flex items-center justify-between w-full mb-3">
                <span className="font-black tracking-wider uppercase text-xl text-orange-600">{roomId}</span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition font-bold"
                >
                  <Copy className="w-4 h-4" /> Copy
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center font-bold">
                Waiting for rival spellcaster...
              </p>
            </div>

            <button
              onClick={handleExitToLobby}
              className="text-xs font-bold text-white/80 hover:text-white hover:underline transition uppercase tracking-wider"
            >
              Cancel Matchmaking
            </button>
          </div>
        )}

        {/* ==================== SCREEN: GAME ROOM ==================== */}
        {screen === "game" && room && (
          <div className="w-full max-w-4xl flex flex-col gap-6 relative">
            
            {/* TOP HEADER: PLAYERS & REALISTIC STOPWATCH */}
            <div className="flex items-center justify-between w-full max-w-3xl mx-auto gap-1 sm:gap-4 z-10 relative">
              
              {/* Player 1 Card (Local) */}
              {(() => {
                const pData = room.players[playerId] || { name: playerName, score: 0, roundScores: [0,0,0,0,0], roundWords: ["","","","",""] };
                return (
                  <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
                    {/* Main Avatar Card */}
                    <div className="bg-white border-4 border-gray-200 rounded-2xl p-2 md:p-3 shadow-xl w-24 sm:w-28 md:w-36 text-center flex flex-col items-center">
                      <div className="text-[9px] md:text-[10px] font-bold text-gray-500 truncate w-full mb-1">{pData.name}</div>
                      <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 border-2 border-white flex items-center justify-center text-white text-xl md:text-2xl font-black shadow shadow-blue-500/30">
                        {pData.name[0]?.toUpperCase()}
                      </div>
                      <div className="mt-1.5 md:mt-2 text-xs md:text-sm font-black text-gray-900">Score: {pData.score}</div>
                    </div>

                    {/* Stacked Round indicators segments */}
                    <div className="flex flex-row md:flex-col gap-1 md:gap-1.5">
                      {Array.from({ length: 5 }).map((_, idx) => {
                        const score = pData.roundScores[idx];
                        const word = pData.roundWords[idx] || "";
                        const isInvalid = word.startsWith("(");
                        let bgClass = "bg-white/40 border-2 border-white/20";
                        if (idx < room.currentRound - 1 || room.status === "game_over" || (idx === 4 && room.conundrumSolvedBy)) {
                          if (idx === 4) bgClass = room.conundrumSolvedBy === playerId ? "bg-emerald-500 border-2 border-emerald-400 shadow-md" : "bg-white/40 border-2 border-white/20";
                          else if (score > 0 && !isInvalid) bgClass = "bg-emerald-500 border-2 border-emerald-400 shadow-md"; // Green for player 1 win/score!
                          else bgClass = "bg-red-500 border-2 border-red-400 shadow-md";
                        }
                        return (
                          <div 
                            key={idx} 
                            className={`w-3 h-4 md:w-4 md:h-6 rounded-md transition-all duration-300 ${bgClass}`}
                            title={word ? `Round ${idx+1}: ${word} (${score} pts)` : `Round ${idx+1}`}
                          ></div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Realistic Center Stopwatch & Dial */}
              <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3">
                {/* Secondary Round circle dial */}
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-300 border-4 border-gray-400 shadow-lg flex flex-col items-center justify-center text-gray-900">
                  <span className="text-[7px] sm:text-[9px] uppercase font-bold text-gray-500 leading-none">Round</span>
                  <span className="text-xs sm:text-sm font-extrabold tracking-tighter leading-none mt-0.5">
                    {room.currentRound === 5 ? "5/5" : `${room.currentRound}/5`}
                  </span>
                </div>

                {/* Stopwatch Dial */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-300 border-4 border-gray-400 shadow-lg relative flex items-center justify-center">
                  {/* Outer stopwatch ticks bezel */}
                  <div className="absolute inset-1.5 sm:inset-2 rounded-full border border-gray-400/40"></div>
                  
                  {/* Digital Clock Display */}
                  <div className="text-center z-10">
                    <p className={`text-xl sm:text-2xl font-black tracking-tight leading-none ${timeLeft <= 5 ? "text-red-600 animate-pulse" : "text-gray-900"}`}>
                      {timeLeft}
                    </p>
                    <p className="text-[7px] sm:text-[9px] uppercase tracking-wider text-gray-500 leading-none mt-0.5 font-bold">Sec</p>
                  </div>

                  {/* Stopwatch dial needle hand */}
                  <div 
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{ transform: `rotate(${needleAngle}deg)`, transition: "transform 1s linear" }}
                  >
                    <div className="w-1 h-6 sm:h-8 bg-red-600 rounded-full -translate-y-3 sm:-translate-y-4 shadow-sm relative">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 sm:w-2 h-1.5 sm:h-2 bg-red-600 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Player 2 Card (Opponent/Bot) */}
              {(() => {
                const playerIds = Object.keys(room.players);
                const opponentId = playerIds.find(id => id !== playerId) || "bot";
                const oppData = room.players[opponentId] || { name: "Spellweaver AI", score: 0, roundScores: [0,0,0,0,0], roundWords: ["","","","",""] };
                return (
                  <div className="flex flex-col md:flex-row-reverse items-center gap-2 md:gap-4">
                    {/* Main Avatar Card */}
                    <div className="bg-white border-4 border-gray-200 rounded-2xl p-2 md:p-3 shadow-xl w-24 sm:w-28 md:w-36 text-center flex flex-col items-center">
                      <div className="text-[9px] md:text-[10px] font-bold text-gray-500 truncate w-full mb-1">{oppData.name}</div>
                      <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 border-2 border-white flex items-center justify-center text-white text-xl md:text-2xl font-black shadow shadow-orange-500/30">
                        {oppData.name[0]?.toUpperCase()}
                      </div>
                      <div className="mt-1.5 md:mt-2 text-xs md:text-sm font-black text-gray-900">Score: {oppData.score}</div>
                    </div>

                    {/* Stacked Round indicators segments */}
                    <div className="flex flex-row md:flex-col gap-1 md:gap-1.5">
                      {Array.from({ length: 5 }).map((_, idx) => {
                        const score = oppData.roundScores[idx];
                        const word = oppData.roundWords[idx] || "";
                        const isInvalid = word.startsWith("(");
                        let bgClass = "bg-white/40 border-2 border-white/20";
                        if (idx < room.currentRound - 1 || room.status === "game_over" || (idx === 4 && room.conundrumSolvedBy)) {
                          if (idx === 4) bgClass = room.conundrumSolvedBy === opponentId ? "bg-blue-500 border-2 border-blue-400 shadow-md" : "bg-white/40 border-2 border-white/20";
                          else if (score > 0 && !isInvalid) bgClass = "bg-blue-500 border-2 border-blue-400 shadow-md"; // Blue for player 2 win/score!
                          else bgClass = "bg-red-500 border-2 border-red-400 shadow-md";
                        }
                        return (
                          <div 
                            key={idx} 
                            className={`w-3 h-4 md:w-4 md:h-6 rounded-md transition-all duration-300 ${bgClass}`}
                            title={word ? `${oppData.name} Round ${idx+1}: ${word} (${score} pts)` : `Round ${idx+1}`}
                          ></div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Error notifications */}
            {errorMessage && (
              <div className="w-full max-w-md mx-auto bg-yellow-100 border-2 border-yellow-300 text-yellow-800 px-4 py-2.5 rounded-2xl text-center text-sm font-bold shadow-lg animate-bounce z-20">
                {errorMessage}
              </div>
            )}

            {/* ==================== GAME PHASE: SELECTING ==================== */}
            {room.status === "selecting" && (
              <div className="w-full max-w-xl mx-auto flex flex-col items-center bg-black/10 rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-white/5 px-4">
                <h2 className="text-xl sm:text-2xl font-black text-white mb-6 uppercase tracking-wider text-center">
                  {isPicker ? "Choose this round's letters!" : `Waiting for ${room.pickerName}...`}
                </h2>

                {/* Dash slots letter board */}
                <div className="flex gap-1.5 sm:gap-2.5 justify-center mb-8 flex-wrap">
                  {Array.from({ length: 9 }).map((_, idx) => {
                    const l = room.letters[idx];
                    return (
                      <div 
                        key={idx}
                        className={`w-11 h-11 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl flex items-center justify-center text-xl sm:text-2xl font-black transition-all ${
                          l 
                            ? "tile-classic text-gray-900 border border-gray-300 scale-100 animate-tile-flip" 
                            : "bg-black/20 border-2 border-white/10 border-dashed text-transparent scale-95"
                        }`}
                      >
                        {l || ""}
                      </div>
                    );
                  })}
                </div>

                {/* Letter picking choices */}
                {isPicker && (
                  <div className="flex flex-col gap-4 w-full max-w-xs">
                    <div className="flex gap-4">
                      <button
                        onClick={() => pickLetter(true)}
                        disabled={room.letters.length >= 9}
                        className="flex-1 btn-miniclip-grey btn-glossy text-white font-black py-3 sm:py-4 rounded-xl text-md sm:text-lg disabled:opacity-40"
                      >
                        Vowel
                      </button>
                      <button
                        onClick={() => pickLetter(false)}
                        disabled={room.letters.length >= 9}
                        className="flex-1 btn-miniclip-grey btn-glossy text-white font-black py-3 sm:py-4 rounded-xl text-md sm:text-lg disabled:opacity-40"
                      >
                        Consonant
                      </button>
                    </div>
                    
                    <button
                      onClick={pickAllLettersRandomly}
                      disabled={room.letters.length >= 9}
                      className="w-full btn-miniclip-orange btn-glossy text-white font-black py-3 sm:py-3.5 rounded-full text-sm sm:text-md tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-40"
                    >
                      <Sparkles className="w-4 h-4" /> 9 Random Letters
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ==================== GAME PHASE: PLAYING ==================== */}
            {room.status === "playing" && (
              <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-2xl mx-auto px-2 sm:px-4">
                
                {/* Boards area with multipliers overlay */}
                <div className="bg-black/10 border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col items-center">
                  <div className="grid grid-cols-5 sm:grid-cols-9 gap-2 sm:gap-3 justify-center mb-4 sm:mb-5">
                    {visualShuffleMap.map((letterIdx) => {
                      const letter = room.letters[letterIdx];
                      const isUsed = activeIndices.includes(letterIdx);
                      const isx2 = letterIdx === room.multipliers?.x2;
                      const isx3 = letterIdx === room.multipliers?.x3;

                      return (
                        <div
                          key={letterIdx}
                          onClick={() => handleTileClick(letterIdx)}
                          className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-black select-none cursor-pointer relative ${
                            isUsed 
                              ? "bg-black/30 text-transparent border-2 border-white/5 cursor-default scale-95 shadow-none" 
                              : "tile-classic text-gray-900 border border-gray-300"
                          }`}
                        >
                          {!isUsed && letter}

                          {/* Multipliers corner ribbons */}
                          {isx2 && !isUsed && (
                            <span className="absolute -top-1.5 -right-1.5 text-[8px] font-black px-1.5 py-0.5 rounded-full bg-pink-600 text-white border border-pink-300 animate-pulse glow-red">
                              x2
                            </span>
                          )}
                          {isx3 && !isUsed && (
                            <span className="absolute -top-1.5 -right-1.5 text-[8px] font-black px-1.5 py-0.5 rounded-full bg-amber-500 text-white border border-amber-300 animate-pulse glow-gold">
                              x3
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Shuffle and Clear buttons */}
                  {room.currentRound < 5 && (
                    <div className="flex gap-4">
                      <button
                        onClick={handleShuffleTiles}
                        className="text-xs font-bold text-white/75 hover:text-white transition flex items-center gap-1 hover:underline"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Shuffle Letters
                      </button>
                      <button
                        onClick={() => { playSound("remove"); setActiveIndices([]); }}
                        className="text-xs font-bold text-white/75 hover:text-red-400 transition flex items-center gap-1 hover:underline"
                      >
                        Clear Selection
                      </button>
                    </div>
                  )}
                </div>

                {/* Spell Scroll active tiles shelf */}
                <div className="bg-white border-4 border-gray-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl flex flex-col items-center">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                    Your Submitted Word
                  </span>

                  {/* Letters placed in shelf */}
                  <div className="flex gap-1.5 sm:gap-2 flex-wrap justify-center min-h-[56px] sm:min-h-[64px] border-2 border-dashed border-gray-200 rounded-xl sm:rounded-2xl p-2 sm:p-4 w-full bg-gray-50">
                    {activeIndices.length === 0 ? (
                      <span className="text-xs sm:text-sm text-gray-400 font-bold py-1.5 sm:py-2 text-center tracking-wide uppercase px-2">
                        {room.currentRound === 5 ? "Type conundrum word and click Submit..." : "Type letters or click tiles to form word"}
                      </span>
                    ) : (
                      activeIndices.map((boardIdx, scrollIdx) => {
                        const letter = room.letters[boardIdx];
                        return (
                          <div
                            key={scrollIdx}
                            onClick={() => handleTileClick(boardIdx)}
                            className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 text-gray-900 cursor-pointer flex items-center justify-center font-bold text-lg sm:text-xl shadow uppercase transition-transform"
                          >
                            {letter}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Cast Spell Button */}
                  <div className="w-full mt-6 flex flex-col items-center">
                    <button
                      onClick={() => {
                        const word = activeIndices.map(idx => room.letters[idx]).join("");
                        if (word.length >= 2 || room.currentRound === 5) {
                          submitWord(word);
                          setActiveIndices([]);
                        }
                      }}
                      className="w-full max-w-xs btn-miniclip-orange btn-glossy text-white font-black py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl transition tracking-widest uppercase text-center shadow-lg text-md sm:text-lg"
                    >
                      Cast Word ▶
                    </button>
                    
                    {localWord && (
                      <div className="mt-4 text-xs text-emerald-700 font-bold bg-emerald-100 px-4 py-1.5 border-2 border-emerald-300 rounded-full flex items-center gap-1 shadow">
                        <CheckCircle className="w-4 h-4 text-emerald-600" /> Word Casted: {localWord}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ==================== GAME PHASE: ROUND OVER ==================== */}
            {room.status === "round_over" && (
              <div className="w-full max-w-xl mx-auto flex flex-col items-center bg-black/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/5">
                <div className="text-center mb-6">
                  <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">Round Complete</h3>
                  <h2 className="text-2xl font-black text-white">Compare Spells</h2>
                </div>

                {/* Compare cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-6">
                  {Object.keys(room.players).map((pId) => {
                    const p = room.players[pId];
                    const isLocal = pId === playerId;
                    const roundIdx = room.currentRound - 1;
                    const score = p.roundScores[roundIdx];
                    const word = p.roundWords[roundIdx] || "-";
                    const isInvalid = word.startsWith("(");

                    return (
                      <div 
                        key={pId}
                        className="bg-white border-4 border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xl text-center flex flex-col items-center"
                      >
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full ${
                          isLocal ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"
                        } mb-4`}>
                          {isLocal ? "Your Word" : p.name}
                        </span>

                        <p className={`text-2xl sm:text-3xl font-black tracking-tight ${
                          isInvalid ? "text-red-500 line-through" : "text-gray-900"
                        }`}>
                          {word.replace(/[()]/g, "")}
                        </p>
                        
                        <p className="text-[11px] font-bold text-gray-400 mt-1 uppercase tracking-wide">
                          {isInvalid ? "Invalid Word" : (word !== "-" ? `${word.length} Letters` : "No Word")}
                        </p>

                        <div className="h-[2px] bg-gray-100 w-full my-4"></div>

                        <p className="text-2xl sm:text-3xl font-black text-gray-800 leading-none">
                          +{score} <span className="text-xs text-gray-500 font-bold">pts</span>
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Advance round */}
                <button
                  onClick={nextRound}
                  className="w-full max-w-xs btn-miniclip-orange btn-glossy text-white font-black py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl transition tracking-widest uppercase shadow-lg text-sm sm:text-md"
                >
                  {room.currentRound === 4 ? "Open Conundrum Round ▶" : "Next Round ▶"}
                </button>
              </div>
            )}

            {/* ==================== GAME PHASE: GAME OVER ==================== */}
            {room.status === "game_over" && (
              <div className="w-full max-w-md mx-auto bg-white border-4 border-gray-200 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-amber-100 border-2 border-amber-300 rounded-full flex items-center justify-center mb-5 animate-bounce">
                  <Trophy className="w-10 h-10 text-amber-500" />
                </div>

                {/* Winner names */}
                {(() => {
                  const playerIds = Object.keys(room.players);
                  let winnerName = "No One";
                  let highestScore = -1;
                  let draw = false;

                  playerIds.forEach(pId => {
                    const score = room.players[pId].score;
                    if (score > highestScore) {
                      highestScore = score;
                      winnerName = room.players[pId].name;
                      draw = false;
                    } else if (score === highestScore) {
                      draw = true;
                    }
                  });

                  return (
                    <div className="mb-4">
                      <h2 className="text-3xl font-black text-gray-900 uppercase">
                        {draw ? "Draw Match!" : `${winnerName} Wins!`}
                      </h2>
                      <p className="text-xs font-bold text-gray-400 tracking-wider uppercase mt-1">
                        {draw ? "Perfect Equality" : "Grand Archmage Crowned"}
                      </p>
                    </div>
                  );
                })()}

                {/* Scores leaderboard */}
                <div className="w-full flex flex-col gap-2.5 my-3">
                  {Object.keys(room.players).map((pId) => {
                    const p = room.players[pId];
                    return (
                      <div 
                        key={pId}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 ${
                          pId === playerId 
                            ? "bg-gray-50 border-gray-300 text-gray-950 font-bold" 
                            : "bg-white border-gray-200 text-gray-700"
                        }`}
                      >
                        <span className="text-sm font-bold">{p.name} {pId === playerId && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 border border-orange-100 rounded ml-2">YOU</span>}</span>
                        <span className="text-lg font-black text-gray-950">{p.score} pts</span>
                      </div>
                    );
                  })}
                </div>

                {/* Conundrum solve details */}
                {room.conundrumWord && (
                  <div className="text-xs text-gray-500 flex flex-col items-center gap-1.5 w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-3 text-center my-2 font-bold">
                    <span>Conundrum Word: <strong className="text-gray-900 tracking-widest">{room.conundrumWord}</strong></span>
                    {room.conundrumSolvedBy ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        Solved by: {room.conundrumSolvedByName} (+11 pts)
                      </span>
                    ) : (
                      <span className="text-red-500">Solved by No One</span>
                    )}
                  </div>
                )}

                {/* Rematch/Exit */}
                <div className="flex flex-col gap-3 w-full mt-4">
                  {!isMultiplayer && (
                    <button
                      onClick={() => {
                        playSound("success");
                        restartLocalGame();
                      }}
                      className="w-full btn-miniclip-orange btn-glossy text-white font-black py-4 rounded-xl transition tracking-wide text-md"
                    >
                      Rematch Duel
                    </button>
                  )}
                  <button
                    onClick={handleExitToLobby}
                    className="w-full btn-miniclip-grey btn-glossy text-white font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Exit to Lobby
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Global Sound controller at bottom left, mimicking the classic layout */}
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
