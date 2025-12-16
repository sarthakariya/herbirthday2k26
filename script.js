// --- GLOBALS ---
const { useState, useEffect, useRef, useCallback, useMemo } = React;
const { motion, AnimatePresence } = window.Motion;
const Confetti = window.ReactConfetti;

// --- ICONS ---
const MicIcon = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" x2="12" y1="19" y2="22"/>
  </svg>
);

const MusicIcon = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 18V5l12-2v13"/>
    <circle cx="6" cy="18" r="3"/>
    <circle cx="18" cy="16" r="3"/>
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
    
    // Create a quick "white noise" burst for a puff sound
    const bufferSize = ctx.sampleRate * 0.1; // 0.1 seconds
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, t); // Muffled sound
    filter.frequency.linearRampToValueAtTime(100, t + 0.1);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    gain.gain.setValueAtTime(0.4, t);
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
    // Classic "Happy Birthday" opening notes
    const melody = [
      { f: 261.63, d: 0.25 }, // Happy
      { f: 261.63, d: 0.25 }, // Birth
      { f: 293.66, d: 0.5 },  // Day
      { f: 261.63, d: 0.5 },  // To
      { f: 349.23, d: 0.5 },  // You
      { f: 329.63, d: 1.0 },  // (Pause)
      { f: 261.63, d: 0.25 }, // Happy
      { f: 261.63, d: 0.25 }, // Birth
      { f: 293.66, d: 0.5 },  // Day
      { f: 261.63, d: 0.5 },  // To
      { f: 392.00, d: 0.5 },  // You
      { f: 349.23, d: 1.0 },  // ...
    ];

    let t = now;
    melody.forEach(({ f, d }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle'; 
      osc.frequency.value = f;
      
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.05);
      gain.gain.setValueAtTime(0.15, t + d - 0.05);
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

      // Higher FFT size for better resolution
      analyser.fftSize = 2048;
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
        
        let sum = 0;
        // Blowing creates a lot of low-end noise. We focus on the lower spectrum.
        const lowFreqCount = Math.floor(dataArrayRef.current.length * 0.2); 
        for (let i = 0; i < lowFreqCount; i++) {
          sum += dataArrayRef.current[i];
        }
        const average = sum / lowFreqCount;

        // LOWER THRESHOLD = More sensitive
        const THRESHOLD = 35; 
        
        if (average > THRESHOLD) {
          setIsBlowing(true);
          // Intensity 0.0 to 1.0 based on how loud the blow is
          const calculatedIntensity = Math.min((average - THRESHOLD) / 60, 1);
          setIntensity(calculatedIntensity);
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
    if (sourceRef.current) sourceRef.current.disconnect();
    setIsBlowing(false);
  }, []);

  useEffect(() => {
    return () => stopAudio();
  }, [stopAudio]);

  return { isBlowing, intensity, startAudio, stopAudio };
};

// --- COMPONENTS ---

const RoomDecorations = () => {
  // Generate random balloons
  const balloons = useMemo(() => Array.from({ length: 8 }).map((_, i) => ({
    id: i,
    color: ['bg-red-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400', 'bg-purple-400'][i % 5],
    left: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 10 + Math.random() * 10
  })), []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Wall Color */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-50 to-pink-50 opacity-80"></div>
      
      {/* Bunting / Flags */}
      <div className="absolute top-0 left-0 w-full h-16 flex justify-between overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div 
            key={i} 
            className={`w-12 h-12 -mt-6 transform rotate-45 ${['bg-red-300', 'bg-blue-300', 'bg-yellow-300', 'bg-green-300'][i % 4]} rounded-sm shadow-sm`}
            style={{ marginLeft: -10 }}
          ></div>
        ))}
      </div>

      {/* Floating Balloons */}
      {balloons.map((b) => (
        <motion.div
          key={b.id}
          initial={{ y: '120vh', x: 0 }}
          animate={{ 
            y: '-20vh', 
            x: [0, 20, -20, 0] // Swaying motion
          }}
          transition={{ 
            y: { duration: b.duration, repeat: Infinity, ease: "linear", delay: b.delay },
            x: { duration: 5, repeat: Infinity, ease: "easeInOut" }
          }}
          className={`absolute bottom-0 w-16 h-20 rounded-t-full rounded-b-[50%] ${b.color} opacity-60 shadow-lg`}
          style={{ left: `${b.left}%` }}
        >
          {/* Balloon String */}
          <div className="absolute bottom-[-20px] left-1/2 w-[1px] h-6 bg-slate-400"></div>
        </motion.div>
      ))}
    </div>
  );
}

