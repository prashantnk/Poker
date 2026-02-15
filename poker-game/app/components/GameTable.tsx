import Card, { CardType } from './Card';
import GameNotifications, { LogMessage } from './GameNotifications';

type GameTableProps = {
  roomCode: string;
  roomData: any;
  players: any[];
  onNextStage: () => void;
  onEndGame: () => void;
  onShuffleChange: (val: number) => void;
  logs: LogMessage[];
};

export default function GameTable({ roomCode, roomData, players, onNextStage, onEndGame, onShuffleChange, logs }: GameTableProps) {
  const stage = roomData?.stage || 'waiting';
  const isShowdown = stage === 'showdown';
  const showComm = stage === 'waiting' || stage === 'preflop' ? 0 : stage === 'flop' ? 3 : stage === 'turn' ? 4 : 5;
  const shuffleFactor = roomData?.shuffle_factor ?? 100;
  
  // Extract QR
  const qrUrl = roomData?.qr_url;

  return (
    <div className="h-screen bg-[#1a2e22] flex flex-col items-center p-2 text-white overflow-hidden relative">
      <GameNotifications logs={logs} />

      {/* QR SCANNER - Floating Right */}
      {qrUrl && (
        <div className="absolute top-16 right-4 md:right-8 z-40 bg-white p-2 rounded-xl shadow-2xl animate-in slide-in-from-right duration-700 hidden lg:block">
           <img src={qrUrl} alt="Payment Scanner" className="w-24 h-24 md:w-32 md:h-32 object-contain" />
           <div className="text-black text-center font-bold text-[10px] mt-1 tracking-widest">SCAN TO PAY</div>
        </div>
      )}

      {/* HEADER */}
      <div className="w-full flex justify-between items-center px-6 py-3 font-mono text-emerald-200/60 border-b border-white/5 shrink-0">
         <div className="flex flex-col">
            <span className="text-xl md:text-2xl">ROOM: <span className="text-white font-bold">{roomCode}</span></span>
            <span className="text-xs text-emerald-500/50 uppercase tracking-widest">
               RANDOMNESS: {shuffleFactor}%
            </span>
         </div>
         <span className="text-2xl md:text-4xl font-bold uppercase tracking-widest text-yellow-500 animate-pulse">{stage}</span>
         <button onClick={onEndGame} className="text-red-400 text-sm border border-red-900 px-4 py-2 rounded hover:bg-red-900/20">END</button>
      </div>
      
      {/* TABLE AREA */}
      <div className="w-full max-w-[95vw] my-2 md:my-6 flex justify-center items-center shrink-0 h-[35vh] min-h-[220px]">
        <div className="relative w-full h-full bg-[#254230] rounded-[50px] md:rounded-[100px] border-[8px] md:border-[16px] border-[#3e2c26] shadow-2xl flex items-center justify-center mx-2">
           <div className="flex gap-2 md:gap-6 px-4">
             {(roomData?.community_cards || []).map((c: CardType, i: number) => (
                <div key={i} className="w-16 md:w-24 lg:w-32">
                  <Card card={c} hidden={i >= showComm} size="md" />
                </div>
             ))}
           </div>
        </div>
      </div>
      
      {/* CONTROLS */}
      <div className="py-2 flex flex-col items-center gap-2 shrink-0">
        <button onClick={onNextStage} className="bg-yellow-500 active:bg-yellow-600 text-black px-12 md:px-16 py-4 md:py-5 rounded-full font-black text-2xl md:text-3xl shadow-[0_0_30px_rgba(234,179,8,0.4)] transition-transform active:scale-95">
           {stage === 'showdown' ? 'NEW ROUND ↺' : stage === 'river' ? 'SHOWDOWN ➔' : 'DEAL ➔'}
        </button>

        {/* SLIDER */}
        {(stage === 'waiting' || stage === 'showdown') && (
          <div className="flex items-center gap-4 bg-black/40 px-6 py-2 rounded-full border border-white/10">
             <span className="text-xs font-bold text-gray-400">RIGGED</span>
             <input 
               type="range" min="0" max="100" step="10"
               value={shuffleFactor} 
               onChange={(e) => onShuffleChange(parseInt(e.target.value))}
               className="w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
             />
             <span className="text-xs font-bold text-emerald-400">FAIR</span>
          </div>
        )}
      </div>
      
      {/* PLAYER GRID */}
      <div className="flex-1 w-full max-w-[95vw] overflow-y-auto px-2 pb-2">
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-6">
          {players.map(p => {
             const showCards = isShowdown && p.is_revealed;
             return (
               <div key={p.id} className={`p-3 rounded-xl text-center border relative transition-all ${p.status === 'folded' ? 'bg-gray-900 border-gray-800 opacity-60' : 'bg-black/40 border-emerald-500/30'}`}>
                 <div className="font-bold text-lg md:text-xl truncate mb-2 text-white">{p.name}</div>
                 <div className="flex justify-center gap-2 mb-2 h-16 md:h-24 items-center">
                    {p.hand?.length > 0 ? (
                      <>
                        <div className="w-10 md:w-16"><Card card={p.hand[0]} hidden={!showCards} size="sm" /></div>
                        <div className="w-10 md:w-16"><Card card={p.hand[1]} hidden={!showCards} size="sm" /></div>
                      </>
                    ) : <span className="text-xs md:text-sm self-center opacity-50">EMPTY</span>}
                 </div>
                 <div className={`text-xs md:text-sm uppercase font-black flex justify-center items-center gap-1 ${p.status === 'folded' ? 'text-red-500' : 'text-emerald-400'}`}>
                   {p.status === 'folded' ? 'FOLDED' : (p.is_revealed ? 'SHOWING' : 'MUCK')}
                   {p.is_revealed && <span className="text-yellow-500 text-lg">👁</span>}
                 </div>
               </div>
             )
          })}
        </div>
      </div>
    </div>
  );
}