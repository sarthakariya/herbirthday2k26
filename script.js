// --- GLOBALS ---
const { useState, useEffect, useRef, useCallback, useMemo } = React;
const { motion, AnimatePresence } = window.Motion;
const Confetti = window.ReactConfetti;

// --- ICONS ---
const Icons = {
  Mic: ({ size = 24, className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" x2="12" y1="19" y2="22"/>
    </svg>
  ),
  Sparkles: ({ size = 24, className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/>
      <path d="M9 3v4"/>
      <path d="M3 7h6"/>
    </svg>
  )
};

// --- AUDIO SYSTEM ---
let audioCtx = null;
const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// High-quality "Whoosh" sound for extinguishing
const playExtinguishSound = () => {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    
    // Noise burst
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.15);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(t);
  } catch (e) { console.warn(e); }
};

// Elegant Orchestral Celebration
const playCelebration = () => {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    
    // A Major Chord arpeggio (A4, C#5, E5, A5)
    const notes = [440, 554.37, 659.25, 880];
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      const start = t + (i * 0.1);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.1, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 2.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 3);
    });
    
    // Add a bass note
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'sine';
    bass.frequency.value = 110; // A2
    bassGain.gain.setValueAtTime(0.2, t);
    bassGain.gain.exponentialRampToValueAtTime(0.001, t + 3);
    bass.connect(bassGain);
    bassGain.connect(ctx.destination);
    bass.start(t);
    bass.stop(t + 3);

  } catch (e) { console.warn(e); }
};

// --- HOOKS ---

const useBlowDetection = () => {
  const [isBlowing, setIsBlowing] = useState(false);
  const [intensity, setIntensity] = useState(0);
  const audioRef = useRef({ ctx: null, analyser: null, source: null, raf: null });

  const startListening = useCallback(async () => {
    if (audioRef.current.ctx) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = getAudioContext();
      const analyser = ctx.createAnalyser();
      const source = ctx.createMediaStreamSource(stream);
      
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4; // Smooth out jitter
      source.connect(analyser);
      
      audioRef.current = { ctx, analyser, source, stream };
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const detect = () => {
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate energy in low-frequency range (wind noise)
        // Bins 0-20 approx 0-800Hz
        let sum = 0;
        const bins = 40;
        for(let i=0; i<bins; i++) sum += dataArray[i];
        const avg = sum / bins;
        
        // Thresholds
        const TRIGGER = 45; 
        const MAX = 100;
        
        if (avg > TRIGGER) {
          setIsBlowing(true);
          setIntensity(Math.min((avg - TRIGGER) / (MAX - TRIGGER), 1));
        } else {
          setIsBlowing(false);
          setIntensity(0);
        }
        audioRef.current.raf = requestAnimationFrame(detect);
      };
      detect();
    } catch (e) {
      console.error("Mic Access Failed", e);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (audioRef.current.raf) cancelAnimationFrame(audioRef.current.raf);
    if (audioRef.current.source) audioRef.current.source.disconnect();
    // Don't close context to allow playing sounds later
    setIsBlowing(false);
  }, []);

  useEffect(() => () => stopListening(), [stopListening]);

  return { isBlowing, intensity, startListening, stopListening };
};

// --- DECORATIVE SUB-COMPONENTS ---

// Procedural Strawberry
const Strawberry = ({ className, style }) => (
  <div className={`relative w-6 h-8 ${className}`} style={style}>
    {/* Body */}
    <div className="absolute inset-0 bg-red-600 rounded-b-full rounded-t-xl shadow-inner overflow-hidden">
      {/* Gloss */}
      <div className="absolute top-1 left-1 w-full h-full bg-gradient-to-br from-white/30 to-transparent rounded-full transform scale-75 origin-top-left"></div>
      {/* Seeds */}
      {[...Array(10)].map((_, i) => (
        <div key={i} className="absolute w-[2px] h-[3px] bg-yellow-200/60 rounded-full"
          style={{ top: `${Math.random()*80 + 10}%`, left: `${Math.random()*80 + 10}%` }} />
      ))}
    </div>
    {/* Leaves */}
    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-4 flex justify-center">
      <div className="w-2 h-3 bg-green-600 rounded-full -rotate-45"></div>
      <div className="w-2 h-3 bg-green-500 rounded-full"></div>
      <div className="w-2 h-3 bg-green-600 rounded-full rotate-45"></div>
    </div>
  </div>
);

// Procedural Pearl/Gold Ball
const Pearl = ({ size = 10, color = "bg-yellow-200", className }) => (
  <div 
    className={`rounded-full shadow-md ${color} ${className}`} 
    style={{ 
      width: size, height: size,
      backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), transparent 60%)',
      boxShadow: '1px 1px 2px rgba(0,0,0,0.3)'
    }} 
  />
);

