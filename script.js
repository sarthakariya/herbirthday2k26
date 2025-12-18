// --- LIBRARIES ---
const { useState, useEffect, useRef, useCallback, useMemo } = React;
const { motion, AnimatePresence } = window.Motion;
const Confetti = window.ReactConfetti;

// --- AUDIO ENGINE ---
let audioCtx = null;
const getAudioCtx = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
};

const playWhoosh = () => {
  try {
    const ctx = getAudioCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setTargetAtTime(100, t, 0.1);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(t + 0.2);
  } catch (e) {}
};

const playFanfare = () => {
  try {
    const ctx = getAudioCtx();
    const t = ctx.currentTime;
    // Elegant minor-major transition chord
    [440, 554, 659, 880, 1108].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0, t + i * 0.1);
      g.gain.linearRampToValueAtTime(0.1, t + i * 0.1 + 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, t + 4);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t + i * 0.1);
      osc.stop(t + 5);
    });
  } catch (e) {}
};

// --- CUSTOM 3D PARTICLE ENGINE ---
const DecorationEngine = () => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let raf;
    let particles = [];
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    class Deco {
      constructor() { this.init(); }
      init() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + Math.random() * 500;
        this.size = Math.random() * 15 + 10;
        this.color = `hsl(${Math.random() * 40 + 340}, 70%, 60%)`; // Luxury Pink/Red
        this.vy = -(Math.random() * 1.5 + 0.5);
        this.vx = Math.random() * 1 - 0.5;
        this.type = Math.random() > 0.7 ? 'balloon' : 'ribbon';
        this.sway = Math.random() * 20;
        this.swaySpeed = Math.random() * 0.02 + 0.01;
      }
      update(t) {
        this.y += this.vy;
        this.x += Math.sin(t * this.swaySpeed) * 0.5 + this.vx;
        if (this.y < -100) this.init();
      }
      draw() {
        ctx.save();
        ctx.globalAlpha = 0.6;
        if (this.type === 'balloon') {
          ctx.shadowBlur = 10;
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.fillStyle = this.color;
          ctx.beginPath();
          ctx.ellipse(this.x, this.y, this.size, this.size * 1.3, 0, 0, Math.PI * 2);
          ctx.fill();
          // Shine
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.beginPath();
          ctx.ellipse(this.x - 5, this.y - 10, this.size/3, this.size/2, -0.5, 0, Math.PI*2);
          ctx.fill();
        } else {
          ctx.strokeStyle = this.color;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(this.x, this.y);
          ctx.bezierCurveTo(this.x + 20, this.y + 20, this.x - 20, this.y + 40, this.x, this.y + 60);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // Thousands of decorations feel (optimized to 200 high-quality ones)
    for(let i=0; i<80; i++) particles.push(new Deco());

    const loop = (t) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(t/1000); p.draw(); });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

// --- MICROPHONE SENSITIVITY FIX ---
const useMic = () => {
  const [isBlowing, setIsBlowing] = useState(false);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = getAudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      streamRef.current = stream;
      analyserRef.current = analyser;
      
      const data = new Uint8Array(analyser.frequencyBinCount);
      const check = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        // Focus on sub-bass/wind frequencies (bins 0-10)
        for(let i=0; i<10; i++) sum += data[i];
        const avg = sum / 10;
        
        // High threshold = less sensitive (Reechita must actually blow!)
        setIsBlowing(avg > 90); 
        requestAnimationFrame(check);
      };
      check();
    } catch (e) { alert("Mic needed for the candle magic!"); }
  };
  
  const stop = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  };
  
  return { isBlowing, start, stop };
};

// --- COMPONENTS ---

const Candle = ({ isLit, index }) => (
  <div className="relative flex flex-col items-center mx-1.5 transition-all duration-500 z-50">
    <div className="h-10 w-4 flex justify-center items-end relative">
      <AnimatePresence>
        {isLit && (
          <motion.div 
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            className="w-4 h-7 bg-gradient-to-t from-orange-600 via-amber-300 to-white rounded-full animate-flame shadow-[0_0_25px_8px_rgba(255,165,0,0.4)]"
          />
        )}
      </AnimatePresence>
      {!isLit && (
        <motion.div 
          initial={{ opacity: 0.8, y: 0 }} animate={{ opacity: 0, y: -50 }}
          className="absolute w-2 h-2 bg-gray-400 rounded-full blur-md"
        />
      )}
      <div className="w-[2px] h-3 bg-black/60 absolute bottom-0"></div>
    </div>
    <div className="w-4 h-14 bg-gradient-to-b from-rose-200 to-rose-400 rounded-sm shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,white_5px,white_10px)]"></div>
    </div>
  </div>
);

