import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import Card, { CardType } from './Card';
import GameNotifications, { LogMessage } from './GameNotifications';

type GameTableProps = {
  roomCode: string;
  roomData: any;
  players: any[];
  winners?: any[];
  onNextStage: () => void;
  onEndGame: () => void;
  onShuffleChange: (val: number) => void;
  onRefresh: () => void; // <--- NEW PROP
  logs: LogMessage[];
};

export default function GameTable({ 
  roomCode, 
  roomData, 
  players, 
  winners = [], 
  onNextStage, 
  onEndGame, 
  onShuffleChange, 
  onRefresh, // <--- Destructure it
  logs 
}: GameTableProps) {
  const stage = roomData?.stage || 'waiting';
  const isShowdown = stage === 'showdown';
  const showComm = stage === 'waiting' || stage === 'preflop' ? 0 : stage === 'flop' ? 3 : stage === 'turn' ? 4 : 5;
  const shuffleFactor = roomData?.shuffle_factor ?? 100;
  
  // Logic
  const starterIndex = (roomData?.dealer_index || 0) % (players.length || 1);
  const starterName = players[starterIndex]?.name || "Waiting...";
  const roundCount = roomData?.round_count || 1; 

  // Sorting
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.status === 'folded' && b.status !== 'folded') return 1;
    if (a.status !== 'folded' && b.status === 'folded') return -1;
    return 0;
  });
  
  const [qrList, setQrList] = useState<{name: string, url: string}[]>([]);
  const [isQrZoomed, setIsQrZoomed] = useState(false);
  const [zoomedPlayer, setZoomedPlayer] = useState<any>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); // Local sync state

  useEffect(() => {
    if (winners.length > 0 && isShowdown) {
      setShowWinnerModal(true);
    } else {
      setShowWinnerModal(false);
    }
  }, [winners, isShowdown]);
  
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

  const handleManualRefresh = async () => {
    setIsSyncing(true);
    await onRefresh();
    setTimeout(() => setIsSyncing(false), 500);
  };

  return (
    <div className="h-screen bg-[#1a2e22] flex flex-col items-center p-2 text-white overflow-hidden relative">
      <GameNotifications logs={logs} />

      {/* --- MODALS --- */}
      {showWinnerModal && winners.length > 0 && (
        <div 
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={() => setShowWinnerModal(false)}
        >
           <div className="relative bg-[#1a2e22] p-8 rounded-2xl border-2 border-emerald-500/50 shadow-2xl flex flex-col items-center text-center min-w-[300px] max-w-lg" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowWinnerModal(false)} className="absolute top-3 right-3 text-white/30 hover:text-white transition-colors">✕</button>
              <div className="text-yellow-400 font-bold tracking-widest text-lg uppercase mb-6 border-b border-white/10 pb-2 w-full">Winner</div>
              <div className="flex flex-col gap-6 w-full">
                {winners.map((w: any, i: number) => (
                  <div key={i} className="flex flex-col items-center">
                     <div className="text-4xl md:text-5xl font-black text-white">{w.name}</div>
                     <div className="text-emerald-400 font-mono text-sm mt-1 uppercase">{w.desc}</div>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-4 w-full border-t border-white/10">
                <button onClick={() => setShowWinnerModal(false)} className="text-xs text-gray-400 hover:text-white uppercase tracking-widest transition-colors">Close</button>
              </div>
           </div>
        </div>
      )}

      {isQrZoomed && roomData?.qr_url && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-8 cursor-pointer" onClick={() => setIsQrZoomed(false)}>
          <div className="relative bg-white p-4 rounded-3xl shadow-2xl w-full max-w-lg aspect-square" onClick={e => e.stopPropagation()}>
            <Image src={roomData.qr_url} alt="Scan to Pay" fill className="object-contain p-2" />
            <div className="absolute bottom-[-40px] left-0 right-0 text-white text-center font-bold text-xl uppercase">SCAN TO PAY</div>
          </div>
        </div>
      )}

      {zoomedPlayer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 animate-in fade-in zoom-in duration-150 cursor-zoom-out" onClick={() => setZoomedPlayer(null)}>
          <div className="relative bg-[#1a2e22] border-[6px] border-emerald-500 p-8 rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-3xl flex flex-col items-center gap-6 transform-gpu scale-110 cursor-default" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setZoomedPlayer(null)} className="absolute top-4 right-6 text-white/30 hover:text-white text-4xl transition-colors cursor-pointer">&times;</button>
            <div className="font-black text-5xl md:text-7xl text-white drop-shadow-xl tracking-wide text-center uppercase">{zoomedPlayer.name}</div>
            <div className="flex justify-center gap-8 w-full items-center my-4">
               {zoomedPlayer.hand?.length > 0 ? (
                 <>
                   <div className="w-[45%] aspect-[2.5/3.5] shadow-2xl rotate-[-5deg]">
                      <Card card={zoomedPlayer.hand[0]} hidden={!zoomedPlayer.is_revealed} size="lg" />
                   </div>
                   <div className="w-[45%] aspect-[2.5/3.5] shadow-2xl rotate-[5deg]">
                      <Card card={zoomedPlayer.hand[1]} hidden={!zoomedPlayer.is_revealed} size="lg" />
                   </div>
                 </>
               ) : <span className="text-4xl opacity-30 font-bold">EMPTY HAND</span>}
            </div>
            <div className={`px-8 py-3 rounded-full font-black text-3xl uppercase tracking-widest border-4 ${zoomedPlayer.status === 'folded' ? 'bg-red-900/80 border-red-500 text-red-200' : 'bg-emerald-900/80 border-emerald-500 text-emerald-200'}`}>
               {zoomedPlayer.status === 'folded' ? 'FOLDED' : (zoomedPlayer.is_revealed ? 'SHOWING' : 'ACTIVE')}
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN UI --- */}

      <div className="flex-none w-full flex justify-between items-center px-6 py-2 font-mono text-emerald-200/60 border-b border-white/5 z-20 bg-[#1a2e22]/50 backdrop-blur-sm">
         <div className="flex flex-col">
            <span className="text-xl md:text-2xl">ROOM: <span className="text-white font-bold">{roomCode}</span></span>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">
               <span className="text-purple-400">ROUND {roundCount}</span>
               <span className={`${shuffleFactor < 100 ? 'text-yellow-500' : 'text-emerald-500/50'}`}>
                  {shuffleFactor === 100 ? 'FAIR' : `${shuffleFactor}% RIGGED`}
               </span>
               <span className="text-blue-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                  {starterName}
               </span>
            </div>
         </div>
         <span className="text-2xl md:text-4xl font-bold uppercase tracking-widest text-yellow-500 animate-pulse">{stage}</span>
         
         {/* --- CONTROLS AREA --- */}
         <div className="flex gap-4">
             {/* SYNC BUTTON */}
             <button 
                onClick={handleManualRefresh} 
                className="text-emerald-500 text-xs border border-emerald-900 px-4 py-2 rounded-xl font-bold hover:bg-emerald-900/20 active:scale-95 transition-all flex items-center gap-2"
                disabled={isSyncing}
             >
                <span className={isSyncing ? "animate-spin" : ""}>⟳</span>
                {isSyncing ? "SYNCING" : "SYNC"}
             </button>

             <button onClick={onEndGame} className="text-red-400 text-xs border border-red-900 px-4 py-2 rounded-xl font-bold hover:bg-red-900/20 active:scale-95 transition-all">
                END
             </button>
         </div>
      </div>
      
      {/* --- MAIN LAYOUT WRAPPER (Left: Game, Right: Sidebar) --- */}
      {/* ADDED min-h-0 HERE */}
      <div className="flex-1 min-h-0 w-full flex flex-row gap-2 overflow-hidden mt-2 relative z-10">
         
         {/* LEFT COLUMN: Table, Controls, Grid */}
         {/* ADDED min-h-0 HERE */}
         <div className="flex-1 min-h-0 flex flex-col overflow-hidden w-full">
            
            {/* --- MIDDLE SECTION: TABLE --- */}
            <div className="flex-none h-[35vh] md:h-[40vh] w-full flex px-2 md:px-6 relative z-10">
              {/* The Poker Table */}
              <div className="flex-1 relative h-full bg-[#254230] rounded-[40px] md:rounded-[100px] border-[12px] md:border-[20px] border-[#3e2c26] shadow-2xl flex items-center justify-center ring-4 ring-black/20 overflow-hidden transform-gpu">
                 <div className="flex gap-2 md:gap-6 px-4 md:px-12 h-[75%] w-full justify-center items-center">
                   {(roomData?.community_cards || []).map((c: CardType, i: number) => (
                      <div key={i} className="h-full w-auto max-w-[19%] aspect-[2.5/3.5] shadow-2xl transition-transform duration-300 hover:scale-105">
                        <Card card={c} hidden={i >= showComm} size="md" />
                      </div>
                   ))}
                 </div>
              </div>
            </div>
            
            {/* --- CONTROLS --- */}
            <div className="flex-none py-2 flex flex-col items-center gap-2 z-30">
              <button onClick={onNextStage} className="bg-yellow-500 active:bg-yellow-600 text-black px-12 md:px-20 py-3 md:py-4 rounded-full font-black text-xl md:text-2xl shadow-[0_0_30px_rgba(234,179,8,0.4)] transition-transform active:scale-95 border-4 border-yellow-600">
                 {stage === 'showdown' ? 'NEW ROUND ↺' : stage === 'river' ? 'SHOWDOWN ➔' : 'DEAL ➔'}
              </button>
              {(stage === 'waiting' || stage === 'showdown') && (
                <div className="flex items-center gap-4 bg-black/60 px-6 py-2 rounded-full border-2 border-white/10">
                   <span className="text-[10px] text-gray-400 font-bold">RIGGED</span>
                   <input type="range" min="0" max="100" step="10" value={shuffleFactor} onChange={(e) => onShuffleChange(parseInt(e.target.value))} className="w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                   <span className={`text-xs font-bold w-12 text-right ${shuffleFactor < 50 ? 'text-red-400' : 'text-emerald-400'}`}>{shuffleFactor}%</span>
                </div>
              )}
            </div>
            
            {/* --- DETAILED PLAYER GRID --- */}
            <div className="flex-1 w-full min-h-0 overflow-y-auto px-4 pb-4 mt-2">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 md:gap-6 mx-auto w-full">
                {sortedPlayers.map((p, i) => {
                   const showCards = isShowdown && p.is_revealed;
                   const isActive = p.status !== 'folded';
                   const isWinner = winners.some(w => w.id === p.id);
                   const isStarter = p.name === starterName;
                   
                   return (
                     <div key={p.id} onClick={() => setZoomedPlayer(p)} className={`flex flex-col items-center p-2 md:p-3 rounded-[2rem] border-[6px] transition-all duration-300 relative shadow-xl min-h-[200px] md:min-h-[250px] group cursor-zoom-in transform-gpu ${isWinner ? 'bg-yellow-900/80 border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.5)] scale-105 z-20' : !isActive ? 'bg-gray-900/60 border-gray-700 opacity-60' : 'bg-black/70 border-emerald-500/60 hover:border-yellow-400 hover:bg-black/90'}`}>
                       <div className="font-black text-lg md:text-xl truncate mb-1 text-white drop-shadow-lg tracking-wide w-full text-center shrink-0 flex items-center gap-2 justify-center">
                          {p.name}
                          {isStarter && <span className="text-blue-400 text-[10px] md:text-xs bg-blue-900/50 border border-blue-500 rounded-full px-1.5 py-0.5">D</span>}
                       </div>
                       <div className="flex-1 w-full flex justify-center items-center gap-1 md:gap-2 relative">
                          {p.hand?.length > 0 ? (
                            <>
                              <div className={`w-[45%] aspect-[2.5/3.5] transition-transform duration-500 ${showCards ? 'z-20' : 'z-10'}`}>
                                 <Card card={p.hand[0]} hidden={!showCards} size="md" />
                              </div>
                              <div className={`w-[45%] aspect-[2.5/3.5] transition-transform duration-500 ${showCards ? 'z-20' : 'z-10'}`}>
                                 <Card card={p.hand[1]} hidden={!showCards} size="md" />
                              </div>
                            </>
                          ) : <span className="text-sm font-bold opacity-30 tracking-widest">EMPTY</span>}
                       </div>
                       {isWinner ? (
                          <div className="mt-2 px-3 py-1 rounded-full font-black text-xs md:text-sm uppercase tracking-widest border-2 bg-yellow-500 text-black animate-bounce">WINNER</div>
                       ) : (
                          <div className={`mt-2 px-3 py-1 rounded-full font-black text-[10px] md:text-xs uppercase tracking-widest border-2 shrink-0 ${!isActive ? 'bg-red-900/50 border-red-500 text-red-300' : 'bg-emerald-900/50 border-emerald-500 text-emerald-300'}`}>
                            {p.status === 'folded' ? 'FOLDED' : (p.is_revealed ? 'SHOWING' : 'ACTIVE')}
                          </div>
                       )}
                       {p.is_revealed && <div className="absolute top-3 right-3 text-xl animate-pulse">👁</div>}
                     </div>
                   )
                })}
              </div>
            </div>

         </div>

         {/* RIGHT COLUMN: Minimal Player Sidebar */}
         <div className="hidden md:flex w-64 lg:w-72 max-h-full bg-black/40 border border-white/5 rounded-[2rem] p-4 flex-col gap-2 backdrop-blur-md shadow-xl mr-2 lg:mr-4 z-20">
           <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-1 shrink-0 px-2">
             <h3 className="text-emerald-400 font-bold text-xs tracking-widest uppercase">Players</h3>
             <span className="text-xs font-mono text-gray-500">{players.length}</span>
           </div>
           
           <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 custom-scrollbar">
              {sortedPlayers.map(p => {
                  const isActive = p.status !== 'folded';
                  const isWinner = winners.some(w => w.id === p.id);
                  const isStarter = p.name === starterName;
                  
                  let dotClass = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]";
                  if (!isActive) dotClass = "bg-red-500 opacity-50";
                  if (isWinner) dotClass = "bg-yellow-400 animate-pulse";
                  else if (p.is_revealed) dotClass = "bg-blue-400 animate-pulse";

                  return (
                     <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${!isActive ? 'opacity-50 bg-red-900/10 border-red-900/30' : isWinner ? 'bg-yellow-900/30 border-yellow-500/50' : 'bg-white/5 border-white/5'}`}>
                        <div className="flex items-center gap-3 overflow-hidden">
                           <div className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
                           <span className={`font-bold text-sm truncate ${isWinner ? 'text-yellow-400' : 'text-gray-200'}`}>{p.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                           {isStarter && <span className="text-[9px] bg-blue-600/80 text-blue-100 px-1.5 py-0.5 rounded-sm font-black border border-blue-400/50">D</span>}
                           {isWinner && <span className="text-[10px] text-yellow-400 font-black uppercase tracking-wider">Win</span>}
                           {!isActive && <span className="text-[10px] text-red-400/80 font-black uppercase tracking-wider">Fold</span>}
                        </div>
                     </div>
                  )
              })}
           </div>
         </div>

      </div>

      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
           {roomData?.qr_url && (
             <button onClick={() => setIsQrZoomed(true)} className="bg-white p-2 rounded-2xl border-4 border-gray-200 shadow-2xl animate-in slide-in-from-bottom-10 duration-500 origin-bottom-right hover:scale-105 transition-transform">
                <div className="relative w-20 h-20 md:w-24 md:h-24">
                   <Image src={roomData.qr_url} alt="Pay" fill className="object-contain" />
                </div>
                <div className="text-black text-center font-black text-[10px] mt-1 tracking-widest uppercase">ZOOM</div>
             </button>
           )}
           {qrList.length > 0 && (
             <select className="bg-black/90 text-white font-bold text-xs py-3 px-4 rounded-xl border-2 border-white/20 outline-none backdrop-blur-md shadow-xl text-right appearance-none" value={roomData?.qr_url || ""} onChange={(e) => handleQrChange(e.target.value)}>
               <option value="">-- Hide Scanner --</option>
               {qrList.map((qr, i) => <option key={i} value={qr.url}>{qr.name}</option>)}
             </select>
           )}
      </div>
    </div>
  );
}