// --- MAIN COMPONENTS ---

const Background = () => {
  // Golden Bokeh Particles
  const particles = useMemo(() => Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 6 + 2,
    duration: Math.random() * 10 + 10,
    delay: Math.random() * 5
  })), []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#0f172a]">
      {/* Gradient Mesh Base */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#2a1b3d,transparent_90%)] opacity-60"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.4))]"></div>
      
      {/* Animated Particles */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-yellow-200 blur-[1px]"
          style={{ 
            left: `${p.x}%`, 
            width: p.size, 
            height: p.size,
            opacity: Math.random() * 0.3 + 0.1 
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0.2, 0.5, 0.2]
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear"
          }}
        />
      ))}
    </div>
  );
};

const Candle = ({ isLit, index }) => {
  const [smoke, setSmoke] = useState([]);

  // Trigger smoke when extinguished
  useEffect(() => {
    if (!isLit) {
      // Spawn 3 smoke particles
      const newSmoke = [1, 2, 3].map(i => ({ id: Date.now() + i, x: (Math.random()-0.5)*10 }));
      setSmoke(newSmoke);
    }
  }, [isLit]);

  // Elegant Color Palette for Candles (Pastel Metallics)
  const styles = [
    { body: 'bg-rose-300', stripe: 'bg-rose-100' },
    { body: 'bg-blue-300', stripe: 'bg-blue-100' },
    { body: 'bg-purple-300', stripe: 'bg-purple-100' },
    { body: 'bg-emerald-300', stripe: 'bg-emerald-100' },
    { body: 'bg-amber-300', stripe: 'bg-amber-100' },
  ];
  const style = styles[index % styles.length];

  return (
    <div className="relative flex flex-col items-center mx-[2px] mb-[-5px] z-50 group">
      {/* Flame & Wick Area */}
      <div className="h-10 w-6 relative flex justify-center items-end pb-0.5">
        
        {/* The Flame */}
        <AnimatePresence>
          {isLit && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute bottom-1"
            >
              {/* Core Flame with Glow */}
              <div className="relative w-4 h-6 animate-flicker origin-bottom">
                 <div className="absolute inset-0 bg-gradient-to-t from-orange-500 via-yellow-300 to-white rounded-[50%] rounded-t-[50%] blur-[1px] shadow-[0_0_20px_4px_rgba(255,180,0,0.6)]"></div>
                 {/* Blue base */}
                 <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full blur-[2px] opacity-80"></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Smoke Particles */}
        {smoke.map(s => (
          <motion.div
            key={s.id}
            className="absolute bottom-2 w-2 h-2 bg-gray-400 rounded-full blur-sm"
            initial={{ opacity: 0.6, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -50, x: s.x, scale: 3 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            onAnimationComplete={() => setSmoke([])}
          />
        ))}

        {/* The Wick */}
        <div className={`w-[2px] h-3 bg-black/60 ${isLit ? 'opacity-40' : 'opacity-90'} transition-opacity`}></div>
      </div>

      {/* Candle Stick */}
      <div className={`w-3.5 h-14 ${style.body} rounded-sm relative overflow-hidden shadow-[inset_-2px_0_5px_rgba(0,0,0,0.1),1px_1px_2px_rgba(0,0,0,0.2)]`}>
        {/* Diagonal Stripes (Texture) */}
        <div className={`absolute top-2 -left-1 w-[200%] h-1 ${style.stripe} -rotate-45 opacity-50`}></div>
        <div className={`absolute top-6 -left-1 w-[200%] h-1 ${style.stripe} -rotate-45 opacity-50`}></div>
        <div className={`absolute top-10 -left-1 w-[200%] h-1 ${style.stripe} -rotate-45 opacity-50`}></div>
        
        {/* Highlights for wax effect */}
        <div className="absolute top-0 left-0.5 w-[2px] h-full bg-white/30 blur-[0.5px]"></div>
      </div>
    </div>
  );
};

const Cake = ({ candlesLit }) => {
  return (
    <div className="relative mt-20 md:scale-125 transition-transform duration-700">
      
      {/* CANDLE ARRAY */}
      <div className="absolute bottom-[275px] left-1/2 -translate-x-1/2 z-40 flex flex-wrap justify-center items-end w-[280px] perspective-[500px]">
        {candlesLit.map((isLit, i) => (
          <Candle key={i} isLit={isLit} index={i} />
        ))}
      </div>

      {/* --- TOP LAYER (Strawberry Cream) --- */}
      <div className="relative z-30 flex flex-col items-center">
        {/* Cake Body */}
        <div className="w-64 h-24 bg-[#ffb7b2] rounded-t-xl relative shadow-[inset_-10px_0_20px_rgba(0,0,0,0.1),0_10px_20px_rgba(0,0,0,0.1)] overflow-visible">
          
          {/* Top Surface (Simulated 3D) */}
          <div className="absolute -top-4 left-0 w-full h-8 bg-[#ffc1bc] rounded-[50%] border-b border-white/20"></div>

          {/* Dripping Glaze */}
          <div className="absolute top-[-5px] w-full flex justify-center gap-1 px-2 filter drop-shadow-sm">
             {[...Array(9)].map((_, i) => (
               <div key={i} className="w-6 h-12 bg-[#ff9e99] rounded-b-full" style={{ height: 25 + Math.random() * 20 }}></div>
             ))}
          </div>

          {/* Decorations: Strawberries & Pearls */}
          <div className="absolute -top-6 w-full flex justify-around px-4 z-20">
             <Strawberry className="-rotate-12 scale-90" />
             <Pearl size={14} color="bg-white" className="mt-6" />
             <Strawberry className="rotate-6 scale-110 translate-y-2" />
             <Pearl size={16} color="bg-white" className="mt-5" />
             <Strawberry className="-rotate-6 scale-95" />
          </div>

          {/* Texture Details */}
          <div className="w-full h-full opacity-30 texture-sponge mix-blend-multiply"></div>
        </div>
      </div>

      {/* --- MIDDLE LAYER (Vanilla & Gold) --- */}
      <div className="relative z-20 flex flex-col items-center -mt-3">
        <div className="w-80 h-28 bg-[#fdf5e6] rounded-xl relative shadow-[inset_-10px_0_25px_rgba(0,0,0,0.1),0_10px_20px_rgba(0,0,0,0.15)] flex items-center justify-center">
           
           {/* Top Rim */}
           <div className="absolute -top-4 w-full h-8 bg-[#fffcf5] rounded-[50%] shadow-sm"></div>

           {/* Quilted Pattern using Gradients */}
           <div className="absolute inset-0 opacity-40 bg-[linear-gradient(45deg,transparent_48%,#e0d5b5_49%,#e0d5b5_51%,transparent_52%),linear-gradient(-45deg,transparent_48%,#e0d5b5_49%,#e0d5b5_51%,transparent_52%)] [background-size:20px_20px]"></div>

           {/* Gold Pearls at intersections */}
           <div className="absolute inset-0 flex flex-wrap content-center justify-center gap-6 opacity-80 px-4 py-6">
              {[...Array(12)].map((_,i) => <Pearl key={i} size={6} color="bg-yellow-400" />)}
           </div>

           {/* Center Ribbon */}
           <div className="absolute w-full h-8 bg-purple-100/30 backdrop-blur-sm border-y border-purple-200/50 shadow-sm top-1/2 -translate-y-1/2 flex items-center justify-center overflow-hidden">
              <div className="w-full h-[1px] bg-purple-300"></div>
           </div>
        </div>
      </div>

      {/* --- BOTTOM LAYER (Rich Chocolate) --- */}
      <div className="relative z-10 flex flex-col items-center -mt-3">
        <div className="w-96 h-36 bg-[#3e2723] rounded-b-3xl rounded-t-xl relative shadow-[inset_-15px_0_30px_rgba(0,0,0,0.4),0_20px_40px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center overflow-hidden">
           
           {/* Top Rim */}
           <div className="absolute -top-4 w-full h-8 bg-[#4e342e] rounded-[50%] shadow-sm border-b border-white/5"></div>

           {/* Texture */}
           <div className="absolute inset-0 texture-noise mix-blend-overlay opacity-30"></div>
           
           {/* Elegant Gold Writing */}
           <div className="relative z-10 text-center transform -rotate-2 mix-blend-screen">
              <h1 className="font-handwriting text-5xl text-[#ffd700] drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] opacity-90 leading-tight">Happy</h1>
              <h1 className="font-handwriting text-6xl text-[#ffd700] drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] opacity-90 leading-tight mt-[-10px]">Birthday</h1>
           </div>

           {/* Bottom Piping */}
           <div className="absolute bottom-0 w-full flex justify-center gap-1 opacity-90">
             {[...Array(18)].map((_, i) => (
               <div key={i} className="w-6 h-6 bg-[#5d4037] rounded-full shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.3)] -mb-3"></div>
             ))}
           </div>
        </div>
      </div>

      {/* --- LUXURY PLATE --- */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[500px] h-12 bg-gray-100 rounded-[50%] z-0 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_-5px_10px_rgba(0,0,0,0.1)] border border-gray-300/50">
        <div className="absolute inset-2 border border-yellow-400/30 rounded-[50%]"></div>
      </div>

    </div>
  );
};

// --- APP ---

const App = () => {
  const TOTAL_CANDLES = 17;
  const [hasStarted, setHasStarted] = useState(false);
  const [candlesLit, setCandlesLit] = useState(Array(TOTAL_CANDLES).fill(true));
  const [isWon, setIsWon] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  const { isBlowing, intensity, startListening, stopListening } = useBlowDetection();

  useEffect(() => {
    const r = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);

  const handleStart = async () => {
    await startListening();
    setHasStarted(true);
  };

  // Candle Extinguishing Logic
  const prevLitCount = useRef(TOTAL_CANDLES);
  useEffect(() => {
    const currentLitCount = candlesLit.filter(c => c).length;
    if (currentLitCount < prevLitCount.current) {
      playExtinguishSound(); // WHOOSH sound
      prevLitCount.current = currentLitCount;
    }
  }, [candlesLit]);

  // Blowing Physics
  useEffect(() => {
    if (!hasStarted || isWon) return;

    if (isBlowing) {
      setCandlesLit((prev) => {
        const litIndices = prev.map((lit, i) => lit ? i : -1).filter(i => i !== -1);
        if (litIndices.length === 0) return prev;

        // "Cluster" extinguishing: if you blow hard, adjacent candles go out
        const amount = Math.ceil(intensity * 4); 
        const newCandles = [...prev];
        
        for (let i = 0; i < amount; i++) {
          if (litIndices.length === 0) break;
          const r = Math.floor(Math.random() * litIndices.length);
          const idx = litIndices[r];
          newCandles[idx] = false;
          litIndices.splice(r, 1);
        }
        return newCandles;
      });
    }
  }, [isBlowing, intensity, hasStarted, isWon]);

  // Win Logic
  useEffect(() => {
    if (hasStarted && !isWon && candlesLit.every(lit => !lit)) {
      setIsWon(true);
      stopListening();
      setTimeout(() => playCelebration(), 500);
    }
  }, [candlesLit, hasStarted, isWon, stopListening]);

  return (
    <div className="min-h-screen w-full relative overflow-hidden text-slate-100 font-sans selection:bg-pink-500/30">
      
      <Background />

      {isWon && (
        <Confetti 
          width={windowSize.width} 
          height={windowSize.height} 
          numberOfPieces={1000} 
          recycle={false} 
          colors={['#FFC107', '#FF4081', '#E040FB', '#7C4DFF', '#536DFE']}
        />
      )}

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen pb-20">
        
        {/* UI Container */}
        <div className="absolute top-10 w-full max-w-2xl px-4 text-center z-50">
           <AnimatePresence mode="wait">
             
             {!hasStarted ? (
               <motion.div 
                  key="start"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel p-8 rounded-2xl shadow-2xl flex flex-col items-center"
               >
                 <div className="w-20 h-20 bg-gradient-to-tr from-pink-400 to-purple-500 rounded-full flex items-center justify-center mb-6 shadow-lg animate-pulse">
                    <Icons.Sparkles size={40} className="text-white" />
                 </div>
                 <h1 className="text-4xl font-bold text-slate-800 mb-2">A Special Surprise</h1>
                 <p className="text-slate-600 mb-8 text-lg">For the most classy birthday celebration. <br/> Please enable your microphone.</p>
                 <button 
                   onClick={handleStart}
                   className="group px-10 py-4 bg-slate-900 text-white rounded-full font-semibold text-lg shadow-xl hover:bg-slate-800 transition-all flex items-center gap-3 active:scale-95"
                 >
                   <Icons.Mic size={20} className="group-hover:text-pink-400 transition-colors" /> 
                   Begin the Experience
                 </button>
               </motion.div>
             ) : !isWon ? (
                <motion.div 
                   key="playing"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="glass-panel px-8 py-4 rounded-full inline-block"
                >
                   <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 tracking-wider">
                     BLOW OUT THE CANDLES 🌬️
                   </h2>
                </motion.div>
             ) : (
                <motion.div
                  key="won"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", duration: 1.5 }}
                  className="glass-panel p-10 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] border-2 border-yellow-200/50"
                >
                  <h1 className="font-handwriting text-8xl gold-text drop-shadow-sm mb-6">
                    Happy Birthday!
                  </h1>
                  <p className="text-2xl text-slate-700 italic font-serif leading-relaxed">
                    "May your year be as exquisite as this cake and as bright as the candles you just blew out. <br/> I love you deeply."
                  </p>
                </motion.div>
             )}

           </AnimatePresence>
        </div>

        {/* CAKE RENDER */}
        <motion.div
           animate={{ 
             y: isWon ? 100 : 0, 
             scale: isWon ? 1.05 : 1
           }}
           transition={{ duration: 1.5, ease: "anticipate" }}
        >
          <Cake candlesLit={candlesLit} />
        </motion.div>

      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
