// --- GLOBALS ---
const { useState, useEffect, useRef, useCallback } = React;
const { motion, AnimatePresence } = window.Motion;
const Confetti = window.ReactConfetti;

// --- ICONS (Inlined to avoid loading errors) ---
const SparklesIcon = ({ size = 24, className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
  </svg>
);

const MicIcon = ({ size = 24, className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" x2="12" y1="19" y2="22"/>
  </svg>
);

// --- AUDIO LOGIC ---
let audioCtx = null;
const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
};

const playPuffSound = () => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Noise buffer for "puff" sound
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    
    noise.start(t);
  } catch (e) {
    console.warn("Audio error", e);
  }
};

const playWinTune = () => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    // "Happy Birthday to You" notes (simplified)
    const melody = [
      { f: 261.63, d: 0.25 }, // C4
      { f: 261.63, d: 0.25 }, // C4
      { f: 293.66, d: 0.5 },  // D4
      { f: 261.63, d: 0.5 },  // C4
      { f: 349.23, d: 0.5 },  // F4
      { f: 329.63, d: 1.0 },  // E4
    ];

    let t = now;
    melody.forEach(({ f, d }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle'; // Softer sound
      osc.frequency.value = f;
      
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.linearRampToValueAtTime(0.1, t + d - 0.05);
      gain.gain.linearRampToValueAtTime(0, t + d);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(t);
      osc.stop(t + d);
      t += d;
    });
  } catch (e) {
    console.warn("Audio error", e);
  }
};

// --- HOOK: Microphone ---
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
      const audioContext = getAudioContext();
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
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        
        // Calculate average volume (amplitude)
        let sum = 0;
        // Focus on lower frequencies where breath wind noise usually is
        const lowFreqCount = Math.floor(dataArrayRef.current.length / 3);
        for (let i = 0; i < lowFreqCount; i++) {
          sum += dataArrayRef.current[i];
        }
        const average = sum / lowFreqCount;

        // Threshold for "blowing"
        const THRESHOLD = 50; 
        
        if (average > THRESHOLD) {
          setIsBlowing(true);
          // Map intensity 0-1 based on volume
          setIntensity(Math.min((average - THRESHOLD) / 100, 1));
        } else {
          setIsBlowing(false);
          setIntensity(0);
        }

        rafIdRef.current = requestAnimationFrame(checkAudio);
      };
      checkAudio();
    } catch (error) {
      console.error("Mic Error:", error);
      alert("Please enable microphone access to play!");
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    if (sourceRef.current) {
        // Just disconnect, don't close context so we can play sound effects
        sourceRef.current.disconnect();
    }
    setIsBlowing(false);
  }, []);

  useEffect(() => {
    return () => stopAudio();
  }, [stopAudio]);

  return { isBlowing, intensity, startAudio, stopAudio };
};

// --- COMPONENTS ---

const Candle = ({ isLit, index }) => {
  // Pastel candle colors
  const colors = [
    'bg-red-300', 'bg-orange-300', 'bg-amber-300', 
    'bg-yellow-300', 'bg-lime-300', 'bg-green-300', 
    'bg-teal-300', 'bg-cyan-300', 'bg-sky-300', 
    'bg-blue-300', 'bg-indigo-300', 'bg-violet-300', 
    'bg-purple-300', 'bg-fuchsia-300', 'bg-pink-300', 'bg-rose-300'
  ];
  const color = colors[index % colors.length];

  return (
    <div className="flex flex-col items-center relative mx-[2px] mb-[-4px] z-10">
      {/* Flame */}
      <div className="h-6 w-4 relative flex justify-center items-end">
        {isLit && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ 
              scale: [1, 1.2, 0.9, 1.1, 1],
              rotate: [-5, 5, -2, 2, 0],
              opacity: [0.9, 1, 0.8, 1],
            }}
            transition={{
              duration: 0.4 + Math.random() * 0.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-3 h-5 bg-gradient-to-t from-orange-500 via-yellow-400 to-white rounded-full shadow-[0_0_10px_2px_rgba(255,165,0,0.6)] origin-bottom"
          >
          </motion.div>
        )}
        {!isLit && (
           <motion.div 
             initial={{ opacity: 1, y: 0 }}
             animate={{ opacity: 0, y: -20 }}
             transition={{ duration: 1 }}
             className="absolute bottom-0 text-gray-400 font-bold text-xs"
           >
             ~
           </motion.div>
        )}
      </div>

      {/* Wax */}
      <div className={`w-2.5 h-10 ${color} rounded-sm relative border border-black/5 shadow-inner`}>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-[1px] h-1.5 bg-black/50"></div>
          {/* Stripes */}
          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.3)_4px,rgba(255,255,255,0.3)_6px)]"></div>
      </div>
    </div>
  );
};

