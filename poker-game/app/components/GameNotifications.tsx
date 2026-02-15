'use client';

export type LogMessage = {
  id: string;
  text: string;
  type: 'info' | 'alert' | 'success';
};

export default function GameNotifications({ logs }: { logs: LogMessage[] }) {
  // Show only last 5 logs
  const recentLogs = logs.slice(-5);

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-[300px] pointer-events-none">
      {recentLogs.map((log) => (
        <div 
          key={log.id} 
          className={`
            px-4 py-3 rounded-lg border-l-4 shadow-xl backdrop-blur-md text-sm font-bold animate-in slide-in-from-right-full fade-in duration-300
            ${log.type === 'alert' ? 'bg-red-900/90 border-red-500 text-white' : 
              log.type === 'success' ? 'bg-emerald-900/90 border-emerald-500 text-white' : 
              'bg-gray-900/90 border-yellow-500 text-white'}
          `}
        >
          {log.text}
        </div>
      ))}
    </div>
  );
}