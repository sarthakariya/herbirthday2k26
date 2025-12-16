import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Cake } from './components/Cake';
import { useBlowDetection } from './hooks/useBlowDetection';
import Confetti from 'react-confetti';
import { Sparkles, Mic, Music } from 'lucide-react';

const TOTAL_CANDLES = 17;

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
    } catch (e) {
      alert("We need microphone access to detect you blowing out the candles! Please refresh and allow permissions.");
    }
  };

  // Game logic: Extinguish candles based on blow intensity
  useEffect(() => {
    if (!hasStarted || isWon) return;

    if (isBlowing) {
      setCandlesLit((prev) => {
        const litIndices = prev.map((lit, i) => lit ? i : -1).filter(i => i !== -1);
        
        if (litIndices.length === 0) return prev;

        // The stronger the blow, the more candles go out, but limit speed for effect
        const candlesToExtinguishCount = Math.ceil(intensity * 2); 
        const newCandles = [...prev];
        
        // Randomly pick candles to extinguish
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
      // Set the message directly here instead of using an API
      setBirthdayMessage("Happy Birthday! 🎉 May your day be as sweet as this cake and filled with all the love you deserve! I love you! ❤️");
    }
  }, [candlesLit, hasStarted, isWon, stopAudio]);

  const { width, height } = useWindowSize();

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-pink-100 to-purple-200">
      {isWon && <Confetti width={width} height={height} numberOfPieces={500} recycle={false} />}
      
      {!hasStarted ? (
        <div className="z-10 text-center p-8 bg-white/80 backdrop-blur-md rounded-3xl shadow-xl max-w-md mx-4 transform transition-all hover:scale-105 border border-pink-200">
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
        </div>
      ) : (
        <div className="flex flex-col items-center justify-between w-full h-full min-h-[80vh] py-10 z-10">
          
          {/* Header Message */}
          <div className={`transition-all duration-1000 transform ${isWon ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'} text-center px-4`}>
             <h1 className="font-handwriting text-5xl md:text-7xl text-pink-600 mb-4 drop-shadow-sm">
               Happy Birthday!
             </h1>
             <p className="text-lg md:text-xl text-slate-700 max-w-2xl mx-auto italic bg-white/50 p-6 rounded-xl shadow-sm border border-pink-100">
               {birthdayMessage}
             </p>
          </div>

          {/* Main Cake Area */}
          <div className="relative mt-8 md:mt-0 transform scale-75 md:scale-100 transition-transform duration-500">
             <Cake candlesLit={candlesLit} />
          </div>

          {/* Footer Instruction */}
          {!isWon && (
             <div className="mt-12 text-center bg-white/60 backdrop-blur-sm px-6 py-3 rounded-full text-pink-800 font-semibold shadow-sm animate-bounce">
               Blow into your microphone to extinguish the candles! 🌬️🎂
             </div>
          )}
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
