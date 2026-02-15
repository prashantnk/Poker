// @ts-nocheck
"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import GameMenu from './components/GameMenu';
import GameTable from './components/GameTable';
import PlayerView from './components/PlayerView';
import { LogMessage } from './components/GameNotifications';
import _ from 'lodash';

const APP_NAME = "Poker: Zero or One";
const SUITS = ['♠', '♥', '♣', '♦'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// --- CUSTOM SHUFFLER ---
const getDeck = (randomness = 100) => {
  const deck = VALUES.flatMap(value => 
    SUITS.map(suit => ({
      suit, value, 
      color: (suit === '♥' || suit === '♦') ? 'text-red-600' : 'text-black',
      id: `${value}${suit}`
    }))
  );

  if (randomness === 0) return deck;

  const totalSwaps = Math.floor((deck.length * 5) * (randomness / 100));

  for (let i = 0; i < totalSwaps; i++) {
    const idx1 = Math.floor(Math.random() * deck.length);
    const idx2 = Math.floor(Math.random() * deck.length);
    [deck[idx1], deck[idx2]] = [deck[idx2], deck[idx1]];
  }

  return deck;
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

    const fetchLatestState = async () => {
      const { data: r } = await supabase.from('rooms').select('*').eq('id', roomCode).single();
      if(r) {
        setRoomData(r); 
      } else {
        handleGameEnded();
        return;
      }

      const { data: p } = await supabase.from('players').select('*').eq('room_id', roomCode);
      if(p) {
        // Remove duplicates on initial fetch just in case
        const uniquePlayers = _.uniqBy(p, 'id');
        setPlayers(uniquePlayers);
      }
    };

    const ch = supabase.channel('poker_game')
      // 1. Room Updates
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomCode}` }, 
        (payload) => {
          if (payload.eventType === 'DELETE') {
            addLog("Host ended the game.", 'alert');
            handleGameEnded(); 
          } else {
            setRoomData(payload.new);
          }
        }
      )
      // 2. Player Updates
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomCode}` }, 
        (payload) => {
           const newP = payload.new;
           const oldP = payload.old?.id ? playersRef.current.find(p => p.id === payload.old.id) : null;

           // Notification Logic
           if (payload.eventType === 'UPDATE' && oldP && newP) {
              if (oldP.status !== 'folded' && newP.status === 'folded') addLog(`${newP.name} folded.`, 'alert');
              if (!oldP.is_revealed && newP.is_revealed) addLog(`${newP.name} revealed cards!`, 'success');
           }
           if (payload.eventType === 'INSERT') addLog(`${newP.name} joined.`, 'success');
           
           if (payload.eventType === 'DELETE' && oldP) {
             addLog(`${oldP.name} left the table.`, 'alert');
           }

           // State Update - WITH DEDUPLICATION
           if (payload.eventType === 'INSERT') {
             setPlayers(prev => {
                // Critical Fix: Don't add if ID already exists
                if (prev.some(p => p.id === payload.new.id)) return prev;
                return [...prev, payload.new];
             });
           } 
           else if (payload.eventType === 'UPDATE') {
             setPlayers(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
           } 
           else if (payload.eventType === 'DELETE') {
             setPlayers(prev => prev.filter(p => p.id !== payload.old.id));
           }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') fetchLatestState();
      });

    return () => { supabase.removeChannel(ch); };
  }, [view, roomCode]);

  // --- HANDLERS ---

  const handleGameEnded = () => {
    localStorage.removeItem('poker_host_room');
    localStorage.removeItem('poker_player_id');
    localStorage.removeItem('poker_player_room');
    setRoomCode('');
    setRoomData(null);
    setPlayers([]);
    setView('menu');
  };

  const handleHostCreate = async () => {
    setLoading(true);
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const deck = getDeck(100); 
    const { error } = await supabase.from('rooms').insert({
      id: code, stage: 'waiting', community_cards: deck.slice(0, 5), deck: deck.slice(5), shuffle_factor: 100
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

  const handleJoinGame = async (code: string, rawName: string) => {
    const name = rawName.trim(); // Fix: Trim spaces
    if(!code || !name) return alert("Missing info");
    setLoading(true);

    // 1. SMART CHECK: Does this name already exist in this room?
    const { data: existingPlayers } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', code);
    
    // Check for matching name (case-insensitive)
    const existingMe = existingPlayers?.find(p => p.name.toLowerCase() === name.toLowerCase());

    if(existingMe) {
      // RESUME SESSION (Don't create duplicate)
      localStorage.setItem('poker_player_id', existingMe.id);
      localStorage.setItem('poker_player_room', code);
      setMyId(existingMe.id);
      setRoomCode(code);
      setView('player');
    } else {
      // NEW PLAYER
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
        alert("Check room code or connection.");
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
      const currentFactor = roomData.shuffle_factor ?? 100;
      const d = getDeck(currentFactor);
      
      await supabase.from('rooms').update({ stage: 'waiting', community_cards: d.slice(0,5), deck: d.slice(5) }).eq('id', roomCode);
      const reset = players.map(p => supabase.from('players').update({ hand: [], status: 'active', is_revealed: false }).eq('id', p.id));
      await Promise.all(reset);
    }
  };

  const handleShuffleChange = async (val: number) => {
    await supabase.from('rooms').update({ shuffle_factor: val }).eq('id', roomCode);
  };

  const handleEndGame = async () => {
    if(confirm("End Session?")) {
        // 1. Delete all players first (Clean up)
        await supabase.from('players').delete().eq('room_id', roomCode);
        // 2. Delete room
        await supabase.from('rooms').delete().eq('id', roomCode);
        handleGameEnded();
    }
  };

  const handleLeaveGame = async () => {
    if(confirm("Leave table?")) {
        // Strict Leave: Delete from DB immediately
        await supabase.from('players').delete().eq('id', myId);
        localStorage.removeItem('poker_player_id');
        localStorage.removeItem('poker_player_room');
        
        setMyId('');
        setRoomCode('');
        setView('menu');
        // Force reload to ensure clean state
        window.location.reload(); 
    }
  };

  // --- RENDER ---
  if(view === 'menu') return <GameMenu APP_NAME={APP_NAME} onCreateTable={handleHostCreate} onJoinGame={handleJoinGame} onRecoverHost={recoverHost} loading={loading} />;
  if(view === 'table') return <GameTable roomCode={roomCode} roomData={roomData} players={players} onNextStage={handleNextStage} onEndGame={handleEndGame} onShuffleChange={handleShuffleChange} logs={logs} />;
  
  const me = players.find(p => p.id === myId);
  return <PlayerView 
    roomCode={roomCode} 
    me={me} 
    stage={roomData?.stage} 
    onFold={async () => await supabase.from('players').update({ status: 'folded' }).eq('id', myId)}
    onToggleReveal={async (curr) => await supabase.from('players').update({ is_revealed: !curr }).eq('id', myId)}
    onLeave={handleLeaveGame} 
  />;
}