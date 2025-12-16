import React, { useState, useEffect, useRef } from 'react';
import { Cake } from './components/Cake';
import { useBlowDetection } from './hooks/useBlowDetection';
import Confetti from 'react-confetti';
import { Sparkles, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TOTAL_CANDLES = 17;

// --- Sound Utilities (Synthesizers) ---
const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

const playPuffSound = () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const bufferSize = audioCtx.sampleRate * 0.1; // 0.1 seconds
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1; // White noise
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  noise.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  noise.start();
};

const playWinTune = () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C
  notes.forEach((freq, i) => {
    setTimeout(() => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    }, i * 150);
  });
};

const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [candlesLit, setCandlesLit] = useState<boolean[]>(Array(TOTAL_CANDLES).fill(true));
  const [isWon, setIsWon] = useState(false);
  const [birthdayMessage, setBirthdayMessage] = useState<string>("");
  
  // Audio detection hook
  const { isBlowing, intensity, startAudio, stopAudio } = useBlowDetection();

  const handleStart = async () => {
    try {
      await startAudio();
      setHasStarted(true);
      // Resume audio context for output if needed
      if (audioCtx.state === 'suspended') await audioCtx.resume();
    } catch (e) {
      alert("We need microphone access to detect you blowing out the candles! Please refresh and allow permissions.");
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

  // Game logic: Extinguish candles based on blow intensity
  useEffect(() => {
    if (!hasStarted || isWon) return;

    if (isBlowing) {
      setCandlesLit((prev) => {
        const litIndices = prev.map((lit, i) => lit ? i : -1).filter(i => i !== -1);
        
        if (litIndices.length === 0) return prev;

        // The stronger the blow, the more candles go out
        const candlesToExtinguishCount = Math.max(1, Math.ceil(intensity * 3)); 
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

  // Check win condition
  useEffect(() => {
    if (hasStarted && !isWon && candlesLit.every(lit => !lit)) {
      setIsWon(true);
      stopAudio();
      playWinTune();
      setBirthdayMessage("Happy Birthday! 🎉 May your day be as sweet as this cake and filled with all the love you deserve! I love you! ❤️");
    }
  }, [candlesLit, hasStarted, isWon, stopAudio]);

  const { width, height } = useWindowSize();

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-pink-100 to-purple-200">
      {isWon && <Confetti width={width} height={height} numberOfPieces={500} recycle={false} />}
      
      {!hasStarted ? (
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="z-10 text-center p-8 bg-white/80 backdrop-blur-md rounded-3xl shadow-xl max-w-md mx-4 transform border border-pink-200"
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
        <div className="flex flex-col items-center justify-between w-full h-full min-h-[80vh] py-10 z-10">
          
          {/* Header Message */}
          <div className="text-center px-4 min-h-[160px] flex items-end justify-center">
             <AnimatePresence mode='wait'>
               {isWon && (
                 <motion.div
                   initial={{ scale: 0, rotate: -10 }}
                   animate={{ scale: 1, rotate: 0 }}
                   transition={{ type: "spring", stiffness: 260, damping: 20 }}
                 >
                   <h1 className="font-handwriting text-5xl md:text-7xl text-pink-600 mb-4 drop-shadow-sm">
                     Happy Birthday!
                   </h1>
                   <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-lg md:text-xl text-slate-700 max-w-2xl mx-auto italic bg-white/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-pink-100"
                   >
                     {birthdayMessage}
                   </motion.div>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>

          {/* Main Cake Area */}
          <motion.div 
            className="relative mt-8 md:mt-0"
            animate={{ scale: isWon ? 1.1 : 1 }}
            transition={{ duration: 1 }}
          >
             <Cake candlesLit={candlesLit} />
          </motion.div>

          {/* Footer Instruction */}
          <div className="h-16 mt-12 flex items-center justify-center">
            {!isWon && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center bg-white/60 backdrop-blur-sm px-6 py-3 rounded-full text-pink-800 font-semibold shadow-sm animate-bounce"
              >
                Blow into your microphone to extinguish the candles! 🌬️🎂
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper hook for window size
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
