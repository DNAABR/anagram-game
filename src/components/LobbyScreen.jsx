// H2: Extracted LobbyScreen from App.jsx monolith

import { Users, ArrowRight, User, Sliders } from "lucide-react";
import { playSound } from "../utils/audio";

export default function LobbyScreen({
  playerName, savePlayerName, botDifficulty, setBotDifficulty,
  startPracticeGame, handleCreateOnlineRoom, handleJoinOnlineRoom,
  roomId, setRoomId
}) {
  return (
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
        </div>

        {/* Multiplayer actions */}
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
  );
}
