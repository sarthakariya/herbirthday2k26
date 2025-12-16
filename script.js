// --- GLOBALS ---
const { useState, useEffect, useRef, useCallback, useMemo } = React;
const { motion, AnimatePresence } = window.Motion;
const Confetti = window.ReactConfetti;

// --- UTILS ---
const randomRange = (min, max) => Math.random() * (max - min) + min;

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

const playExtinguishSound = () => {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    
    // Low frequency "puff"
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  } catch (e) { console.warn(e); }
};

const playCelebration = () => {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    
    // Majestic Chord (C Major 7 + 9)
    const freqs = [261.63, 329.63, 392.00, 493.88, 523.25, 587.33];
    
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      
      const start = t + (i * 0.05);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 5);
    });
  } catch (e) { console.warn(e); }
};

// --- MICROPHONE HOOK (LESS SENSITIVE) ---
const useBlowDetection = () => {
  const [isBlowing, setIsBlowing] = useState(false);
  const audioRef = useRef({ ctx: null, analyser: null, source: null, raf: null });
  const [blowHistory, setBlowHistory] = useState([]);

  const startListening = useCallback(async () => {
    if (audioRef.current.ctx) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false 
        } 
      });
      const ctx = getAudioContext();
      const analyser = ctx.createAnalyser();
      const source = ctx.createMediaStreamSource(stream);
      
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      
      audioRef.current = { ctx, analyser, source, stream };
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const detect = () => {
        analyser.getByteFrequencyData(dataArray);
        
        // Analyze lower frequencies (wind noise is mostly < 500Hz)
        let sum = 0;
        const binsToCheck = 20; // Lower bins
        for(let i=0; i<binsToCheck; i++) sum += dataArray[i];
        const avg = sum / binsToCheck;
        
        // HIGHER THRESHOLD for "Less Sensitive"
        // Normal talking is usually 20-40 avg. Blowing directly is 80+.
        const THRESHOLD = 65; 
        
        if (avg > THRESHOLD) {
          setIsBlowing(true);
        } else {
          setIsBlowing(false);
        }
        audioRef.current.raf = requestAnimationFrame(detect);
      };
      detect();
    } catch (e) {
      console.error("Mic Error", e);
      alert("Microphone access needed for the magic!");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (audioRef.current.raf) cancelAnimationFrame(audioRef.current.raf);
    if (audioRef.current.stream) audioRef.current.stream.getTracks().forEach(t => t.stop());
    setIsBlowing(false);
  }, []);

  useEffect(() => () => stopListening(), [stopListening]);

  return { isBlowing, startListening, stopListening };
};

