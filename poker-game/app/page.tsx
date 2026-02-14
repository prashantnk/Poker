"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import _ from 'lodash';

// --- UTILS ---
const SUITS = ['♠', '♥', '♣', '♦'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const getDeck = () => {
  return _.shuffle(SUITS.flatMap(suit => 
    VALUES.map(value => ({
      suit, value, 
      color: (suit === '♥' || suit === '♦') ? 'text-red-600' : 'text-black',
      id: `${value}${suit}`
    }))
  ));
};

// --- COMPONENT: CARD ---
const Card = ({ card, hidden }) => {
  if (hidden || !card) return (
    <div className="w-14 h-20 md:w-20 md:h-28 bg-blue-900 rounded-lg border-2 border-white m-1 flex items-center justify-center shadow-lg">
      <span className="text-2xl">🐉</span>
    </div>
  );
  return (
    <div className={`w-14 h-20 md:w-20 md:h-28 bg-white rounded-lg border border-gray-300 m-1 flex flex-col items-center justify-center shadow-lg ${card.color}`}>
      <span className="font-bold text-xl md:text-3xl">{card.value}</span>
      <span className="text-2xl md:text-4xl">{card.suit}</span>
    </div>
  );
};

export default function Poker() {
  const [view, setView] = useState('menu');
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState(''); // <--- NEW: Store Player Name
  const [roomData, setRoomData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [myId, setMyId] = useState('');
  const [loading, setLoading] = useState(false);

  // --- HOST FUNCTIONS ---
  const createTable = async () => {
    setLoading(true);
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const deck = getDeck();
    
    const { error } = await supabase.from('rooms').insert({
      id: code, stage: 'waiting', community_cards: deck.slice(0, 5), deck: deck.slice(5)
    });

    if (error) alert("Error: " + error.message);
    else {
      setRoomCode(code);
      setView('table');
    }
    setLoading(false);
  };

  // --- PLAYER FUNCTIONS ---
  const joinGame = async () => {
    if (!roomCode) return alert("Please enter a Room Code!");
    if (!playerName) return alert("Please enter your Name!"); // <--- NEW CHECK

    setLoading(true);

    const { data, error } = await supabase.from('players').insert({
      room_id: roomCode, 
      name: playerName, // <--- NEW: Use the input name
      hand: []
    }).select().single();
    
    if (error) {
      alert("Could not join. Check Room Code.");
    } else {
      setMyId(data.id);
      setView('player');
    }
    setLoading(false);
  };

  // --- REALTIME ---
  useEffect(() => {
    if (view === 'menu') return;

    const fetchData = async () => {
       const { data: r } = await supabase.from('rooms').select('*').eq('id', roomCode).single();
       if(r) setRoomData(r);
       const { data: p } = await supabase.from('players').select('*').eq('room_id', roomCode);
       if(p) setPlayers(p);
    };
    fetchData();

    const channel = supabase.channel('game_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomCode}` }, 
        (payload) => setRoomData(payload.new)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomCode}` }, 
        () => fetchData() 
      )
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [view, roomCode]);

  // --- GAMEPLAY ---
  const nextStage = async () => {
    if (!roomData) return;
    const stages = ['waiting', 'preflop', 'flop', 'turn', 'river'];
    const currentIdx = stages.indexOf(roomData.stage);
    
    if (currentIdx < 4) {
      const nextStage = stages[currentIdx + 1];
      if (nextStage === 'preflop') {
        const currentDeck = [...roomData.deck];
        const updates = players.map(p => {
          return supabase.from('players').update({ hand: [currentDeck.pop(), currentDeck.pop()] }).eq('id', p.id);
        });
        await supabase.from('rooms').update({ deck: currentDeck }).eq('id', roomCode);
        await Promise.all(updates);
      }
      await supabase.from('rooms').update({ stage: nextStage }).eq('id', roomCode);
    } else {
      const newDeck = getDeck();
      await supabase.from('rooms').update({ stage: 'waiting', community_cards: newDeck.slice(0,5), deck: newDeck.slice(5) }).eq('id', roomCode);
      const clearHands = players.map(p => supabase.from('players').update({ hand: [] }).eq('id', p.id));
      await Promise.all(clearHands);
    }
  };

  // --- RENDER ---
  if (view === 'menu') return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 gap-8 p-4">
      <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600">
        POKER
      </h1>
      
      {/* HOST BUTTON */}
      <div className="w-full max-w-sm">
        <button onClick={createTable} disabled={loading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all mb-8">
          {loading ? 'Starting...' : 'HOST NEW TABLE'}
        </button>

        {/* JOIN SECTION */}
        <div className="flex flex-col gap-3 bg-neutral-800 p-6 rounded-2xl border border-neutral-700">
          <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Join a Game</h3>
          
          {/* NAME INPUT */}
          <input 
            className="w-full p-4 bg-neutral-900 text-white rounded-xl font-bold text-lg border border-neutral-600 focus:border-yellow-500 outline-none placeholder-gray-600"
            placeholder="Your Name (e.g. 007)" 
            onChange={e => setPlayerName(e.target.value)} 
          />

          <div className="flex gap-2">
            {/* ROOM CODE INPUT */}
            <input 
              className="flex-1 p-4 bg-neutral-900 text-white rounded-xl text-center font-mono text-xl border border-neutral-600 focus:border-yellow-500 outline-none placeholder-gray-600"
              placeholder="1234" 
              onChange={e => setRoomCode(e.target.value)} 
            />
            
            {/* JOIN BUTTON */}
            <button onClick={joinGame} disabled={loading} className="px-8 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95">
              GO
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // TABLE VIEW (HOST)
  if (view === 'table') {
    const stage = roomData?.stage || 'waiting';
    const show = stage === 'waiting' || stage === 'preflop' ? 0 : stage === 'flop' ? 3 : stage === 'turn' ? 4 : 5;
    
    return (
      <div className="min-h-screen bg-[#2e4738] flex flex-col items-center p-6 text-white overflow-hidden">
        <div className="w-full flex justify-between max-w-4xl mb-4 font-mono text-emerald-200/50">
           <span>ROOM: {roomCode}</span>
           <span>STAGE: {stage.toUpperCase()}</span>
        </div>
        
        {/* TABLE */}
        <div className="relative w-full max-w-4xl aspect-[2/1] bg-[#355e45] rounded-[100px] md:rounded-[200px] border-[12px] md:border-[16px] border-[#4a3b32] shadow-2xl flex items-center justify-center mb-8">
           <div className="flex gap-2 md:gap-4">
             {(roomData?.community_cards || []).map((c, i) => (
                <Card key={i} card={c} hidden={i >= show} />
             ))}
           </div>
        </div>
        
        <button onClick={nextStage} className="bg-yellow-500 hover:bg-yellow-400 text-black px-12 py-4 rounded-full font-black text-xl md:text-2xl shadow-xl hover:scale-105 transition-transform active:scale-95 mb-8">
           {stage === 'river' ? 'NEW ROUND ↺' : 'DEAL / REVEAL ➔'}
        </button>
        
        {/* PLAYERS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
          {players.map(p => (
             <div key={p.id} className="bg-black/30 p-4 rounded-xl text-center backdrop-blur-sm border border-white/5">
               <div className="font-bold text-lg text-emerald-100 truncate">{p.name}</div>
               <div className="text-sm text-emerald-100/50 mt-1">
                 {p.hand?.length ? 'Cards: ✅' : 'Waiting...'}
               </div>
             </div>
          ))}
        </div>
      </div>
    );
  }

  // PLAYER VIEW (HAND)
  if (view === 'player') {
    const me = players.find(p => p.id === myId);
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4 relative">
        <div className="text-center mb-12">
           <h2 className="text-gray-500 text-sm tracking-[0.2em] mb-2 uppercase">Your Hand</h2>
           <div className="text-yellow-500 font-bold text-3xl">
             {me?.name}
           </div>
        </div>

        <div className="flex justify-center gap-4 mb-16">
          {me?.hand && me.hand.length > 0 ? (
             <>
               <Card card={me.hand[0]} />
               <Card card={me.hand[1]} />
             </>
          ) : (
             <div className="text-white/30 text-xl font-mono animate-pulse">
               Waiting for dealer...
             </div>
          )}
        </div>
        
        <div className="absolute bottom-8 text-center w-full">
           <div className="inline-block bg-neutral-800 px-6 py-3 rounded-full border border-neutral-700">
              <span className="text-gray-400 text-xs uppercase mr-2">Status</span>
              <span className="text-white font-bold">{roomData?.stage?.toUpperCase()}</span>
           </div>
        </div>
      </div>
    );
  }
}