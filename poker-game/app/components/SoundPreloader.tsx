'use client';
import { useEffect } from 'react';

const SOUNDS = ['deal', 'check', 'fold', 'win'];

export default function SoundPreloader() {
  useEffect(() => {
    // Start preloading audio 4 seconds after app load 
    // (We wait a bit to let Card images take priority)
    const timer = setTimeout(() => {
      SOUNDS.forEach(sound => {
        const audio = new Audio(`/sounds/${sound}.mp3`);
        audio.preload = 'auto'; // Tell browser to download it now
        audio.volume = 0;       // Mute it just in case
        audio.load();           // Trigger the network request
      });
      console.log("🔊 Sounds preloaded into cache");
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  // This component renders nothing
  return null;
}