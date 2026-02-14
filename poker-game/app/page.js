"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import _ from 'lodash';

// --- UTILS INLINE ---
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

// --- COMPONENTS ---
const Card = ({ card, hidden }) => {
  if (hidden || !card) return <div className="w-16 h-24 bg-blue-800 rounded border-2 border-white m-1"></div>;
  return (
    <div className={`w-16 h-24 bg-white rounded border border-gray-400 m-1 flex flex-col items-center justify-center ${card.color}`}>
      <span className="font-bold">{card.value}</span>
      <span className="text-xl">{card.suit}</span>
    </div>
  );
};

export default function Poker() {
  const [view, setView] = useState('menu');
  const [roomCode, setRoomCode] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [myId, setMyId] = useState('');
  const [loading, setLoading] = useState(false);

  // --- AUTO SETUP LOGIC ---
  const handleDBSetup = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/setup', { method: 'POST' });
      const data = await res.json();
      if (data.success) alert("✅ Database fixed! Try again.");
      else alert("❌ Setup failed: " + data.error);
    } catch (e) {
      alert("Setup error");
    }
    setLoading(false);
  };

  const createTable = async () => {
    setLoading(true);
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const deck = getDeck();
    
    const { error } = await supabase.from('rooms').insert({
      id: code, stage: 'waiting', community_cards: deck.slice(0, 5), deck: deck.slice(5)
    });

    if (error) {
      console.error(error);
      if (error.message.includes('relation "rooms" does not exist')) {
        const confirm = window.confirm("Database not initialized. Run auto-setup?");
        if (confirm) await handleDBSetup();
      } else {
        alert("Error: " + error.message);
      }
    } else {
      setRoomCode(code);
      setView('table');
    }
    setLoading(false);
  };

  const joinGame = async () => {
    const { data, error } = await supabase.from('players').insert({
      room_id: roomCode, name: `Player ${Math.floor(Math.random()*100)}`, hand: []
    }).select().single();
    if (error) return alert("Error joining");
    setMyId(data.id);
    setView('player');
  };

  // --- REALTIME ---
  useEffect(() => {
    if (view === 'menu') return;
    const ch = supabase.channel('game')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomCode}` }, p => setRoomData(p.new))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomCode}` }, () => fetchPlayers())
      .subscribe();
    
    const fetchPlayers = async () => {
      const { data } = await supabase.from('players').select('*').eq('room_id', roomCode);
      if(data) setPlayers(data);
    };
    fetchPlayers();
    return () => { supabase.removeChannel(ch); };
  }, [view, roomCode]);

  // --- GAMEPLAY ---
  const nextStage = async () => {
    const stages = ['waiting', 'preflop', 'flop', 'turn', 'river'];
    const idx = stages.indexOf(roomData?.stage);
    if (idx < 4) {
      const next = stages[idx+1];
      if (next === 'preflop') {
        // Deal cards
        const deck = roomData.deck;
        const updates = players.map(p => {
          return supabase.from('players').update({ hand: [deck.pop(), deck.pop()] }).eq('id', p.id);
        });
        await supabase.from('rooms').update({ deck }).eq('id', roomCode);
        await Promise.all(updates);
      }
      await supabase.from('rooms').update({ stage: next }).eq('id', roomCode);
    } else {
      // Reset
      const d = getDeck();
      await supabase.from('rooms').update({ stage: 'waiting', community_cards: d.slice(0,5), deck: d.slice(5) }).eq('id', roomCode);
    }
  };

  // --- RENDER ---
  if (view === 'menu') return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-green-900 gap-4 p-4">
      <h1 className="text-4xl font-bold text-white">Poker</h1>
      <button onClick={createTable} disabled={loading} className="bg-yellow-400 px-8 py-4 rounded text-xl font-bold">{loading ? 'Loading...' : 'Host Table'}</button>
      <div className="flex gap-2">
        <input className="p-2 rounded text-black" placeholder="Code" onChange={e => setRoomCode(e.target.value)} />
        <button onClick={joinGame} className="bg-blue-500 text-white px-4 rounded font-bold">Join</button>
      </div>
    </div>
  );

  if (view === 'table') {
    const stage = roomData?.stage || 'waiting';
    const show = stage === 'waiting' || stage === 'preflop' ? 0 : stage === 'flop' ? 3 : stage === 'turn' ? 4 : 5;
    return (
      <div className="min-h-screen bg-green-800 flex flex-col items-center p-4 text-white">
        <h2 className="text-2xl mb-4">Room: {roomCode} ({stage})</h2>
        <div className="flex gap-2 mb-8 p-4 bg-green-700 rounded-full border-4 border-green-900">
          {(roomData?.community_cards || []).map((c, i) => <Card key={i} card={c} hidden={i >= show} />)}
        </div>
        <button onClick={nextStage} className="bg-yellow-500 text-black px-8 py-3 rounded-full font-bold text-lg mb-8">Next Action</button>
        <div className="grid grid-cols-4 gap-4">
          {players.map(p => <div key={p.id} className="bg-black/30 p-2 rounded text-center">{p.name}<br/>{p.hand?.length ? 'Cards' : '...'}</div>)}
        </div>
      </div>
    );
  }

  if (view === 'player') {
    const me = players.find(p => p.id === myId);
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-white">
        <h1 className="mb-8">Your Hand</h1>
        <div className="flex gap-4">
          {me?.hand?.length ? me.hand.map((c,i) => <Card key={i} card={c} />) : <p className="animate-pulse">Waiting...</p>}
        </div>
      </div>
    );
  }
}