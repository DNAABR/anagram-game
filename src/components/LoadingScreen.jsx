// H2: Extracted LoadingScreen from App.jsx monolith

export default function LoadingScreen() {
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
