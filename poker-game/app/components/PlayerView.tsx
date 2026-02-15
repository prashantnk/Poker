import { useState } from 'react';
import Card from './Card';

type PlayerViewProps = {
  roomCode: string;
  me: any;
  stage: string;
  onFold: () => void;
  onToggleReveal: (current: boolean) => void;
  onLeave: () => void;
};

export default function PlayerView({ roomCode, me, stage, onFold, onToggleReveal, onLeave }: PlayerViewProps) {
  const [isPeeking, setIsPeeking] = useState(false);
  const [forceShow, setForceShow] = useState(false);

  const hasCards = me?.hand && me.hand.length > 0;
  const isFolded = me?.status === 'folded';

  return (
    // 1. min-h-[100.1vh]: Forces browser to allow "Pull to Refresh" gesture
    // 2. overflow-y-auto: Enables scrolling if content is too tall
    <div className="min-h-[100.1vh] bg-neutral-900 flex flex-col p-4 relative text-white overflow-y-auto">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-2 shrink-0">
         <div className="text-gray-400 text-xs font-mono">ROOM: {roomCode}</div>
         <button onClick={onLeave} className="text-red-500 text-[10px] border border-red-900 px-2 py-1 rounded active:bg-red-900/20">LEAVE</button>
      </div>

      <div className="text-center mb-4 shrink-0">
         <div className="text-yellow-500 font-bold text-3xl">{me?.name}</div>
         <div className="text-gray-500 text-xs uppercase tracking-widest">{isFolded ? 'FOLDED - WATCHING' : stage}</div>
      </div>

      {/* CARD AREA */}
      <div className="flex-1 flex flex-col justify-center items-center gap-6 relative min-h-[300px] w-full shrink-0">
        {hasCards ? (
          <>
            <div className={`flex justify-center gap-4 w-full h-full items-center transition-opacity duration-300 ${isFolded ? 'opacity-40' : ''}`}>
               <div className="w-[45%] max-w-[350px] aspect-[2.5/3.5] relative">
                 <Card card={me.hand[0]} hidden={!isPeeking && !forceShow} size="lg" />
               </div>
               <div className="w-[45%] max-w-[350px] aspect-[2.5/3.5] relative">
                 <Card card={me.hand[1]} hidden={!isPeeking && !forceShow} size="lg" />
               </div>
            </div>
            
            {isFolded && (
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-red-600 text-5xl md:text-8xl font-black border-[8px] md:border-[12px] border-red-600 p-4 md:p-8 rounded-3xl -rotate-12 tracking-widest opacity-80 mix-blend-screen bg-black/40">
                     FOLDED
                  </div>
               </div>
            )}

            <button 
              className={`w-full py-6 rounded-2xl font-bold text-2xl shadow-lg touch-none select-none transition-colors ${forceShow ? 'bg-gray-800 text-gray-500' : 'bg-blue-600 active:bg-blue-700 text-white'}`}
              // Keep touch-none HERE to prevent scrolling while holding the peek button
              onPointerDown={() => setIsPeeking(true)}
              onPointerUp={() => setIsPeeking(false)}
              onPointerLeave={() => setIsPeeking(false)}
              disabled={forceShow}
            >
              {forceShow ? 'CARDS PINNED OPEN' : isPeeking ? 'REVEALING...' : 'HOLD TO PEEK'}
            </button>
          </>
        ) : (
          <div className="text-white/20 text-4xl font-black text-center animate-pulse">WAITING...</div>
        )}
      </div>
      
      {/* CONTROLS */}
      {/* Added pb-12 to ensure buttons are not hidden behind phone home bars */}
      <div className="mt-6 flex flex-col gap-3 shrink-0 pb-12">
         <div className="flex justify-between items-center bg-neutral-800 p-4 rounded-xl">
            <span className="font-bold text-sm text-gray-300">Keep Cards Open</span>
            <button onClick={() => setForceShow(!forceShow)} className={`w-14 h-8 rounded-full relative transition-colors ${forceShow ? 'bg-green-500' : 'bg-gray-600'}`}>
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${forceShow ? 'left-7' : 'left-1'}`}></div>
            </button>
         </div>

         <div className={`flex justify-between items-center bg-neutral-800 p-4 rounded-xl border ${me?.is_revealed ? 'border-yellow-500/50' : 'border-transparent'}`}>
            <div className="flex flex-col">
              <span className={`font-bold text-sm ${me?.is_revealed ? 'text-yellow-500' : 'text-gray-300'}`}>Auto-Reveal</span>
              <span className="text-[10px] text-gray-500">Show to TV at Showdown</span>
            </div>
            <button onClick={() => onToggleReveal(me?.is_revealed)} className={`w-14 h-8 rounded-full relative transition-colors ${me?.is_revealed ? 'bg-yellow-500' : 'bg-gray-600'}`}>
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${me?.is_revealed ? 'left-7' : 'left-1'}`}></div>
            </button>
         </div>

         {!isFolded && hasCards && (
            <button onClick={onFold} className="w-full py-4 rounded-xl border-2 border-red-600 text-red-500 font-bold text-xl active:bg-red-900/20 mt-2">
              FOLD HAND
            </button>
         )}
      </div>
    </div>
  );
}