const Cake = ({ candlesLit }) => {
  return (
    <div className="relative flex flex-col items-center select-none mt-20 md:scale-125 transition-transform">
      
      {/* 17 Candles placed on top */}
      <div className="absolute bottom-[205px] z-30 flex flex-wrap justify-center w-[220px] px-2">
        {candlesLit.map((isLit, i) => (
          <Candle key={i} isLit={isLit} index={i} />
        ))}
      </div>

      {/* TOP LAYER (Pink) */}
      <div className="w-56 h-20 bg-pink-300 rounded-t-2xl relative z-20 shadow-lg border-b-4 border-pink-400/30 flex items-center justify-center">
        {/* Frosting drips */}
        <div className="absolute -top-1 w-full flex justify-center gap-1">
             {[...Array(7)].map((_, i) => (
               <div key={i} className="w-8 h-6 bg-pink-300 rounded-b-full shadow-sm"></div>
             ))}
        </div>
        {/* Sprinkles */}
        {[...Array(15)].map((_, i) => (
           <div key={i} className="absolute w-1.5 h-1.5 rounded-full" 
                style={{ 
                  backgroundColor: ['#fff', '#ff0', '#0ff'][i%3],
                  top: Math.random() * 60 + 20 + '%',
                  left: Math.random() * 80 + 10 + '%'
                }}></div>
        ))}
      </div>

      {/* MIDDLE LAYER (White/Cream) */}
      <div className="w-72 h-24 bg-yellow-50 relative z-10 shadow-md -mt-1 rounded-lg border-b-4 border-yellow-100 flex items-center justify-center">
        {/* Filling Line */}
        <div className="w-full h-2 bg-pink-200/50 absolute top-1/2"></div>
        {/* Decorative dots */}
        <div className="absolute w-full flex justify-between px-4">
           {[...Array(6)].map((_, i) => (
             <div key={i} className="w-3 h-3 bg-pink-400 rounded-full opacity-60"></div>
           ))}
        </div>
      </div>

      {/* BOTTOM LAYER (Chocolate) */}
      <div className="w-80 h-28 bg-amber-700 relative z-0 shadow-xl -mt-1 rounded-b-2xl flex flex-col items-center justify-center">
         <div className="absolute inset-0 bg-gradient-to-r from-amber-800 to-amber-700 rounded-b-2xl"></div>
         <span className="relative z-10 font-handwriting text-amber-100 text-3xl opacity-80 rotate-[-2deg]">Happy Birthday</span>
      </div>

      {/* PLATE */}
      <div className="w-96 h-4 bg-slate-200 rounded-[50%] mt-1 shadow-2xl relative z-[-1] border border-slate-300"></div>
    </div>
  );
};

