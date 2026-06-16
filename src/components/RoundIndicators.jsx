// H5: Extracted reusable RoundIndicators component — was duplicated for both players

export default function RoundIndicators({ roundScores, roundWords, room, ownerId, colorClass = "bg-emerald-500", borderClass = "border-emerald-400" }) {
  return (
    <div className="flex flex-row md:flex-col gap-1 md:gap-1.5">
      {Array.from({ length: 5 }).map((_, idx) => {
        const score = roundScores[idx];
        const word = roundWords[idx] || "";
        const isInvalid = word.startsWith("(");
        let bgClass = "bg-white/40 border-2 border-white/20";
        if (idx < room.currentRound - 1 || room.status === "game_over" || (idx === 4 && room.conundrumSolvedBy)) {
          if (idx === 4) {
            bgClass = room.conundrumSolvedBy === ownerId 
              ? `${colorClass} border-2 ${borderClass} shadow-md` 
              : "bg-white/40 border-2 border-white/20";
          } else if (score > 0 && !isInvalid) {
            bgClass = `${colorClass} border-2 ${borderClass} shadow-md`;
          } else {
            bgClass = "bg-red-500 border-2 border-red-400 shadow-md";
          }
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
  );
}
