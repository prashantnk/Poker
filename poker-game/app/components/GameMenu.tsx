import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type GameMenuProps = {
  APP_NAME: string;
  onCreateTable: (qrUrl: string | null) => void;
  onJoinGame: (room: string, name: string) => void;
  onRecoverHost: (room: string) => void;
  loading: boolean;
};

export default function GameMenu({ APP_NAME, onCreateTable, onJoinGame, onRecoverHost, loading }: GameMenuProps) {
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  
  // Scanner State
  const [qrList, setQrList] = useState<{name: string, url: string}[]>([]);
  const [selectedQr, setSelectedQr] = useState<string>("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Load Global Scanners on Mount
  useEffect(() => {
    const fetchScanners = async () => {
      const { data } = await supabase.storage.from('qrcodes').list();
      if (data) {
        // Map files to usable objects
        const list = data
          .filter(f => f.name !== '.emptyFolderPlaceholder') // Filter system files
          .map(f => ({
            // Display Name: "Prashant_123123" -> "Prashant"
            name: f.name.includes('_') ? f.name.split('_')[0] : f.name,
            url: supabase.storage.from('qrcodes').getPublicUrl(f.name).data.publicUrl
          }));
        setQrList(list);
      }
    };
    fetchScanners();
  }, []);

  const handleUpload = async () => {
    if (!uploadFile || !uploadName) return alert("Please select a file and enter a name.");
    setIsUploading(true);
    
    // Create unique filename: "Abhay_171542..."
    const cleanName = uploadName.replace(/[^a-zA-Z0-9]/g, '');
    const fileName = `${cleanName}_${Date.now()}`;
    
    const { error } = await supabase.storage.from('qrcodes').upload(fileName, uploadFile);

    if (error) {
      alert("Upload failed: " + error.message);
    } else {
      alert("Scanner added to global library!");
      setUploadFile(null);
      setUploadName('');
      setShowUpload(false);
      
      // Refresh list immediately
      const { data } = await supabase.storage.from('qrcodes').getPublicUrl(fileName);
      setQrList(prev => [...prev, { name: cleanName, url: data.publicUrl }]);
      setSelectedQr(data.publicUrl); // Auto-select the new one
    }
    setIsUploading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 gap-8 p-4 relative overflow-y-auto">
      <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600 text-center mt-10 md:mt-0">
        {APP_NAME}
      </h1>
      
      <div className="w-full max-w-sm flex flex-col gap-6 z-10 mb-20">
        
        {/* HOST SECTION */}
        {!isRecovering ? (
          <div className="flex flex-col gap-4 bg-neutral-800/50 p-5 rounded-2xl border border-neutral-700 backdrop-blur-sm">
            
            {/* SCANNER SELECTOR */}
            {qrList.length > 0 && (
              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Payment Scanner</label>
                <select 
                  className="bg-neutral-900 text-white p-3 rounded-xl border border-neutral-600 outline-none focus:border-emerald-500 transition-colors"
                  value={selectedQr}
                  onChange={(e) => setSelectedQr(e.target.value)}
                >
                  <option value="">-- No Scanner --</option>
                  {qrList.map((qr, i) => (
                    <option key={i} value={qr.url}>{qr.name}</option>
                  ))}
                </select>
              </div>
            )}

            <button onClick={() => onCreateTable(selectedQr || null)} disabled={loading} className="w-full py-4 bg-emerald-600 active:bg-emerald-700 text-white font-bold rounded-xl text-xl shadow-lg transition-all hover:scale-[1.02]">
              {loading ? 'Starting...' : 'HOST TABLE'}
            </button>
            
            <button onClick={() => setIsRecovering(true)} className="text-gray-500 text-xs hover:text-white underline text-center">
              Recover Host Session
            </button>
          </div>
        ) : (
          // RECOVER SECTION
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

        {/* JOIN SECTION */}
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

        {/* UPLOAD TOGGLE */}
        <div className="border-t border-neutral-800 pt-4">
          <button 
            onClick={() => setShowUpload(!showUpload)}
            className="text-xs text-gray-500 uppercase tracking-widest hover:text-white w-full text-center mb-4"
          >
            {showUpload ? 'Hide Upload' : '+ Upload New Scanner'}
          </button>

          {showUpload && (
            <div className="p-4 border border-dashed border-neutral-700 rounded-xl bg-neutral-900/50 animate-in slide-in-from-top-2">
              <div className="flex flex-col gap-3">
                <input 
                  type="text" 
                  placeholder="Name (e.g. Abhay)" 
                  className="bg-neutral-800 text-white p-2 rounded text-sm border border-neutral-700 outline-none focus:border-blue-500"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                />
                <input 
                  type="file" 
                  accept="image/*"
                  className="text-xs text-gray-400 file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-neutral-700 file:text-white hover:file:bg-neutral-600"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
                <button 
                  onClick={handleUpload} 
                  disabled={isUploading}
                  className="mt-1 bg-blue-900/50 hover:bg-blue-800 text-blue-200 py-2 rounded-lg text-xs font-bold transition-colors"
                >
                  {isUploading ? 'UPLOADING...' : 'UPLOAD TO LIBRARY'}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* FOOTER */}
      <div className="absolute bottom-6 flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-opacity duration-300">
        <span className="text-neutral-600 font-mono text-xs tracking-[0.2em] uppercase cursor-default select-none">
          Made by Prashant
        </span>
        <div className="flex gap-4 text-xs font-mono">
          <a href="https://github.com/prashantnk/Poker" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-white transition-colors">GITHUB</a>
          <span className="text-neutral-700">|</span>
          <a href="https://www.linkedin.com/in/prashant-ranjan-b44899b3/" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-blue-400 transition-colors">LINKEDIN</a>
        </div>
      </div>
    </div>
  );
}