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
  size?: 'sm' | 'md' | 'lg'; // sm: Grid, md: Community, lg: Player Phone
};

export default function Card({ card, hidden, className = "", size = 'md' }: CardProps) {
  // Define sizing classes based on the 'size' prop
  const sizes = {
    sm: { 
      value: 'text-lg md:text-xl', 
      suit: 'text-xl md:text-2xl', 
      icon: 'text-xl' 
    },
    md: { 
      value: 'text-2xl md:text-4xl', 
      suit: 'text-4xl md:text-6xl', 
      icon: 'text-3xl' 
    },
    lg: { 
      // MASSIVE text for the phone view
      value: 'text-[5rem] leading-none md:text-[8rem]', 
      suit: 'text-[6rem] leading-none md:text-[9rem]', 
      icon: 'text-6xl md:text-8xl' 
    }
  };

  const s = sizes[size];

  if (hidden || !card) return (
    <div className={`aspect-[2/3] bg-blue-900 rounded-xl border-2 md:border-4 border-white shadow-xl flex items-center justify-center ${className}`}>
      <span className={s.icon}>🐉</span>
    </div>
  );

  return (
    <div className={`aspect-[2/3] bg-white rounded-xl border border-gray-300 flex flex-col items-center justify-center shadow-xl ${card.color} ${className}`}>
      <span className={`font-bold ${s.value}`}>{card.value}</span>
      <span className={s.suit}>{card.suit}</span>
    </div>
  );
}