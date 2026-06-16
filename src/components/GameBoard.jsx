import { Users, Sparkles, RefreshCw, CheckCircle, LogOut, Trophy, Copy } from "lucide-react";
import { playSound } from "../utils/audio";
import PlayerCard from "./PlayerCard";

// ==================== SUB-COMPONENTS ====================

function SelectingPhase({ room, isPicker, pickLetter, pickAllLettersRandomly }) {
  return (
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
  );
}

function PlayingPhase({ room, visualShuffleMap, activeIndices, setActiveIndices, handleTileClick, handleShuffleTiles, submitWord, localWord }) {
  return (
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
  );
}

function RoundOverPhase({ room, playerId, nextRound }) {
  return (
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
  );
}

function GameOverScreen({ room, playerId, isMultiplayer, restartLocalGame, handleExitToLobby }) {
  // Compute winner
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
    <div className="w-full max-w-md mx-auto bg-white border-4 border-gray-200 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
      <div className="w-20 h-20 bg-amber-100 border-2 border-amber-300 rounded-full flex items-center justify-center mb-5 animate-bounce">
        <Trophy className="w-10 h-10 text-amber-500" />
      </div>

      {/* Winner names */}
      <div className="mb-4">
        <h2 className="text-3xl font-black text-gray-900 uppercase">
          {draw ? "Draw Match!" : `${winnerName} Wins!`}
        </h2>
        <p className="text-xs font-bold text-gray-400 tracking-wider uppercase mt-1">
          {draw ? "Perfect Equality" : "Grand Archmage Crowned"}
        </p>
      </div>

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
  );
}

function MatchmakingScreen({ roomId, handleCopyCode, handleExitToLobby }) {
  return (
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
  );
}

// ==================== MAIN GAME BOARD COMPONENT ====================

export default function GameBoard({
  room, playerId, playerName, isMultiplayer, timeLeft,
  isPicker, localWord, activeIndices, setActiveIndices,
  pickLetter, pickAllLettersRandomly, submitWord, nextRound,
  restartLocalGame, errorMessage, visualShuffleMap,
  handleTileClick, handleShuffleTiles, handleCopyCode,
  handleExitToLobby, roomId, screen
}) {
  // Calculate stopwatch rotation
  const timerDuration = room?.timerDuration || 30;
  const needleAngle = room ? (timeLeft / timerDuration) * 360 : 360;

  if (screen === "matchmaking") {
    return <MatchmakingScreen roomId={roomId} handleCopyCode={handleCopyCode} handleExitToLobby={handleExitToLobby} />;
  }

  if (!room) return null;

  // Get opponent data
  const opponentId = Object.keys(room.players).find(id => id !== playerId) || "bot";
  const oppData = room.players[opponentId] || { name: "Spellweaver AI", score: 0, roundScores: [0,0,0,0,0], roundWords: ["","","","",""] };
  const pData = room.players[playerId] || { name: playerName, score: 0, roundScores: [0,0,0,0,0], roundWords: ["","","","",""] };

  return (
    <div className="w-full max-w-4xl flex flex-col gap-6 relative">
      
      {/* TOP HEADER: PLAYERS & REALISTIC STOPWATCH */}
      <div className="flex items-center justify-between w-full max-w-3xl mx-auto gap-1 sm:gap-4 z-10 relative">
        
        {/* Player 1 Card (Local) */}
        <PlayerCard
          player={pData}
          room={room}
          ownerId={playerId}
          colorClass="bg-emerald-500"
          borderClass="border-emerald-400"
          gradientFrom="from-blue-400"
          gradientTo="to-indigo-500"
          shadowClass="shadow-blue-500/30"
        />

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
        <PlayerCard
          player={oppData}
          room={room}
          ownerId={opponentId}
          colorClass="bg-blue-500"
          borderClass="border-blue-400"
          gradientFrom="from-yellow-400"
          gradientTo="to-orange-500"
          shadowClass="shadow-orange-500/30"
          reversed
        />
      </div>

      {/* Error notifications */}
      {errorMessage && (
        <div className="w-full max-w-md mx-auto bg-yellow-100 border-2 border-yellow-300 text-yellow-800 px-4 py-2.5 rounded-2xl text-center text-sm font-bold shadow-lg animate-bounce z-20">
          {errorMessage}
        </div>
      )}

      {/* GAME PHASES */}
      {room.status === "selecting" && (
        <SelectingPhase room={room} isPicker={isPicker} pickLetter={pickLetter} pickAllLettersRandomly={pickAllLettersRandomly} />
      )}

      {room.status === "playing" && (
        <PlayingPhase
          room={room} visualShuffleMap={visualShuffleMap}
          activeIndices={activeIndices} setActiveIndices={setActiveIndices}
          handleTileClick={handleTileClick} handleShuffleTiles={handleShuffleTiles}
          submitWord={submitWord} localWord={localWord}
        />
      )}

      {room.status === "round_over" && (
        <RoundOverPhase room={room} playerId={playerId} nextRound={nextRound} />
      )}

      {room.status === "game_over" && (
        <GameOverScreen
          room={room} playerId={playerId} isMultiplayer={isMultiplayer}
          restartLocalGame={restartLocalGame} handleExitToLobby={handleExitToLobby}
        />
      )}
    </div>
  );
}
