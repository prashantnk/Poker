'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';

const SUITS = ['S', 'H', 'C', 'D'];
const VALUES = ['0', 'A', 'K', 'Q', 'J', '2', '3', '4', '5', '6', '7', '8', '9'];

export default function CardPreloader() {
  const [load, setLoad] = useState(false);

  useEffect(() => {
    // Start preloading after 2 seconds (let the UI settle first)
    const timer = setTimeout(() => setLoad(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!load) return null;

  // Generate all card URLs
  const images = VALUES.flatMap(v => 
    SUITS.map(s => `https://deckofcardsapi.com/static/img/${v}${s}.png`)
  );
  images.push("https://deckofcardsapi.com/static/img/back.png");

  return (
    <div className="fixed inset-0 pointer-events-none opacity-0 overflow-hidden z-[-1]">
      {images.map((src) => (
        // We render them in a tiny invisible box, 
        // BUT we use the EXACT same 'sizes' prop as the real GameTable.
        // This tricks the browser into downloading the exact version needed for the game.
        <div key={src} className="relative w-1 h-1">
          <Image 
            src={src}
            alt="preload"
            fill
            // MATCHING YOUR CARD.TSX SIZES EXACTLY:
            sizes="(max-width: 768px) 150px, 300px"
            loading="eager"
            priority={true}
          />
        </div>
      ))}
    </div>
  );
}