const Candle = ({ isLit, index }) => {
  const colors = [
    'bg-rose-400', 'bg-blue-400', 'bg-emerald-400', 'bg-violet-400', 'bg-amber-400'
  ];
  const stripeColors = [
    'bg-rose-200', 'bg-blue-200', 'bg-emerald-200', 'bg-violet-200', 'bg-amber-200'
  ];
  
  const color = colors[index % colors.length];
  const stripe = stripeColors[index % colors.length];

  return (
    <div className="flex flex-col items-center relative mx-[1px] mb-[-6px] z-50">
      {/* Flame Area */}
      <div className="h-8 w-4 relative flex justify-center items-end pb-1">
        {isLit && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [1, 1.2, 0.8, 1.1, 1], // Flicker scale
              opacity: [0.8, 1, 0.7, 1, 0.8], // Flicker brightness
              rotate: [-2, 2, -1, 1, 0], // Flicker movement
            }}
            transition={{
              duration: 0.3 + Math.random() * 0.2, // Randomize speed
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-3 h-5 bg-gradient-to-t from-orange-600 via-amber-400 to-yellow-100 rounded-[50%] rounded-t-[50%] shadow-[0_0_15px_3px_rgba(255,165,0,0.5)] origin-bottom"
          >
            {/* Inner blue flame */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full opacity-60 blur-[1px]"></div>
          </motion.div>
        )}
        
        {/* Smoke when extinguished */}
        {!isLit && (
           <motion.div 
             initial={{ opacity: 1, y: 0, scale: 1 }}
             animate={{ opacity: 0, y: -30, scale: 2 }}
             transition={{ duration: 1.5 }}
             className="absolute bottom-0 w-2 h-2 bg-gray-400 rounded-full blur-sm"
           />
        )}
      </div>

      {/* Candle Body */}
      <div className={`w-3 h-10 ${color} rounded-sm relative border border-black/10 shadow-sm overflow-hidden`}>
         {/* Stripes */}
         <div className={`absolute top-2 w-full h-1.5 ${stripe} -rotate-12 scale-110`}></div>
         <div className={`absolute top-5 w-full h-1.5 ${stripe} -rotate-12 scale-110`}></div>
         <div className={`absolute top-8 w-full h-1.5 ${stripe} -rotate-12 scale-110`}></div>
         {/* Wick */}
         <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-[1.5px] h-2 bg-black/70"></div>
      </div>
    </div>
  );
};

const Cake = ({ candlesLit }) => {
  return (
    <div className="relative flex flex-col items-center select-none mt-20 md:scale-125 transition-transform drop-shadow-2xl">
      
      {/* --- CANDLES --- */}
      {/* Positioned explicitly to sit ON TOP of the top layer */}
      <div className="absolute bottom-[230px] z-40 flex flex-wrap justify-center items-end w-[240px] gap-1 perspective-[100px]">
        {candlesLit.map((isLit, i) => (
          <Candle key={i} isLit={isLit} index={i} />
        ))}
      </div>

      {/* --- TOP LAYER (Pink + Piping) --- */}
      <div className="w-60 h-24 bg-pink-300 rounded-t-lg relative z-30 shadow-lg border-b border-pink-400/20 flex flex-col items-center">
        
        {/* Frosting Piping on Top Edge */}
        <div className="absolute -top-3 w-full flex justify-between px-1">
          {Array.from({length: 14}).map((_, i) => (
            <div key={i} className="w-5 h-5 bg-white rounded-full shadow-sm -ml-1 border-b-2 border-pink-100"></div>
          ))}
        </div>

        {/* Drips */}
        <div className="absolute top-0 w-full flex justify-around px-2 z-10">
             {[...Array(6)].map((_, i) => (
               <div key={i} className="w-6 h-10 bg-white/90 rounded-b-full shadow-sm" style={{height: 20 + Math.random() * 20 + 'px'}}></div>
             ))}
        </div>

        {/* Sprinkles */}
        <div className="w-full h-full overflow-hidden relative rounded-t-lg">
          {[...Array(30)].map((_, i) => (
             <div key={i} className="absolute w-1.5 h-1.5 rounded-full shadow-sm opacity-80" 
                  style={{ 
                    backgroundColor: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FFFFFF'][i % 4],
                    top: Math.random() * 80 + 10 + '%',
                    left: Math.random() * 90 + 5 + '%'
                  }}></div>
          ))}
        </div>
      </div>

      {/* --- MIDDLE LAYER (White/Cream + Ribbon) --- */}
      <div className="w-72 h-28 bg-yellow-50 relative z-20 shadow-md -mt-2 rounded-lg border-b border-yellow-100 flex items-center justify-center overflow-hidden">
        
        {/* Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-20"></div>
        
        {/* Ribbon */}
        <div className="w-full h-6 bg-purple-400 absolute top-1/2 -translate-y-1/2 shadow-sm border-y border-purple-500/20"></div>
        <div className="w-8 h-8 bg-purple-500 absolute top-1/2 -translate-y-1/2 rounded-full shadow-md border-2 border-purple-300"></div>
      </div>

      {/* --- BOTTOM LAYER (Chocolate + Texture) --- */}
      <div className="w-80 h-32 bg-[#5D4037] relative z-10 shadow-xl -mt-2 rounded-b-3xl rounded-t-lg flex flex-col items-center justify-center overflow-hidden">
         
         {/* Chocolate Texture */}
         <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]"></div>
         
         {/* Frosting Swirls (CSS) */}
         <div className="absolute bottom-0 w-full h-12 flex items-end opacity-20">
            {Array.from({length: 10}).map((_, i) => (
              <div key={i} className="w-10 h-10 rounded-full border-t-4 border-white/50 -mb-5 mx-auto"></div>
            ))}
         </div>

         <div className="relative z-10 text-center transform -rotate-2">
            <span className="block font-handwriting text-amber-100 text-4xl drop-shadow-lg leading-tight">Happy</span>
            <span className="block font-handwriting text-amber-100 text-4xl drop-shadow-lg leading-tight">Birthday</span>
         </div>
      </div>

      {/* --- PLATE --- */}
      <div className="w-[450px] h-6 bg-slate-100 rounded-[50%] mt-[-10px] shadow-[0_15px_30px_-5px_rgba(0,0,0,0.3)] relative z-0 border border-slate-200"></div>
    </div>
  );
};

