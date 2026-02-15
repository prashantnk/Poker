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
  size?: 'sm' | 'md' | 'lg';
};

export default function Card({ card, hidden, className = "", size = 'md' }: CardProps) {
  
  // Refined borders: thicker for the 'md' size since we scale it up on the table
  const borderClass = size === 'lg' 
    ? 'border-[6px] rounded-[16px]'  // Zoom View
    : size === 'md' 
      ? 'border-[3px] rounded-[10px]' // Table View (Community/Player)
      : 'border-[1px] rounded-[4px]'; // Small View

  // --- HIDDEN STATE (Card Back) ---
  if (hidden || !card) return (
    <div className={`aspect-[2.5/3.5] relative shadow-2xl ${className} overflow-hidden rounded-[5%]`}>
       {/* Real Bicycle Card Back Image */}
       <img 
         src="https://deckofcardsapi.com/static/img/back.png" 
         alt="Card Back"
         className="w-full h-full object-cover"
       />
    </div>
  );

  // --- IMAGE URL LOGIC ---
  const getCardImage = () => {
    // 1. Map Suit to API Code (S, H, D, C)
    const suitCode = 
      card.suit === '♠' ? 'S' : 
      card.suit === '♥' ? 'H' : 
      card.suit === '♣' ? 'C' : 'D';

    // 2. Map Value to API Code (0, A, K, Q, J, 2-9)
    // The API uses '0' for the number 10
    const valueCode = card.value === '10' ? '0' : card.value;

    return `https://deckofcardsapi.com/static/img/${valueCode}${suitCode}.png`;
  };

  return (
    <div className={`aspect-[2.5/3.5] relative shadow-2xl overflow-hidden bg-white ${borderClass} border-gray-300 ${className}`}>
      <img 
        src={getCardImage()} 
        alt={`${card.value} of ${card.suit}`}
        className="w-full h-full object-contain pointer-events-none"
      />
      
      {/* Subtle Inner Shadow for Depth */}
      <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(0,0,0,0.1)] pointer-events-none rounded-lg"></div>
    </div>
  );
}