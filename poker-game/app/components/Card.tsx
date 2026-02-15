import React from 'react';

export type CardType = {
  suit: string;
  value: string;
  color: string;
  id: string;
};

type CardProps = {
  card?: CardType;
  hidden?: boolean;
  className?: string;
};

export default function Card({ card, hidden, className = "" }: CardProps) {
  if (hidden || !card) return (
    <div className={`aspect-[2/3] bg-blue-900 rounded-xl border-2 md:border-4 border-white shadow-xl flex items-center justify-center ${className}`}>
      <span className="text-2xl md:text-4xl">🐉</span>
    </div>
  );
  return (
    <div className={`aspect-[2/3] bg-white rounded-xl border border-gray-300 flex flex-col items-center justify-center shadow-xl ${card.color} ${className}`}>
      <span className="font-bold text-3xl md:text-5xl">{card.value}</span>
      <span className="text-4xl md:text-6xl">{card.suit}</span>
    </div>
  );
}