const Cake = ({ candlesLit }) => {
  return (
    <div className="cake-stage">
      {/* Candles */}
      <div className="absolute bottom-[310px] left-1/2 -translate-x-1/2 flex flex-wrap justify-center w-full z-50">
        {candlesLit.map((lit, i) => <Candle key={i} index={i} isLit={lit} />)}
      </div>

      <div className="flex flex-col items-center relative z-40">
        
        {/* Tier 3: Chocolate / 27th Feb */}
        <div className="w-56 h-24 bg-[#3d1308] rounded-t-3xl relative shadow-2xl border-b-4 border-black/20">
          <div className="absolute -top-6 left-0 w-full h-12 bg-[#4e1d10] rounded-[50%] shadow-inner flex items-center justify-center">
            <span className="font-handwriting text-[#d4af37] text-lg transform -rotate-3 opacity-80">27th February</span>
          </div>
          {/* Chocolate Drips */}
          <div className="absolute top-0 w-full flex justify-around px-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-6 h-12 bg-[#2d0a04] rounded-b-full shadow-lg" style={{ height: 20 + Math.random() * 20 }}></div>
            ))}
          </div>
        </div>

        {/* Tier 2: Cream / Reechita */}
        <div className="w-80 h-32 bg-[#fffcf2] -mt-4 rounded-3xl relative shadow-[0_10px_40px_rgba(0,0,0,0.4)] flex items-center justify-center border-b-4 border-black/10">
          <div className="absolute -top-8 w-full h-16 bg-[#ffffff] rounded-[50%] shadow-md border-b-4 border-pink-100"></div>
          
          <div className="z-10 bg-white/40 backdrop-blur-md px-10 py-3 rounded-full border border-white/60 shadow-2xl scale-110">
            <h2 className="font-handwriting text-5xl text-rose-500 drop-shadow-lg tracking-wider">Reechita</h2>
          </div>
          
          {/* Pearl Decor */}
          <div className="absolute bottom-4 w-full flex justify-between px-10 opacity-70">
            {[...Array(8)].map((_, i) => <div key={i} className="w-3 h-3 rounded-full bg-amber-200 shadow-sm"></div>)}
          </div>
        </div>

        {/* Tier 1: Velvet / Happy Birthday */}
        <div className="w-[420px] h-40 -mt-4 rounded-b-[4rem] rounded-t-3xl velvet-texture relative shadow-[0_25px_60px_rgba(0,0,0,0.6)] flex items-center justify-center">
          <div className="absolute -top-10 w-full h-20 bg-[#a30000] rounded-[50%] shadow-lg border-b-4 border-black/10"></div>
          
          <div className="text-center z-10 scale-125">
            <span className="block font-serif text-amber-200 text-4xl uppercase tracking-[0.3em] gold-3d">Happy</span>
            <span className="block font-serif text-amber-200 text-4xl uppercase tracking-[0.3em] gold-3d -mt-2">Birthday</span>
          </div>

          {/* Luxury Bottom Frills */}
          <div className="absolute bottom-0 w-full flex justify-center gap-1">
            {[...Array(24)].map((_, i) => (
              <div key={i} className="w-6 h-6 bg-white rounded-full shadow-inner -mb-3 icing-rim"></div>
            ))}
          </div>
        </div>

        {/* Plate */}
        <div className="absolute -bottom-10 w-[550px] h-16 bg-gradient-to-b from-white to-gray-300 rounded-[50%] -z-10 shadow-[0_30px_70px_rgba(0,0,0,0.8)] border-8 border-gray-100"></div>
      </div>
    </div>
  );
};

// --- APP ---

const App = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [candlesLit, setCandlesLit] = useState(Array(15).fill(true));
  const [isWon, setIsWon] = useState(false);
  const [scale, setScale] = useState(1);
  const { isBlowing, start, stop } = useMic();

  useEffect(() => {
    const handleResize = () => {
      const s = Math.min(window.innerWidth / 600, window.innerHeight / 1000, 1);
      setScale(s);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (hasStarted && isBlowing && !isWon) {
      setCandlesLit(prev => {
        const lit = prev.map((l, i) => l ? i : -1).filter(i => i !== -1);
        if (lit.length === 0) return prev;
        const out = [...prev];
        // Blow out 1-2 random candles at a time
        const count = Math.min(lit.length, Math.floor(Math.random() * 2) + 1);
        for(let i=0; i<count; i++) {
          const randIdx = lit.splice(Math.floor(Math.random() * lit.length), 1)[0];
          out[randIdx] = false;
        }
        playWhoosh();
        return out;
      });
    }
  }, [isBlowing, hasStarted, isWon]);

  useEffect(() => {
    if (hasStarted && !isWon && candlesLit.every(c => !c)) {
      setIsWon(true);
      stop();
      playFanfare();
    }
  }, [candlesLit, hasStarted, isWon]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-4 relative">
      <DecorationEngine />
      
      {isWon && <Confetti numberOfPieces={1000} recycle={false} gravity={0.1} />}

      <div className="z-50 text-center mb-auto pt-10 w-full max-w-xl">
        <AnimatePresence mode="wait">
          {!hasStarted ? (
            <motion.div 
              key="intro" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="luxury-glass p-10 mx-4"
            >
              <h1 className="font-handwriting text-5xl text-rose-500 mb-4">Reechita's Surprise</h1>
              <p className="text-xl text-slate-300 mb-8 font-serif italic">"A celebration fit for royalty. Enable your microphone to begin."</p>
              <button 
                onClick={() => { setHasStarted(true); start(); }}
                className="w-full py-5 bg-gradient-to-r from-rose-600 to-pink-500 rounded-full font-bold text-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all text-white border border-rose-400"
              >
                ENTER THE MAGIC
              </button>
            </motion.div>
          ) : !isWon ? (
            <motion.div key="blow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-3xl font-serif text-white tracking-[0.4em] uppercase opacity-80 animate-pulse">
                Make your wish, Reechita... <br/> <span className="text-rose-400">BLOW NOW</span>
              </h2>
            </motion.div>
          ) : (
            <motion.div 
              key="win" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', bounce: 0.5 }}
              className="luxury-glass p-12 shadow-[0_0_100px_rgba(255,100,100,0.3)]"
            >
              <h1 className="font-handwriting text-8xl gold-text mb-6">Happy Birthday!</h1>
              <p className="text-2xl font-serif italic text-pink-100 leading-relaxed">
                "To the most incredible person, Reechita. <br/> May every dream you wished for today come true in the most beautiful way. I love you endlessly."
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mb-20" style={{ transform: `scale(${scale})`, transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <Cake candlesLit={candlesLit} />
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
