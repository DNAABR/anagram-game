// H3/H5: Extracted PlayerCard component — was an IIFE inline in JSX, duplicated for both players

import RoundIndicators from "./RoundIndicators";

export default function PlayerCard({ player, room, ownerId, colorClass, borderClass, gradientFrom, gradientTo, shadowClass, reversed = false }) {
  return (
    <div className={`flex flex-col ${reversed ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-2 md:gap-4`}>
      {/* Main Avatar Card */}
      <div className="bg-white border-4 border-gray-200 rounded-2xl p-2 md:p-3 shadow-xl w-24 sm:w-28 md:w-36 text-center flex flex-col items-center">
        <div className="text-[9px] md:text-[10px] font-bold text-gray-500 truncate w-full mb-1">{player.name}</div>
        <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${gradientFrom} ${gradientTo} border-2 border-white flex items-center justify-center text-white text-xl md:text-2xl font-black shadow ${shadowClass}`}>
          {player.name[0]?.toUpperCase()}
        </div>
        <div className="mt-1.5 md:mt-2 text-xs md:text-sm font-black text-gray-900">Score: {player.score}</div>
      </div>

      {/* Stacked Round indicators segments */}
      <RoundIndicators
        roundScores={player.roundScores}
        roundWords={player.roundWords}
        room={room}
        ownerId={ownerId}
        colorClass={colorClass}
        borderClass={borderClass}
      />
    </div>
  );
}
