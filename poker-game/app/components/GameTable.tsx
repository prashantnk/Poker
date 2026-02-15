import Card, { CardType } from './Card';
import GameNotifications, { LogMessage } from './GameNotifications';

type GameTableProps = {
  roomCode: string;
  roomData: any;
  players: any[];
  onNextStage: () => void;
  onEndGame: () => void;
  logs: LogMessage[];
};

export default function GameTable({ roomCode, roomData, players, onNextStage, onEndGame, logs }: GameTableProps) {
  const stage = roomData?.stage || 'waiting';
  const isShowdown = stage === 'showdown';
  const showComm = stage === 'waiting' || stage === 'preflop' ? 0 : stage === 'flop' ? 3 : stage === 'turn' ? 4 : 5;

  return (
    <div className="min-h-screen bg-[#1a2e22] flex flex-col items-center p-2 text-white overflow-hidden relative">
      <GameNotifications logs={logs} />

      {/* HEADER */}
      <div className="w-full flex justify-between items-center px-4 py-4 font-mono text-emerald-200/60">
         <span className="text-xl">ROOM: <span className="text-white font-bold">{roomCode}</span></span>
         <span className="text-2xl font-bold uppercase tracking-widest text-yellow-500 animate-pulse">{stage}</span>
         <button onClick={onEndGame} className="text-red-400 text-sm border border-red-900 px-3 py-1 rounded hover:bg-red-900/20">END</button>
      </div>
      
      {/* TABLE AREA */}
      <div className="flex-1 flex flex-col justify-center w-full max-w-5xl my-4">
        <div className="relative w-full aspect-[2/1] bg-[#254230] rounded-[50px] md:rounded-[150px] border-[8px] md:border-[16px] border-[#3e2c26] shadow-2xl flex items-center justify-center">
           <div className="flex gap-2 md:gap-4 px-4">
             {(roomData?.community_cards || []).map((c: CardType, i: number) => (
                <div key={i} className="w-16 md:w-24">
                  <Card card={c} hidden={i >= showComm} />
                </div>
             ))}
           </div>
        </div>
      </div>
      
      {/* CONTROLS */}
      <div className="py-4">
        <button onClick={onNextStage} className="bg-yellow-500 active:bg-yellow-600 text-black px-12 py-4 rounded-full font-black text-2xl shadow-[0_0_30px_rgba(234,179,8,0.4)] transition-transform active:scale-95">
           {stage === 'showdown' ? 'NEW ROUND ↺' : stage === 'river' ? 'SHOWDOWN ➔' : 'DEAL ➔'}
        </button>
      </div>
      
      {/* PLAYER GRID */}
      <div className="w-full max-w-7xl grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4 pb-4 px-2">
        {players.map(p => {
           const showCards = isShowdown && p.is_revealed;
           return (
             <div key={p.id} className={`p-2 rounded-xl text-center border relative transition-all ${p.status === 'folded' ? 'bg-gray-900 border-gray-800 opacity-60' : 'bg-black/40 border-emerald-500/30'}`}>
               <div className="font-bold text-lg truncate mb-2">{p.name}</div>
               <div className="flex justify-center gap-1 mb-1 h-16 md:h-20">
                  {p.hand?.length > 0 ? (
                    <>
                      <Card card={p.hand[0]} hidden={!showCards} className="w-10 md:w-14" />
                      <Card card={p.hand[1]} hidden={!showCards} className="w-10 md:w-14" />
                    </>
                  ) : <span className="text-xs self-center opacity-50">EMPTY</span>}
               </div>
               <div className={`text-xs uppercase font-bold flex justify-center items-center gap-1 ${p.status === 'folded' ? 'text-red-500' : 'text-emerald-400'}`}>
                 {p.status === 'folded' ? 'FOLDED' : (p.is_revealed ? 'WILL SHOW' : 'MUCK')}
                 {p.is_revealed && <span className="text-yellow-500 text-[10px]">👁</span>}
               </div>
             </div>
           )
        })}
      </div>
    </div>
  );
}