import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
  
  const [qrList, setQrList] = useState<{name: string, url: string}[]>([]);
  const [isQrZoomed, setIsQrZoomed] = useState(false);
  
  // State for Player Zoom
  const [zoomedPlayer, setZoomedPlayer] = useState<any>(null);
  
  useEffect(() => {
    const fetchQRs = async () => {
      const { data } = await supabase.storage.from('qrcodes').list();
      if (data) {
        const list = data
          .filter(f => f.name !== '.emptyFolderPlaceholder')
          .map(f => ({
            name: f.name.includes('_') ? f.name.split('_')[0] : f.name,
            url: supabase.storage.from('qrcodes').getPublicUrl(f.name).data.publicUrl
          }));
        setQrList(list);
      }
    };
    fetchQRs();
  }, []);

  const handleQrChange = async (url: string) => {
    await supabase.from('rooms').update({ qr_url: url }).eq('id', roomCode);
  };

  return (
    <div className="h-screen bg-[#1a2e22] flex flex-col items-center p-2 text-white overflow-hidden relative">
      <GameNotifications logs={logs} />

      {/* --- MODALS --- */}

      {/* 1. QR ZOOM MODAL (Click to dismiss) */}
      {isQrZoomed && roomData?.qr_url && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-8 cursor-pointer animate-in fade-in duration-200"
          onClick={() => setIsQrZoomed(false)}
        >
          <div className="relative bg-white p-4 rounded-3xl shadow-2xl max-w-full max-h-full" onClick={e => e.stopPropagation()}>
            <img src={roomData.qr_url} alt="Full Scanner" className="max-w-full max-h-[80vh] object-contain" />
            <div className="text-black text-center font-bold text-xl mt-4 tracking-widest uppercase">SCAN TO PAY</div>
          </div>
        </div>
      )}

      {/* 2. PLAYER ZOOM OVERLAY (Click based) */}
      {zoomedPlayer && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in zoom-in duration-150 cursor-zoom-out"
          onClick={() => setZoomedPlayer(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
          
          {/* Huge Player Card View */}
          <div 
            className="relative bg-[#1a2e22] border-[6px] border-emerald-500 p-8 rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-3xl flex flex-col items-center gap-6 transform scale-110 cursor-default"
            onClick={(e) => e.stopPropagation()} 
          >
            {/* Close Button */}
            <button 
              onClick={() => setZoomedPlayer(null)}
              className="absolute top-4 right-6 text-white/30 hover:text-white text-4xl transition-colors cursor-pointer"
            >
              &times;
            </button>

            <div className="font-black text-5xl md:text-7xl text-white drop-shadow-xl tracking-wide text-center uppercase">
              {zoomedPlayer.name}
            </div>

            <div className="flex justify-center gap-8 w-full items-center my-4">
               {zoomedPlayer.hand?.length > 0 ? (
                 <>
                   <div className="w-[45%] aspect-[2.5/3.5] shadow-2xl rotate-[-5deg]">
                      <Card card={zoomedPlayer.hand[0]} hidden={!isShowdown && !zoomedPlayer.is_revealed} size="lg" />
                   </div>
                   <div className="w-[45%] aspect-[2.5/3.5] shadow-2xl rotate-[5deg]">
                      <Card card={zoomedPlayer.hand[1]} hidden={!isShowdown && !zoomedPlayer.is_revealed} size="lg" />
                   </div>
                 </>
               ) : <span className="text-4xl opacity-30 font-bold">EMPTY HAND</span>}
            </div>

            <div className={`px-8 py-3 rounded-full font-black text-3xl uppercase tracking-widest border-4 ${zoomedPlayer.status === 'folded' ? 'bg-red-900/80 border-red-500 text-red-200' : 'bg-emerald-900/80 border-emerald-500 text-emerald-200'}`}>
               {zoomedPlayer.status === 'folded' ? 'FOLDED' : (zoomedPlayer.is_revealed ? 'SHOWING' : 'ACTIVE')}
            </div>
            
            <div className="text-emerald-500/30 text-sm font-bold tracking-[0.2em] uppercase mt-2">Tap background to close</div>
          </div>
        </div>
      )}


      {/* --- MAIN LAYOUT --- */}

      {/* HEADER */}
      <div className="w-full flex justify-between items-center px-6 py-2 font-mono text-emerald-200/60 border-b border-white/5 shrink-0 z-20 bg-[#1a2e22]/50 backdrop-blur-sm">
         <div className="flex flex-col">
            <span className="text-xl md:text-2xl">ROOM: <span className="text-white font-bold">{roomCode}</span></span>
         </div>
         <span className="text-2xl md:text-4xl font-bold uppercase tracking-widest text-yellow-500 animate-pulse">{stage}</span>
         <button onClick={onEndGame} className="text-red-400 text-sm border-2 border-red-900 px-4 py-2 rounded-xl font-bold hover:bg-red-900/20">END GAME</button>
      </div>
      
      {/* TABLE AREA - VERTICALLY CENTERED */}
      <div className="w-full flex-1 flex flex-col justify-center items-center my-2 min-h-[250px] transition-all duration-500">
        <div className="relative w-full max-w-[98vw] h-[35vh] md:h-[40vh] bg-[#254230] rounded-[40px] md:rounded-[100px] border-[12px] md:border-[20px] border-[#3e2c26] shadow-2xl flex items-center justify-center mx-2 ring-4 ring-black/20 overflow-hidden">
           <div className="flex gap-2 md:gap-6 px-4 md:px-12 h-[85%] w-full justify-center items-center">
             {(roomData?.community_cards || []).map((c: CardType, i: number) => (
                <div key={i} className="h-full w-auto max-w-[19%] aspect-[2.5/3.5] shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-2">
                  <Card card={c} hidden={i >= showComm} size="md" />
                </div>
             ))}
           </div>
        </div>
      </div>
      
      {/* CONTROLS */}
      <div className="py-2 flex flex-col items-center gap-2 shrink-0 z-30">
        <button onClick={onNextStage} className="bg-yellow-500 active:bg-yellow-600 text-black px-12 md:px-20 py-3 md:py-4 rounded-full font-black text-xl md:text-2xl shadow-[0_0_30px_rgba(234,179,8,0.4)] transition-transform active:scale-95 border-4 border-yellow-600">
           {stage === 'showdown' ? 'NEW ROUND ↺' : stage === 'river' ? 'SHOWDOWN ➔' : 'DEAL ➔'}
        </button>

        {(stage === 'waiting' || stage === 'showdown') && (
          <div className="flex items-center gap-4 bg-black/60 px-6 py-2 rounded-full border-2 border-white/10">
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
      <div className="flex-none w-full max-w-[98vw] overflow-y-auto px-4 pb-4 h-[35vh]">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-8 mx-auto max-w-[1800px]">
          {players.map(p => {
             const showCards = isShowdown && p.is_revealed;
             const isActive = p.status !== 'folded';
             
             return (
               <div 
                 key={p.id} 
                 // CLICK EVENT for Zoom
                 onClick={() => setZoomedPlayer(p)}
                 className={`flex flex-col items-center p-2 md:p-3 rounded-[2rem] border-[6px] transition-all duration-300 relative shadow-xl min-h-[220px] md:min-h-[280px] group cursor-zoom-in ${!isActive ? 'bg-gray-900/60 border-gray-700 opacity-60' : 'bg-black/70 border-emerald-500/60 hover:border-yellow-400 hover:bg-black/90'}`}
               >
                 
                 {/* Player Name */}
                 <div className="font-black text-xl md:text-2xl truncate mb-1 text-white drop-shadow-lg tracking-wide w-full text-center shrink-0">
                    {p.name}
                 </div>
                 
                 {/* Card Container */}
                 <div className="flex-1 w-full flex justify-center items-center gap-2 relative">
                    {p.hand?.length > 0 ? (
                      <>
                        <div className={`w-[45%] aspect-[2.5/3.5] transition-transform duration-500 ${showCards ? 'z-20' : 'z-10'}`}>
                           <Card card={p.hand[0]} hidden={!showCards} size="md" />
                        </div>
                        <div className={`w-[45%] aspect-[2.5/3.5] transition-transform duration-500 ${showCards ? 'z-20' : 'z-10'}`}>
                           <Card card={p.hand[1]} hidden={!showCards} size="md" />
                        </div>
                      </>
                    ) : <span className="text-base font-bold opacity-30 tracking-widest">EMPTY</span>}
                 </div>

                 {/* Status Badges */}
                 <div className={`mt-2 px-3 py-1 rounded-full font-black text-xs md:text-sm uppercase tracking-widest border-2 shrink-0 ${!isActive ? 'bg-red-900/50 border-red-500 text-red-300' : 'bg-emerald-900/50 border-emerald-500 text-emerald-300'}`}>
                   {p.status === 'folded' ? 'FOLDED' : (p.is_revealed ? 'SHOWING' : 'ACTIVE')}
                 </div>

                 {p.is_revealed && <div className="absolute top-3 right-3 text-2xl animate-pulse">👁</div>}
               </div>
             )
          })}
        </div>
      </div>

      {/* FIXED SCANNER PANEL */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
           {roomData?.qr_url && (
             <button 
                onClick={() => setIsQrZoomed(true)}
                className="bg-white p-2 rounded-2xl border-4 border-gray-200 shadow-2xl animate-in slide-in-from-bottom-10 duration-500 origin-bottom-right hover:scale-105 transition-transform"
             >
                <img src={roomData.qr_url} alt="Pay" className="w-20 h-20 md:w-24 md:h-24 object-contain" />
                <div className="text-black text-center font-black text-[10px] mt-1 tracking-widest uppercase">ZOOM</div>
             </button>
           )}

           {qrList.length > 0 && (
             <select 
               className="bg-black/90 text-white font-bold text-xs py-3 px-4 rounded-xl border-2 border-white/20 outline-none backdrop-blur-md shadow-xl text-right appearance-none"
               value={roomData?.qr_url || ""}
               onChange={(e) => handleQrChange(e.target.value)}
             >
               <option value="">-- Hide Scanner --</option>
               {qrList.map((qr, i) => (
                 <option key={i} value={qr.url}>{qr.name}</option>
               ))}
             </select>
           )}
      </div>

    </div>
  );
}