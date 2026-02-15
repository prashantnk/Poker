// @ts-nocheck
"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import GameMenu from './components/GameMenu';
import GameTable from './components/GameTable';
import PlayerView from './components/PlayerView';
import CardPreloader from './components/CardPreloader';
import SoundPreloader from './components/SoundPreloader';
import { LogMessage } from './components/GameNotifications';
import _ from 'lodash';
import { Hand } from 'pokersolver';

const APP_NAME = "Poker: Zero or One";
const SUITS = ['♠', '♥', '♣', '♦'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// --- HELPERS ---
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

// Converter: {value: '10', suit: '♠'} -> "Ts"
const toSolverCard = (card: any) => {
  if (!card) return null;
  const val = card.value === '10' ? 'T' : card.value;
  const suit = card.suit === '♠' ? 's' : card.suit === '♥' ? 'h' : card.suit === '♣' ? 'c' : 'd';
  return `${val}${suit}`;
};

export default function PokerPage() {
  const [view, setView] = useState<'menu' | 'table' | 'player'>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [roomData, setRoomData] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [myId, setMyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [winners, setWinners] = useState<any[]>([]);
  
  const playersRef = useRef<any[]>([]);

  // --- SOUND SYSTEM ---
  const playSound = (type: 'deal' | 'check' | 'fold' | 'win') => {
    try {
      const audio = new Audio(`/sounds/${type}.mp3`);
      audio.volume = 0.5;
      audio.play().catch(() => {}); 
    } catch (e) {
      console.warn("Audio play error", e);
    }
  };

  useEffect(() => { playersRef.current = players; }, [players]);

  // --- RESTORE SESSION ---
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

  // --- 1. DEFINE FETCH LOGIC HERE (So it's accessible everywhere) ---
  const fetchGameState = async () => {
    if (!roomCode) return;
    // Fetch Room
    const { data: r } = await supabase.from('rooms').select('*').eq('id', roomCode).single();
    if (r) {
      setRoomData(r);
      if (r.winners) setWinners(r.winners);
    } else {
      // If room not found, maybe end game?
      // handleGameEnded(); // Optional: careful with auto-ending
    }

    // Fetch Players
    const { data: p } = await supabase.from('players').select('*').eq('room_id', roomCode);
    if (p) {
      setPlayers(_.uniqBy(p, 'id'));
    }
  };

  // --- REALTIME SYNC ---
  useEffect(() => {
    if (view === 'menu' || !roomCode) return;

    // Call the function we defined above
    fetchGameState();

    // 2. Subscription
    const channelName = `room_${roomCode}`;
    const ch = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomCode}` }, 
        (payload) => {
          if (payload.eventType === 'DELETE') {
            addLog("Host ended the game.", 'alert');
            handleGameEnded(); 
          } else {
            const newRoom = payload.new;
            setRoomData(prev => {
                if (prev?.stage !== newRoom.stage) {
                   if (newRoom.stage === 'preflop') playSound('deal');
                   else if (['flop', 'turn', 'river'].includes(newRoom.stage)) playSound('check');
                   
                   // Winner Update
                   if (newRoom.stage === 'showdown') {
                      if (newRoom.winners && newRoom.winners.length > 0) {
                        setWinners(newRoom.winners);
                        playSound('win');
                      }
                   } else {
                      setWinners([]);
                   }
                }
                return newRoom;
            });
          }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomCode}` }, 
        (payload) => {
           const newP = payload.new;
           const oldP = payload.old?.id ? playersRef.current.find(p => p.id === payload.old.id) : null;

           if (payload.eventType === 'UPDATE' && oldP && newP) {
              if (oldP.status !== 'folded' && newP.status === 'folded') {
                 addLog(`${newP.name} folded.`, 'alert');
                 playSound('fold');
              }
              if (!oldP.is_revealed && newP.is_revealed) {
                 addLog(`${newP.name} revealed!`, 'success');
                 playSound('check');
              }
           }

           if (payload.eventType === 'INSERT') {
              addLog(`${newP.name} joined.`, 'success');
              setPlayers(prev => {
                if (prev.some(p => p.id === newP.id)) return prev;
                return [...prev, newP];
             });
           } 
           else if (payload.eventType === 'UPDATE') {
             setPlayers(prev => prev.map(p => p.id === newP.id ? newP : p));
           } 
           else if (payload.eventType === 'DELETE') {
             addLog(`Player left.`, 'alert');
             setPlayers(prev => prev.filter(p => p.id !== payload.old.id));
           }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [view, roomCode]);

  // --- WINNER LOGIC ---
  const calculateWinnerData = (communityCards: any[], currentPlayers: any[]) => {
    try {
      if (!communityCards || communityCards.length < 5) return [];

      const activePlayers = currentPlayers.filter(p => p.status !== 'folded' && p.hand?.length === 2);
      if (activePlayers.length === 0) return [];

      const solverHands = activePlayers.map(p => {
        const rawHand = [...p.hand, ...communityCards];
        const formatted = rawHand.map(toSolverCard).filter(c => c !== null);
        if (formatted.length < 7) return null;
        const solved = Hand.solve(formatted);
        solved.player = p; 
        return solved;
      }).filter(h => h !== null);

      if (solverHands.length === 0) return [];

      const winningHands = Hand.winners(solverHands);
      return winningHands.map((h: any) => ({
         id: h.player.id,
         name: h.player.name,
         desc: h.descr
      }));
    } catch (err) {
      console.error("Winner Calc Error:", err);
      return [];
    }
  };

  // --- ACTIONS ---
  const handleHostCreate = async (qrUrl: string | null) => {
    setLoading(true);
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const deck = getDeck(100); 
    
    const { error } = await supabase.from('rooms').insert({
      id: code, 
      stage: 'waiting', 
      community_cards: deck.slice(0, 5), 
      deck: deck.slice(5), 
      shuffle_factor: 100, 
      qr_url: qrUrl,
      winners: [],
      dealer_index: 0,
      round_count: 1
    });

    if (error) {
        console.error("Host Creation Failed:", error);
        alert(`Failed to start game: ${error.message}.`);
    } else {
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
    const name = rawName.trim();
    if(!code || !name) return alert("Missing info");
    setLoading(true);
    const { data: existingPlayers } = await supabase.from('players').select('*').eq('room_id', code);
    const existingMe = existingPlayers?.find(p => p.name.toLowerCase() === name.toLowerCase());

    if(existingMe) {
      localStorage.setItem('poker_player_id', existingMe.id);
      localStorage.setItem('poker_player_room', code);
      setMyId(existingMe.id);
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
      let updates: any = { stage: next };

      if(next === 'preflop') {
        const deck = [...roomData.deck];
        const active = players.filter(p => p.status !== 'folded');
        const pUpdates = active.map(p => supabase.from('players').update({ hand: [deck.pop(), deck.pop()] }).eq('id', p.id));
        
        updates.deck = deck;
        updates.winners = []; 
        
        await Promise.all(pUpdates);
      } 
      else if (next === 'showdown') {
        // Calculate and Save Winners
        const wData = calculateWinnerData(roomData.community_cards, players);
        updates.winners = wData;
      }

      await supabase.from('rooms').update(updates).eq('id', roomCode);

    } else {
      // RESET
      const currentFactor = roomData.shuffle_factor ?? 100;
      const d = getDeck(currentFactor);
      const nextDealer = (roomData.dealer_index || 0) + 1;
      const nextRound = (roomData.round_count || 1) + 1;
      
      await supabase.from('rooms').update({ 
        stage: 'waiting', 
        community_cards: d.slice(0,5), 
        deck: d.slice(5),
        winners: [],
        dealer_index: nextDealer,
        round_count: nextRound
      }).eq('id', roomCode);

      const reset = players.map(p => supabase.from('players').update({ hand: [], status: 'active', is_revealed: false }).eq('id', p.id));
      await Promise.all(reset);
    }
  };

  const handleEndGame = async () => {
    if(confirm("End Session?")) {
        await supabase.from('players').delete().eq('room_id', roomCode);
        await supabase.from('rooms').delete().eq('id', roomCode);
        handleGameEnded();
    }
  };

  const handleLeaveGame = async () => {
    if(confirm("Leave table?")) {
        await supabase.from('players').delete().eq('id', myId);
        localStorage.removeItem('poker_player_id');
        localStorage.removeItem('poker_player_room');
        setMyId(''); setRoomCode(''); setView('menu');
        window.location.reload(); 
    }
  };

  const handleGameEnded = () => {
    localStorage.removeItem('poker_host_room');
    localStorage.removeItem('poker_player_id');
    localStorage.removeItem('poker_player_room');
    setRoomCode(''); setRoomData(null); setPlayers([]); setView('menu');
  };

  const addLog = (text: string, type: 'info' | 'alert' | 'success' = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setLogs(prev => [...prev, { id, text, type }]);
    setTimeout(() => setLogs(prev => prev.filter(l => l.id !== id)), 5000);
  };

  const handleShuffleChange = async (val: number) => {
    await supabase.from('rooms').update({ shuffle_factor: val }).eq('id', roomCode);
  };

  // --- RENDER ---
  const me = players.find(p => p.id === myId);

  return (
    <>
      <CardPreloader />
      <SoundPreloader />

      {view === 'menu' && (
        <GameMenu 
          APP_NAME={APP_NAME} 
          onCreateTable={handleHostCreate} 
          onJoinGame={handleJoinGame} 
          onRecoverHost={recoverHost} 
          loading={loading} 
        />
      )}

      {view === 'table' && (
        <GameTable 
          roomCode={roomCode} 
          roomData={roomData} 
          players={players} 
          winners={winners} 
          onNextStage={handleNextStage} 
          onEndGame={handleEndGame} 
          onShuffleChange={handleShuffleChange} 
          logs={logs} 
        />
      )}

      {view === 'player' && (
        <PlayerView 
          roomCode={roomCode} 
          me={me} 
          stage={roomData?.stage} 
          roundCount={roomData?.round_count || 1} 
          onFold={async () => await supabase.from('players').update({ status: 'folded' }).eq('id', myId)}
          onToggleReveal={async (curr) => await supabase.from('players').update({ is_revealed: !curr }).eq('id', myId)}
          onLeave={handleLeaveGame} 
          onRefresh={fetchGameState} // Now this is defined!
        />
      )}
    </>
  );
}