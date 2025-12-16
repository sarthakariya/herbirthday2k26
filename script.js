import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { Sparkles, Mic } from 'lucide-react';

// --- 1. HOOK: Microphone Detection ---
const useBlowDetection = () => {
  const [isBlowing, setIsBlowing] = useState(false);
  const [intensity, setIntensity] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceRef = useRef(null);
  const rafIdRef = useRef(null);

  const startAudio = useCallback(async () => {
    if (audioContextRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 512;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
      sourceRef.current = source;

      const checkAudio = () => {
        if (!analyserRef.current || !dataArrayRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        
        let sum = 0;
        const lowerHalfCount = Math.floor(dataArrayRef.current.length / 2);
        for (let i = 0; i < lowerHalfCount; i++) {
          sum += dataArrayRef.current[i];
        }
        const average = sum / lowerHalfCount;

        // Threshold for detecting a "blow" (wind noise is low freq, high amplitude)
        const THRESHOLD = 40; 
        
        if (average > THRESHOLD) {
          setIsBlowing(true);
          setIntensity(Math.min((average - THRESHOLD) / 50, 1));
        } else {
          setIsBlowing(false);
          setIntensity(0);
        }

        rafIdRef.current = requestAnimationFrame(checkAudio);
      };

      checkAudio();
    } catch (error) {
      console.error("Error accessing microphone:", error);
      throw error;
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    if (sourceRef.current) sourceRef.current.disconnect();
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsBlowing(false);
  }, []);

  useEffect(() => {
    return () => stopAudio();
  }, [stopAudio]);

  return { isBlowing, intensity, startAudio, stopAudio };
};

// --- 2. COMPONENT: Candle ---
const Candle = ({ isLit, index }) => {
  const colors = ['bg-blue-400', 'bg-green-400', 'bg-red-400', 'bg-purple-400', 'bg-yellow-400', 'bg-pink-400'];
  const color = colors[index % colors.length];

  return (
    <div className="flex flex-col items-center relative mx-0.5 mb-[-8px] group">
      {/* Flame Area */}
      <div className="h-8 w-6 relative flex justify-center items-end">
        {isLit && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ 
              scale: [1, 1.1, 0.9, 1.15, 1],
              rotate: [-2, 2, -3, 3, 0],
              opacity: [0.8, 1, 0.9, 1],
            }}
            transition={{
              duration: 0.5 + Math.random() * 0.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-3.5 h-6 bg-gradient-to-t from-orange-600 via-yellow-400 to-yellow-100 rounded-full shadow-[0_0_12px_2px_rgba(255,165,0,0.7)] origin-bottom"
          >
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-2 bg-blue-500/40 rounded-full blur-[1px]"></div>
          </motion.div>
        )}
        
        {!isLit && (
           <motion.div 
             initial={{ opacity: 0, y: 0 }}
             animate={{ opacity: [0, 0.6, 0], y: -25, x: (index % 2 === 0 ? 5 : -5) }}
             transition={{ duration: 1.5 }}
             className="absolute bottom-0 text-gray-400 font-bold text-lg pointer-events-none"
           >
             ~
           </motion.div>
        )}
      </div>

      {/* Candle Body */}
      <div className={`w-3 h-12 ${color} rounded-sm shadow-[inset_-2px_0_4px_rgba(0,0,0,0.2)] relative overflow-hidden border-b border-black/10`}>
         <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.2),rgba(255,255,255,0.2)_5px,transparent_5px,transparent_8px)]"></div>
         <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-[2px] h-2 bg-black/60"></div>
      </div>
    </div>
  );
};

