import { useState } from 'react';

type GameMenuProps = {
  APP_NAME: string;
  onCreateTable: () => void;
  onJoinGame: (room: string, name: string) => void;
  onRecoverHost: (room: string) => void;
  loading: boolean;
};

export default function GameMenu({ APP_NAME, onCreateTable, onJoinGame, onRecoverHost, loading }: GameMenuProps) {
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 gap-8 p-4 relative">
      <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600 text-center">
        {APP_NAME}
      </h1>
      
      <div className="w-full max-w-sm flex flex-col gap-6 z-10">
        {/* HOST AREA */}
        {!isRecovering ? (
          <div className="flex flex-col gap-2">
            <button onClick={onCreateTable} disabled={loading} className="w-full py-5 bg-emerald-600 active:bg-emerald-700 text-white font-bold rounded-2xl text-2xl shadow-lg transition-all">
              {loading ? '...' : 'HOST TABLE'}
            </button>
            <button onClick={() => setIsRecovering(true)} className="text-gray-500 text-sm hover:text-white underline text-center">
              Recover Host Session
            </button>
          </div>
        ) : (
          <div className="bg-neutral-800 p-4 rounded-xl border border-gray-600 animate-in fade-in slide-in-from-top-4">
            <p className="text-gray-400 text-sm mb-2">Resume Hosting:</p>
            <div className="flex gap-2">
              <input className="flex-1 p-3 bg-neutral-900 text-white rounded-lg text-center font-mono font-bold" 
                placeholder="1234" value={roomCode} onChange={e => setRoomCode(e.target.value)} />
              <button onClick={() => onRecoverHost(roomCode)} disabled={loading} className="px-4 bg-emerald-600 text-white font-bold rounded-lg">Resume</button>
            </div>
            <button onClick={() => setIsRecovering(false)} className="text-xs text-red-400 mt-2 w-full text-center">Cancel</button>
          </div>
        )}

        {/* JOIN AREA */}
        <div className="bg-neutral-800 p-6 rounded-2xl border border-neutral-700 flex flex-col gap-4">
          <input className="w-full p-4 bg-neutral-900 text-white rounded-xl font-bold text-xl border border-neutral-600 focus:border-yellow-500 outline-none" 
            placeholder="Your Name" value={playerName} onChange={e => setPlayerName(e.target.value)} />
          
          <div className="flex gap-2">
            <input className="flex-1 min-w-0 p-4 bg-neutral-900 text-white rounded-xl text-center font-mono text-xl border border-neutral-600 focus:border-yellow-500 outline-none" 
              placeholder="Code" value={roomCode} onChange={e => setRoomCode(e.target.value)} />
            <button onClick={() => onJoinGame(roomCode, playerName)} disabled={loading} className="px-6 md:px-8 bg-blue-600 active:bg-blue-700 text-white font-bold rounded-xl shadow-lg whitespace-nowrap">
              GO
            </button>
          </div>
        </div>
      </div>

      {/* CREDITS FOOTER */}
      <div className="absolute bottom-6 flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-opacity duration-300">
        <span className="text-neutral-600 font-mono text-xs tracking-[0.2em] uppercase cursor-default select-none">
          Made by Prashant
        </span>
        <div className="flex gap-4 text-xs font-mono">
          <a 
            href="https://github.com/prashantnk/Poker" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-neutral-500 hover:text-white transition-colors"
          >
            GITHUB
          </a>
          <span className="text-neutral-700">|</span>
          <a 
            href="https://www.linkedin.com/in/prashant-ranjan-b44899b3/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-neutral-500 hover:text-blue-400 transition-colors"
          >
            LINKEDIN
          </a>
        </div>
      </div>
    </div>
  );
}