// --- APP COMPONENT ---

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

        // Increased sensitivity: Blow out more candles per frame based on intensity
        const baseAmount = 1;
        const extraAmount = Math.ceil(intensity * 5); // Up to 5 extra candles at max intensity
        const candlesToOut = Math.min(litIndices.length, baseAmount + extraAmount);
        
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
      setTimeout(() => playWinTune(), 500); // Play music shortly after
    }
  }, [candlesLit, hasStarted, isWon, stopAudio]);

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-pink-50 font-sans selection:bg-pink-200">
      
      {/* Background Room Decorations */}
      <RoomDecorations />

      {/* Confetti Blast (Only on Win) */}
      {isWon && (
        <Confetti 
          width={windowSize.width} 
          height={windowSize.height} 
          numberOfPieces={800} 
          recycle={false} 
          gravity={0.2} 
        />
      )}

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen py-10">
        
        {/* Header Message */}
        <div className="text-center mb-4 min-h-[160px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {!hasStarted ? (
               <motion.div 
                 key="intro"
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-pink-100 max-w-sm mx-4"
               >
                 <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 text-pink-500">
                    <MusicIcon size={32} />
                 </div>
                 <h1 className="font-handwriting text-4xl text-pink-600 mb-2">Birthday Surprise!</h1>
                 <p className="text-slate-600 mb-6">A magical cake awaits. Enable your microphone to make a wish!</p>
                 <button 
                   onClick={handleStart}
                   className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-bold shadow-lg hover:shadow-pink-500/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                 >
                   <MicIcon size={20} /> Start
                 </button>
               </motion.div>
            ) : !isWon ? (
               <motion.div
                 key="blowing"
                 initial={{ scale: 0.8, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 exit={{ scale: 0.8, opacity: 0 }}
               >
                  <h2 className="font-bold text-3xl text-pink-500 tracking-wider animate-pulse mb-2">
                    BLOW ON THE SCREEN!
                  </h2>
                  <p className="text-pink-400 font-medium">Extinguish all candles 🎤🌬️</p>
               </motion.div>
            ) : (
               <motion.div
                 key="won"
                 initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                 animate={{ scale: 1, opacity: 1, rotate: 0 }}
                 transition={{ type: "spring", bounce: 0.6 }}
                 className="text-center"
               >
                 <h1 className="font-handwriting text-7xl md:text-9xl text-pink-600 mb-4 drop-shadow-xl stroke-white">
                   Happy Birthday!
                 </h1>
                 <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.5 }}
                   className="bg-white/90 backdrop-blur p-6 rounded-xl shadow-2xl border-2 border-pink-200 max-w-lg mx-auto"
                 >
                   <p className="text-xl md:text-2xl text-slate-700 italic">
                     "May your day be as sweet as this cake and filled with all the love you deserve! I love you! ❤️"
                   </p>
                 </motion.div>
               </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* The Cake */}
        <motion.div
          animate={{ 
            y: isWon ? 50 : 0,
            scale: isWon ? 1.05 : 1 
          }}
          transition={{ duration: 1.5, type: "spring" }}
          className="mt-8"
        >
          <Cake candlesLit={candlesLit} />
        </motion.div>

      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