const App = () => {
  const TOTAL_CANDLES = 17;
  const [hasStarted, setHasStarted] = useState(false);
  const [candlesLit, setCandlesLit] = useState(Array(TOTAL_CANDLES).fill(true));
  const [isWon, setIsWon] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  const { isBlowing, intensity, startAudio, stopAudio } = useBlowDetection();

  // Resize handler for confetti
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle start button
  const handleStart = async () => {
    // Resume audio context on user gesture
    getAudioContext().resume();
    await startAudio();
    setHasStarted(true);
  };

  // Sound effect when candle goes out
  const prevLitCount = useRef(TOTAL_CANDLES);
  useEffect(() => {
    const currentLitCount = candlesLit.filter(c => c).length;
    if (currentLitCount < prevLitCount.current) {
      playPuffSound();
      prevLitCount.current = currentLitCount;
    }
  }, [candlesLit]);

  // Blowing logic
  useEffect(() => {
    if (!hasStarted || isWon) return;

    if (isBlowing) {
      setCandlesLit((prev) => {
        const litIndices = prev.map((lit, i) => lit ? i : -1).filter(i => i !== -1);
        if (litIndices.length === 0) return prev;

        // The harder you blow (intensity), the more candles go out
        const candlesToOut = Math.max(1, Math.ceil(intensity * 3)); 
        const newCandles = [...prev];
        
        for (let i = 0; i < candlesToOut; i++) {
          if (litIndices.length === 0) break;
          // Random candle goes out
          const r = Math.floor(Math.random() * litIndices.length);
          const idx = litIndices[r];
          newCandles[idx] = false;
          litIndices.splice(r, 1);
        }
        return newCandles;
      });
    }
  }, [isBlowing, intensity, hasStarted, isWon]);

  // Win condition
  useEffect(() => {
    if (hasStarted && !isWon && candlesLit.every(lit => !lit)) {
      setIsWon(true);
      stopAudio(); // Stop mic
      setTimeout(() => playWinTune(), 600); // Play music
    }
  }, [candlesLit, hasStarted, isWon, stopAudio]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-pink-50 overflow-hidden relative selection:bg-pink-200">
      
      {/* Confetti when Won */}
      {isWon && <Confetti width={windowSize.width} height={windowSize.height} numberOfPieces={400} recycle={false} />}

      {/* Title / Message */}
      <div className="absolute top-10 w-full text-center px-4 z-40">
        <AnimatePresence mode="wait">
          {!hasStarted ? (
             <motion.h1 
               key="intro"
               initial={{ opacity: 0, y: -20 }}
               animate={{ opacity: 1, y: 0 }}
               className="font-handwriting text-5xl md:text-6xl text-pink-600 drop-shadow-sm"
             >
               Make a Wish...
             </motion.h1>
          ) : !isWon ? (
             <motion.h2
               key="blowing"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="font-bold text-2xl text-pink-400 uppercase tracking-widest"
             >
               Blow on your screen! 🎤💨
             </motion.h2>
          ) : (
             <motion.div
               key="won"
               initial={{ scale: 0.5, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               transition={{ type: "spring", bounce: 0.5 }}
             >
               <h1 className="font-handwriting text-6xl md:text-8xl text-pink-600 mb-4 drop-shadow-md">
                 Happy Birthday!
               </h1>
               <p className="text-slate-600 text-lg md:text-xl max-w-lg mx-auto bg-white/80 p-4 rounded-xl shadow-sm border border-pink-100">
                 "May your day be as sweet as this cake and filled with all the love you deserve! I love you! ❤️"
               </p>
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Start Button Overlay */}
      {!hasStarted && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="absolute z-50 inset-0 flex items-center justify-center bg-white/30 backdrop-blur-sm"
        >
          <button 
            onClick={handleStart}
            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full font-bold text-xl shadow-xl hover:scale-105 transition-transform active:scale-95"
          >
            <MicIcon /> Click to Start & Allow Mic
          </button>
        </motion.div>
      )}

      {/* CAKE CONTAINER */}
      <motion.div
        animate={{ 
          y: isWon ? 40 : 0,
          scale: isWon ? 1.1 : 1 
        }}
        transition={{ duration: 1 }}
        className="mt-20"
      >
        <Cake candlesLit={candlesLit} />
      </motion.div>

    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
