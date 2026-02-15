import React, { memo } from 'react';
import Image from 'next/image';

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

function Card({ card, hidden, className = "", size = 'md' }: CardProps) {
  
  const borderClass = size === 'lg' 
    ? 'border-[6px] rounded-[16px]' 
    : size === 'md' 
      ? 'border-[3px] rounded-[10px]' 
      : 'border-[1px] rounded-[4px]';

  // Optimization: Pre-calculate image source
  const cardBackSrc = "https://deckofcardsapi.com/static/img/back.png";
  
  let cardFrontSrc = "";
  if (card) {
    const suitCode = card.suit === '♠' ? 'S' : card.suit === '♥' ? 'H' : card.suit === '♣' ? 'C' : 'D';
    const valueCode = card.value === '10' ? '0' : card.value;
    cardFrontSrc = `https://deckofcardsapi.com/static/img/${valueCode}${suitCode}.png`;
  }

  // --- HIDDEN STATE ---
  if (hidden || !card) return (
    <div className={`aspect-[2.5/3.5] relative shadow-2xl ${className} overflow-hidden rounded-[5%] bg-white`}>
       <Image 
         src={cardBackSrc} 
         alt="Card Back"
         fill
         sizes="(max-width: 768px) 150px, 300px" // Download smaller image on mobile
         className="object-cover"
         priority // Load ASAP
       />
    </div>
  );

  // --- VISIBLE STATE ---
  return (
    <div className={`aspect-[2.5/3.5] relative shadow-2xl overflow-hidden bg-white ${borderClass} border-gray-300 ${className}`}>
      <Image 
        src={cardFrontSrc} 
        alt={`${card.value} of ${card.suit}`}
        fill
        sizes="(max-width: 768px) 150px, 300px"
        className="object-contain p-[2%]" 
        priority
      />
      {/* Subtle Inner Shadow */}
      <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(0,0,0,0.1)] pointer-events-none rounded-lg"></div>
    </div>
  );
}

// MEMOIZE: Prevents re-rendering if props (card/hidden) haven't changed
export default memo(Card);