// --- 3. COMPONENT: Cake ---
const Cake = ({ candlesLit }) => {
  return (
    <div className="relative flex flex-col items-center justify-end select-none transform md:scale-125">
      
      {/* Candles */}
      <div className="flex justify-center items-end absolute bottom-[195px] z-20 w-[240px] px-1 gap-1 flex-wrap perspective-500">
        {candlesLit.map((isLit, index) => (
          <Candle key={index} isLit={isLit} index={index} />
        ))}
      </div>

      {/* Top Layer */}
      <div className="w-64 h-24 bg-pink-300 rounded-t-2xl relative z-10 shadow-lg border-b-4 border-pink-400/20 flex items-center justify-center">
        {/* Sprinkles */}
        {[...Array(25)].map((_, i) => (
          <div 
            key={i} 
            className="absolute rounded-full w-1.5 h-1.5 opacity-90 shadow-sm"
            style={{
              top: `${Math.random() * 80}%`,
              left: `${Math.random() * 90 + 5}%`,
              backgroundColor: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FFFFFF'][i % 4],
              transform: `rotate(${Math.random() * 360}deg)`
            }}
          />
        ))}
        {/* Drips */}
        <div className="absolute -top-1 w-full h-8 flex justify-between px-2">
           {[...Array(9)].map((_, i) => (
             <div key={i} className="w-8 h-8 bg-pink-300 rounded-b-full border-b-4 border-pink-400/10 -mx-1"></div>
           ))}
        </div>
        <div className="z-10 text-white/40 font-bold text-6xl mix-blend-overlay tracking-widest">♥</div>
      </div>

      {/* Middle Layer */}
      <div className="w-80 h-28 bg-yellow-100 relative z-0 shadow-md -mt-2 rounded-xl border-b-4 border-yellow-200/50 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_20px,rgba(255,255,255,0.4)_20px,rgba(255,255,255,0.4)_40px)]"></div>
        <div className="absolute top-1/2 w-full h-3 bg-white/60 shadow-inner"></div>
        {[...Array(8)].map((_, i) => (
           <div key={i} className="absolute w-4 h-4 bg-red-400/30 rounded-full blur-[1px]" style={{ top: `${Math.random() * 60 + 20}%`, left: `${Math.random() * 80 + 10}%` }}></div>
        ))}
      </div>

      {/* Bottom Layer */}
      <div className="w-96 h-32 bg-amber-700 relative z-0 shadow-xl -mt-2 rounded-b-3xl rounded-t-lg flex items-center justify-center overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-tr from-amber-900 via-amber-700 to-amber-600"></div>
         <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
         <div className="relative z-10 flex flex-col items-center">
            <span className="text-amber-100/90 font-handwriting text-5xl drop-shadow-lg">Happy Birthday</span>
            <span className="text-amber-100/60 font-sans text-sm tracking-[0.3em] uppercase mt-1">Make a Wish</span>
         </div>
      </div>

      {/* Plate */}
      <div className="w-[460px] h-6 bg-slate-100 rounded-[50%] shadow-2xl mt-1 relative z-[-1] border border-slate-200"></div>
    </div>
  );
};

// --- 4. AUDIO UTILITIES ---
let audioCtx = null;
const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
};

const playPuffSound = () => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  // White noise buffer
  const bufferSize = ctx.sampleRate * 0.15;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
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

// --- 5. MAIN APP COMPONENT ---
const App = () => {
  const TOTAL_CANDLES = 17;
  const [hasStarted, setHasStarted] = useState(false);
  const [candlesLit, setCandlesLit] = useState(Array(TOTAL_CANDLES).fill(true));
  const [isWon, setIsWon] = useState(false);
  const [birthdayMessage, setBirthdayMessage] = useState("");
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  const { isBlowing, intensity, startAudio, stopAudio } = useBlowDetection();

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleStart = async () => {
    try {
      getAudioContext().resume();
      await startAudio();
      setHasStarted(true);
    } catch (e) {
      alert("Microphone access is needed to blow out the candles!");
    }
  };

  const prevLitCount = useRef(TOTAL_CANDLES);
  useEffect(() => {
    const currentLitCount = candlesLit.filter(c => c).length;
    if (currentLitCount < prevLitCount.current) {
      playPuffSound();
      prevLitCount.current = currentLitCount;
    }
  }, [candlesLit]);

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

  useEffect(() => {
    if (hasStarted && !isWon && candlesLit.every(lit => !lit)) {
      setIsWon(true);
      stopAudio();
      setTimeout(() => playWinTune(), 500);
      setBirthdayMessage("Happy Birthday! 🎉 May your day be as sweet as this cake and filled with all the love you deserve! I love you! ❤️");
    }
  }, [candlesLit, hasStarted, isWon, stopAudio]);

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-pink-100 to-purple-200 font-sans">
      {isWon && <Confetti width={windowSize.width} height={windowSize.height} numberOfPieces={500} recycle={false} />}
      
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

          <motion.div 
            className="relative mt-auto mb-10"
            animate={{ scale: isWon ? 1.1 : 1, y: isWon ? 20 : 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          >
             <Cake candlesLit={candlesLit} />
          </motion.div>

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

// --- 6. MOUNT ---
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