// --- HIGH FIDELITY PARTICLE ENGINE (CANVAS) ---
// This handles thousands of decorations without killing the DOM
const DecorationsCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    let balloons = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Particle Classes
    class Sparkle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2;
        this.speedY = Math.random() * 0.5 - 0.2;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.life = Math.random() * 100 + 50;
        this.opacity = 0;
        this.maxOpacity = Math.random() * 0.7 + 0.3;
        this.color = `hsl(${Math.random() * 60 + 30}, 100%, 70%)`; // Gold/Yellow
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life--;
        
        // Fade in/out
        if (this.life > 50) {
          if (this.opacity < this.maxOpacity) this.opacity += 0.01;
        } else {
          this.opacity -= 0.01;
        }

        if (this.life <= 0 || this.opacity < 0) this.reset();
      }
      draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.opacity;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    class Balloon {
      constructor() {
        this.reset(true);
      }
      reset(initial = false) {
        this.x = Math.random() * canvas.width;
        this.y = initial ? Math.random() * canvas.height : canvas.height + 100;
        this.r = Math.random() * 20 + 15; // Radius
        this.speed = Math.random() * 1 + 0.5;
        this.sway = Math.random() * 20 + 10;
        this.swaySpeed = Math.random() * 0.02 + 0.01;
        this.offset = Math.random() * 1000;
        this.color = `hsl(${Math.random() * 360}, 70%, 60%)`;
        this.stringLen = Math.random() * 40 + 20;
      }
      update(time) {
        this.y -= this.speed;
        this.x += Math.sin(time * this.swaySpeed + this.offset) * 0.5;
        if (this.y < -150) this.reset();
      }
      draw() {
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = this.color;
        
        // Balloon Body
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.r, this.r * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x - this.r*0.3, this.y - this.r*0.3, this.r/3, this.r/1.5, -0.5, 0, Math.PI*2);
        ctx.fill();

        // String
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.r * 1.2);
        ctx.quadraticCurveTo(
          this.x + Math.sin(Date.now() * 0.005) * 10, 
          this.y + this.r * 1.2 + this.stringLen / 2,
          this.x, 
          this.y + this.r * 1.2 + this.stringLen
        );
        ctx.stroke();
      }
    }

    // Initialize "thousands" (simulated by dense fast particles)
    for(let i=0; i<150; i++) particles.push(new Sparkle());
    for(let i=0; i<30; i++) balloons.push(new Balloon());

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const time = Date.now();

      // Draw Particles (Dust/Magic)
      particles.forEach(p => {
        p.update();
        p.draw();
      });

      // Draw Balloons (Foreground & Background)
      balloons.forEach(b => {
        b.update(time);
        b.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

// --- CAKE COMPONENTS ---

const Candle = ({ isLit, index }) => {
  return (
    <div className="relative flex flex-col items-center mx-1 -mb-2 z-50 transition-all duration-300 transform">
      {/* Flame */}
      <div className="h-8 w-4 relative flex justify-center items-end">
        {isLit ? (
          <div className="w-4 h-6 animate-flicker origin-bottom relative">
            <div className="absolute inset-0 bg-gradient-to-t from-orange-500 via-yellow-400 to-white rounded-full blur-[2px] shadow-[0_0_20px_5px_rgba(255,165,0,0.6)]"></div>
          </div>
        ) : (
          // Smoke puff when out
          <motion.div 
            initial={{ opacity: 1, y: 0 }} 
            animate={{ opacity: 0, y: -40 }} 
            transition={{ duration: 2 }}
            className="w-1 h-1 bg-gray-400 rounded-full blur-sm"
          />
        )}
        <div className="absolute bottom-0 w-[2px] h-2 bg-black opacity-50"></div>
      </div>

      {/* Wax */}
      <div 
        className="w-3 h-12 rounded-sm shadow-[inset_-3px_0_4px_rgba(0,0,0,0.2)] bg-gradient-to-r from-pink-300 via-pink-400 to-pink-300"
        style={{
          background: `linear-gradient(90deg, 
            ${['#ff9a9e', '#a18cd1', '#fad0c4'][index % 3]} 0%, 
            rgba(255,255,255,0.4) 50%, 
            ${['#ff9a9e', '#a18cd1', '#fad0c4'][index % 3]} 100%)`
        }}
      ></div>
    </div>
  );
};

const Cake = ({ candlesLit }) => {
  return (
    <div className="relative md:scale-125 transition-transform duration-700 select-none">
      
      {/* --- CANDLES --- */}
      <div className="absolute bottom-[230px] left-1/2 -translate-x-1/2 z-40 flex flex-wrap justify-center items-end w-[260px] perspective-[100px]">
        {candlesLit.map((isLit, i) => (
          <Candle key={i} isLit={isLit} index={i} />
        ))}
      </div>

      {/* --- TOP TIER (27th Feb) --- */}
      <div className="relative z-30 flex flex-col items-center">
        <div className="w-56 h-20 bg-[#fff0f5] rounded-t-xl relative shadow-[inset_-5px_-5px_20px_rgba(0,0,0,0.1),0_10px_20px_rgba(0,0,0,0.2)] overflow-visible">
          {/* Top Surface */}
          <div className="absolute -top-5 left-0 w-full h-10 bg-[#fff5f8] rounded-[50%] border-b border-white/50 shadow-sm"></div>
          
          {/* Dripping Chocolate */}
          <div className="absolute -top-1 w-full flex justify-center gap-2 px-1">
             {[...Array(8)].map((_, i) => (
               <div key={i} className="w-6 h-10 bg-[#5d4037] rounded-b-full shadow-lg border-t border-[#795548]" style={{ height: 20 + Math.random() * 25 }}></div>
             ))}
          </div>

          <div className="absolute top-4 w-full text-center">
            <span className="font-handwriting text-rose-400 text-xl opacity-80 rotate-[-5deg] block">27th Feb</span>
          </div>
        </div>
      </div>

      {/* --- MIDDLE TIER (Reechita) --- */}
      <div className="relative z-20 flex flex-col items-center -mt-4">
        <div className="w-72 h-28 bg-[#f8bbd0] rounded-xl relative shadow-[inset_-10px_0_30px_rgba(0,0,0,0.15),0_15px_30px_rgba(0,0,0,0.2)] flex items-center justify-center">
           {/* Top Rim */}
           <div className="absolute -top-5 w-full h-10 bg-[#fce4ec] rounded-[50%] shadow-sm"></div>
           
           {/* NAME PLATE */}
           <div className="relative z-10 bg-white/30 backdrop-blur-sm px-6 py-2 rounded-full border border-white/40 shadow-lg transform rotate-[-2deg]">
             <h1 className="font-handwriting text-4xl icing-text tracking-wide text-pink-600">Reechita</h1>
           </div>

           {/* Decorative Pearls */}
           <div className="absolute bottom-2 w-full flex justify-between px-6">
              {[...Array(6)].map((_,i) => (
                <div key={i} className="w-3 h-3 rounded-full bg-yellow-200 shadow-md"></div>
              ))}
           </div>
        </div>
      </div>

      {/* --- BOTTOM TIER (Happy Birthday) --- */}
      <div className="relative z-10 flex flex-col items-center -mt-4">
        <div className="w-80 md:w-96 h-36 bg-[#880e4f] rounded-b-3xl rounded-t-xl relative shadow-[inset_-20px_0_50px_rgba(0,0,0,0.4),0_20px_50px_rgba(0,0,0,0.4)] flex flex-col items-center justify-center">
           {/* Top Rim */}
           <div className="absolute -top-5 w-full h-10 bg-[#ad1457] rounded-[50%] shadow-md border-b border-white/10"></div>
           
           {/* Text */}
           <div className="relative z-10 text-center mt-2">
              <span className="block font-serif text-amber-100 text-3xl tracking-[0.2em] uppercase opacity-90 drop-shadow-md">Happy</span>
              <span className="block font-serif text-amber-100 text-3xl tracking-[0.2em] uppercase opacity-90 drop-shadow-md">Birthday</span>
           </div>

           {/* Bottom Frills */}
           <div className="absolute bottom-0 w-full flex justify-center gap-1 opacity-100">
             {[...Array(20)].map((_, i) => (
               <div key={i} className="w-5 h-5 bg-white rounded-full shadow-[0_-2px_5px_rgba(0,0,0,0.1)] -mb-2.5"></div>
             ))}
           </div>
        </div>
      </div>

      {/* --- PLATE --- */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[110%] h-12 bg-white rounded-[50%] z-0 shadow-[0_20px_60px_rgba(0,0,0,0.6)] border-4 border-gray-200"></div>

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
  
  const { isBlowing, startListening, stopListening } = useBlowDetection();

  // Resize handler
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle Start
  const handleStart = async () => {
    await startListening();
    setHasStarted(true);
  };

  // Candle Audio Effect
  const prevLitCount = useRef(TOTAL_CANDLES);
  useEffect(() => {
    const currentLitCount = candlesLit.filter(c => c).length;
    if (currentLitCount < prevLitCount.current) {
      playExtinguishSound();
      prevLitCount.current = currentLitCount;
    }
  }, [candlesLit]);

  // Blowing Logic (Refined for "Less Sensitive" + Cluster)
  useEffect(() => {
    if (!hasStarted || isWon) return;

    if (isBlowing) {
      setCandlesLit((prev) => {
        const litIndices = prev.map((lit, i) => lit ? i : -1).filter(i => i !== -1);
        if (litIndices.length === 0) return prev;

        // If blowing is detected (passed threshold), blow out 1-2 random candles
        const amount = Math.floor(Math.random() * 2) + 1; 
        
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
  }, [isBlowing, hasStarted, isWon]);

  // Win Condition
  useEffect(() => {
    if (hasStarted && !isWon && candlesLit.every(lit => !lit)) {
      setIsWon(true);
      stopListening();
      setTimeout(() => playCelebration(), 500);
    }
  }, [candlesLit, hasStarted, isWon, stopListening]);

  return (
    <div className="min-h-screen w-full relative text-slate-100 font-sans overflow-hidden">
      
      {/* 1. High Fidelity Background (Canvas) */}
      <DecorationsCanvas />

      {/* 2. Confetti on Win */}
      {isWon && (
        <Confetti 
          width={windowSize.width} 
          height={windowSize.height} 
          numberOfPieces={500} 
          recycle={true} 
          gravity={0.15}
        />
      )}

      {/* 3. Main Content Layer */}
      <div className="relative z-10 flex flex-col items-center min-h-screen">
        
        {/* Floating Headers */}
        <div className="mt-12 md:mt-8 px-4 text-center z-50 w-full max-w-lg">
           <AnimatePresence mode="wait">
             
             {!hasStarted ? (
               <motion.div 
                  key="start"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel p-8 rounded-3xl"
               >
                 <div className="mb-4 flex justify-center">
                   <div className="p-4 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full shadow-lg animate-pulse">
                     <Icons.Sparkles size={32} />
                   </div>
                 </div>
                 <h1 className="text-3xl font-bold text-white mb-2 font-handwriting">For Reechita ❤️</h1>
                 <p className="text-pink-100 mb-6 text-sm md:text-base">
                   A magical cake for a magical person. <br/>
                   Enable microphone to make a wish.
                 </p>
                 <button 
                   onClick={handleStart}
                   className="w-full py-4 bg-white text-pink-600 rounded-xl font-bold text-lg shadow-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                 >
                   <Icons.Mic size={24} /> Make a Wish
                 </button>
               </motion.div>
             ) : !isWon ? (
                <motion.div 
                   key="blowing"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="glass-panel px-6 py-3 rounded-full inline-block"
                >
                   <h2 className="text-lg md:text-xl font-bold text-white tracking-widest animate-pulse">
                     BLOW THE CANDLES! 🌬️
                   </h2>
                </motion.div>
             ) : (
                <motion.div
                  key="won"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="glass-panel p-8 rounded-3xl border-2 border-yellow-300/30"
                >
                  <h1 className="font-handwriting text-5xl md:text-7xl gold-text mb-4 drop-shadow-2xl">
                    Happy Birthday!
                  </h1>
                  <p className="text-lg text-pink-50 italic">
                    "To Reechita, <br/> May your life be as sweet as this cake and filled with endless love. I love you!"
                  </p>
                </motion.div>
             )}

           </AnimatePresence>
        </div>

        {/* 4. The 3D Cake */}
        <motion.div
           className="mt-auto mb-20 md:mb-32"
           animate={{ 
             y: isWon ? 50 : 0, 
             scale: isWon ? 1.1 : 1
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
