'use client';
import { useEffect, useState } from 'react';

export type LogMessage = {
  id: string;
  text: string;
  type: 'info' | 'alert' | 'success';
};

export default function GameNotifications({ logs }: { logs: LogMessage[] }) {
  // We only show the last 5 logs to keep the screen clean
  const recentLogs = logs.slice(-5);

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 w-full max-w-xs md:max-w-sm pointer-events-none">
      {recentLogs.map((log) => (
        <div 
          key={log.id} 
          className={`
            px-4 py-3 rounded-xl border-l-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-right-full fade-in duration-300
            ${log.type === 'alert' ? 'bg-red-950/90 border-red-500 text-red-200' : 
              log.type === 'success' ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200' : 
              'bg-gray-900/90 border-yellow-500 text-gray-200'}
          `}
        >
          {log.text}
        </div>
      ))}
    </div>
  );
}