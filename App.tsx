import React, { useState, useEffect, useRef } from 'react';
import { Cake } from './components/Cake';
import { useBlowDetection } from './hooks/useBlowDetection';
import Confetti from 'react-confetti';
import { Sparkles, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TOTAL_CANDLES = 17;

// --- Audio Synthesizer Logic ---
// We initialize this lazily to respect browser autoplay policies
let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

const playPuffSound = () => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  // Create a noise-like effect for "puff"
  const bufferSize = ctx.sampleRate * 0.15;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
  // Filter to make it sound more like breath
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1000, t);
  
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  
  gain.gain.setValueAtTime(0.5, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
  
  noise.start(t);
  noise.stop(t + 0.15);
};

const playWinTune = () => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume();

  const now = ctx.currentTime;
  // Simple "Happy Birthday" beginning notes
  const notes = [
    { f: 261.63, d: 0.25, t: 0 },    // C4
    { f: 261.63, d: 0.25, t: 0.25 }, // C4
    { f: 293.66, d: 0.5,  t: 0.5 },  // D4
    { f: 261.63, d: 0.5,  t: 1.0 },  // C4
    { f: 349.23, d: 0.5,  t: 1.5 },  // F4
    { f: 329.63, d: 1.0,  t: 2.0 },  // E4
  ];

  notes.forEach(({ f, d, t }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.value = f;
    
    gain.gain.setValueAtTime(0.1, now + t);
    gain.gain.linearRampToValueAtTime(0.1, now + t + d - 0.05);
    gain.gain.linearRampToValueAtTime(0, now + t + d);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now + t);
    osc.stop(now + t + d);
  });
};

const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [candlesLit, setCandlesLit] = useState<boolean[]>(Array(TOTAL_CANDLES).fill(true));
  const [isWon, setIsWon] = useState(false);
  const [birthdayMessage, setBirthdayMessage] = useState<string>("");
  
  const { isBlowing, intensity, startAudio, stopAudio } = useBlowDetection();

  const handleStart = async () => {
    try {
      getAudioContext().resume(); // Initialize audio context on user gesture
      await startAudio();
      setHasStarted(true);
    } catch (e) {
      alert("Microphone access is needed to blow out the candles!");
    }
  };

  // Sound effect trigger for candles
  const prevLitCount = useRef(TOTAL_CANDLES);
  useEffect(() => {
    const currentLitCount = candlesLit.filter(c => c).length;
    if (currentLitCount < prevLitCount.current) {
      playPuffSound();
      prevLitCount.current = currentLitCount;
    }
  }, [candlesLit]);

  // Game logic
  useEffect(() => {
    if (!hasStarted || isWon) return;

    if (isBlowing) {
      setCandlesLit((prev) => {
        const litIndices = prev.map((lit, i) => lit ? i : -1).filter(i => i !== -1);
        if (litIndices.length === 0) return prev;

        const candlesToExtinguishCount = Math.max(1, Math.ceil(intensity * 4)); 
        const newCandles = [...prev];
        
        for (let i = 0; i < candlesToExtinguishCount; i++) {
          if (litIndices.length === 0) break;
          const randomIndex = Math.floor(Math.random() * litIndices.length);
          const candleIndex = litIndices[randomIndex];
          newCandles[candleIndex] = false;
          litIndices.splice(randomIndex, 1);
        }
        return newCandles;
      });
    }
  }, [isBlowing, intensity, hasStarted, isWon]);

  // Win condition
  useEffect(() => {
    if (hasStarted && !isWon && candlesLit.every(lit => !lit)) {
      setIsWon(true);
      stopAudio();
      setTimeout(() => playWinTune(), 500); // Slight delay for effect
      setBirthdayMessage("Happy Birthday! 🎉 May your day be as sweet as this cake and filled with all the love you deserve! I love you! ❤️");
    }
  }, [candlesLit, hasStarted, isWon, stopAudio]);

  const { width, height } = useWindowSize();

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-pink-100 to-purple-200 font-sans">
      {isWon && <Confetti width={width} height={height} numberOfPieces={500} recycle={false} />}
      
      {!hasStarted ? (
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="z-10 text-center p-8 bg-white/80 backdrop-blur-md rounded-3xl shadow-xl max-w-md mx-4 border border-pink-200"
        >
          <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6 text-pink-500">
             <Sparkles size={40} />
          </div>
          <h1 className="font-handwriting text-4xl mb-4 text-pink-600">Surprise!</h1>
          <p className="text-gray-600 mb-8 text-lg leading-relaxed">
            I made a special virtual cake just for you. 
            Enable your microphone to <strong>blow out the candles</strong>!
          </p>
          <button 
            onClick={handleStart}
            className="group relative px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full font-bold text-lg shadow-lg hover:shadow-pink-500/50 transition-all active:scale-95 flex items-center gap-3 mx-auto"
          >
            <Mic size={24} className="group-hover:animate-bounce" />
            Make a Wish & Start
          </button>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-between w-full h-full min-h-[85vh] py-10 z-10">
          
          {/* Dynamic Header Message */}
          <div className="text-center px-4 min-h-[200px] flex flex-col items-center justify-center z-30">
             <AnimatePresence mode='wait'>
               {isWon && (
                 <motion.div
                   initial={{ scale: 0.5, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   transition={{ type: "spring", stiffness: 300, damping: 20 }}
                   className="flex flex-col items-center"
                 >
                   <motion.h1 
                     className="font-handwriting text-5xl md:text-8xl text-pink-600 mb-6 drop-shadow-md text-center leading-tight"
                     animate={{ 
                       rotate: [0, -2, 2, -2, 0],
                       scale: [1, 1.02, 1, 1.02, 1] 
                     }}
                     transition={{ duration: 3, repeat: Infinity }}
                   >
                     Happy Birthday!
                   </motion.h1>
                   <motion.div 
                      initial={{ y: 50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5, duration: 0.8 }}
                      className="text-xl md:text-2xl text-slate-700 max-w-2xl text-center italic bg-white/70 backdrop-blur-md p-8 rounded-2xl shadow-xl border-2 border-pink-200"
                   >
                     {birthdayMessage}
                   </motion.div>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>

          {/* Cake Component */}
          <motion.div 
            className="relative mt-auto mb-10"
            animate={{ scale: isWon ? 1.1 : 1, y: isWon ? 20 : 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          >
             <Cake candlesLit={candlesLit} />
          </motion.div>

          {/* Instructions */}
          {!isWon && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-center bg-white/60 backdrop-blur-sm px-6 py-3 rounded-full text-pink-800 font-semibold shadow-sm animate-bounce"
            >
              Blow into your microphone to extinguish the candles! 🌬️🎂
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
}

export default App;
