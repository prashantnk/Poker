// @ts-nocheck
"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import _ from 'lodash';

// FIX: Changed imports to relative paths to match your folder structure
import GameMenu from './components/GameMenu';
import GameTable from './components/GameTable';
import PlayerView from './components/PlayerView';
import { LogMessage } from './components/GameNotifications';

const APP_NAME = "Poker: Zero or One";
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

export default function PokerPage() {
  const [view, setView] = useState<'menu' | 'table' | 'player'>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [roomData, setRoomData] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [myId, setMyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const playersRef = useRef<any[]>([]);

  // --- LOGGING HELPER ---
  const addLog = (text: string, type: 'info' | 'alert' | 'success' = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setLogs(prev => [...prev, { id, text, type }]);
    setTimeout(() => setLogs(prev => prev.filter(l => l.id !== id)), 5000);
  };

  useEffect(() => { playersRef.current = players; }, [players]);

  // --- STARTUP CHECKS ---
  useEffect(() => {
    const savedHost = localStorage.getItem('poker_host_room');
    if (savedHost) { recoverHost(savedHost); }

    const savedPlayerId = localStorage.getItem('poker_player_id');
    const savedPlayerRoom = localStorage.getItem('poker_player_room');
    if (savedPlayerId && savedPlayerRoom) {
      setMyId(savedPlayerId);
      setRoomCode(savedPlayerRoom);
      setView('player');
    }
  }, []);

  // --- REALTIME SYNC ---
  useEffect(() => {
    if (view === 'menu' || !roomCode) return;

    const init = async () => {
      const { data: r } = await supabase.from('rooms').select('*').eq('id', roomCode).single();
      if(r) setRoomData(r); else if(view === 'table') { localStorage.removeItem('poker_host_room'); setView('menu'); }
      const { data: p } = await supabase.from('players').select('*').eq('room_id', roomCode);
      if(p) setPlayers(p);
    };
    init();

    const ch = supabase.channel('game')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomCode}` }, 
        (payload) => setRoomData(payload.new)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomCode}` }, 
        (payload) => {
           const newP = payload.new;
           const oldP = playersRef.current.find(p => p.id === newP.id);

           // Logs
           if (payload.eventType === 'UPDATE' && oldP) {
              if (oldP.status !== 'folded' && newP.status === 'folded') addLog(`${newP.name} folded.`, 'alert');
              if (!oldP.is_revealed && newP.is_revealed) addLog(`${newP.name} ready to show!`, 'success');
           }
           if (payload.eventType === 'INSERT') addLog(`${newP.name} joined.`, 'success');

           // State Update
           if (payload.eventType === 'INSERT') setPlayers(prev => [...prev, payload.new]);
           else if (payload.eventType === 'UPDATE') setPlayers(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
           else if (payload.eventType === 'DELETE') setPlayers(prev => prev.filter(p => p.id !== payload.old.id));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [view, roomCode]);

  // --- HANDLERS ---
  const handleHostCreate = async () => {
    setLoading(true);
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const deck = getDeck();
    const { error } = await supabase.from('rooms').insert({
      id: code, stage: 'waiting', community_cards: deck.slice(0, 5), deck: deck.slice(5)
    });
    if(!error) {
      localStorage.setItem('poker_host_room', code);
      localStorage.removeItem('poker_player_id');
      setRoomCode(code);
      setView('table');
    }
    setLoading(false);
  };

  const recoverHost = async (code: string) => {
    setLoading(true);
    const { data } = await supabase.from('rooms').select('id').eq('id', code).single();
    if(data) {
      localStorage.setItem('poker_host_room', code);
      setRoomCode(code);
      setView('table');
    } else {
      localStorage.removeItem('poker_host_room');
    }
    setLoading(false);
  };

  const handleJoinGame = async (code: string, name: string) => {
    if(!code || !name) return alert("Missing info");
    setLoading(true);

    // 1. DUPLICATE CHECK (Crucial Fix)
    const { data: existing } = await supabase.from('players').select('*').eq('room_id', code).eq('name', name).single();
    
    if(existing) {
      localStorage.setItem('poker_player_id', existing.id);
      localStorage.setItem('poker_player_room', code);
      setMyId(existing.id);
      setRoomCode(code);
      setView('player');
    } else {
      const { data, error } = await supabase.from('players').insert({
        room_id: code, name, hand: [], status: 'active', is_revealed: false
      }).select().single();
      if(!error) {
        localStorage.setItem('poker_player_id', data.id);
        localStorage.setItem('poker_player_room', code);
        setMyId(data.id);
        setRoomCode(code);
        setView('player');
      } else {
        alert("Check room code");
      }
    }
    setLoading(false);
  };

  const handleNextStage = async () => {
    if (!roomData) return;
    const stages = ['waiting', 'preflop', 'flop', 'turn', 'river', 'showdown'];
    const idx = stages.indexOf(roomData.stage);
    if(idx < 5) {
      const next = stages[idx+1];
      if(next === 'preflop') {
        const deck = [...roomData.deck];
        const active = players.filter(p => p.status !== 'folded');
        const updates = active.map(p => supabase.from('players').update({ hand: [deck.pop(), deck.pop()] }).eq('id', p.id));
        await supabase.from('rooms').update({ deck }).eq('id', roomCode);
        await Promise.all(updates);
      }
      await supabase.from('rooms').update({ stage: next }).eq('id', roomCode);
    } else {
      const d = getDeck();
      await supabase.from('rooms').update({ stage: 'waiting', community_cards: d.slice(0,5), deck: d.slice(5) }).eq('id', roomCode);
      const reset = players.map(p => supabase.from('players').update({ hand: [], status: 'active', is_revealed: false }).eq('id', p.id));
      await Promise.all(reset);
    }
  };

  const handleEndGame = () => {
    if(confirm("End Session?")) { localStorage.clear(); window.location.reload(); }
  };

  // --- RENDER ---
  if(view === 'menu') return <GameMenu APP_NAME={APP_NAME} onCreateTable={handleHostCreate} onJoinGame={handleJoinGame} onRecoverHost={recoverHost} loading={loading} />;
  if(view === 'table') return <GameTable roomCode={roomCode} roomData={roomData} players={players} onNextStage={handleNextStage} onEndGame={handleEndGame} logs={logs} />;
  
  const me = players.find(p => p.id === myId);
  return <PlayerView 
    roomCode={roomCode} 
    me={me} 
    stage={roomData?.stage} 
    onFold={async () => await supabase.from('players').update({ status: 'folded' }).eq('id', myId)}
    onToggleReveal={async (curr) => await supabase.from('players').update({ is_revealed: !curr }).eq('id', myId)}
    onLeave={handleEndGame} 
  />;
}