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

const playHappyBirthday = () => {
  const ctx = getAudioCtx();
  const t = ctx.currentTime;
  const tempo = 0.55;
  const notes = [
    [261.63, 0.5], [261.63, 0.5], [293.66, 1], [261.63, 1], [349.23, 1], [329.63, 2],
    [261.63, 0.5], [261.63, 0.5], [293.66, 1], [261.63, 1], [392.00, 1], [349.23, 2],
    [261.63, 0.5], [261.63, 0.5], [523.25, 1], [440.00, 1], [349.23, 1], [329.63, 1], [293.66, 2],
    [466.16, 0.5], [466.16, 0.5], [440.00, 1], [349.23, 1], [392.00, 1], [349.23, 2]
  ];
  let cur = t;
  notes.forEach(([f, d]) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, cur);
    g.gain.setValueAtTime(0, cur);
    g.gain.linearRampToValueAtTime(0.12, cur + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, cur + d * tempo);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(cur);
    osc.stop(cur + d * tempo);
    cur += (d * tempo) + 0.05;
  });
};

const playWhoosh = () => {
  const ctx = getAudioCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.setTargetAtTime(60, t, 0.1);
  g.gain.setValueAtTime(0.2, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start();
  osc.stop(t + 0.3);
};

// --- BALLOON PHYSICS ENGINE ---
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

    class Balloon {
      constructor() { this.init(); }
      init() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + 100 + Math.random() * 800;
        this.r = 25 + Math.random() * 15;
        this.color = `hsl(${Math.random() * 30 + 340}, 85%, 65%)`;
        this.vy = -(1.2 + Math.random() * 1.8);
        this.sway = Math.random() * Math.PI * 2;
      }
      update() {
        this.y += this.vy;
        this.x += Math.sin(Date.now() / 1500 + this.sway) * 0.4;
        if (this.y < -300) this.init();
      }
      draw() {
        ctx.save();
        // Black String
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.r);
        ctx.bezierCurveTo(this.x - 5, this.y + this.r + 20, this.x + 5, this.y + this.r + 40, this.x, this.y + this.r + 70);
        ctx.stroke();
        // Balloon Body
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.r, this.r * 1.25, 0, 0, Math.PI * 2);
        ctx.fill();
        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.ellipse(this.x - this.r / 3, this.y - this.r / 3, this.r / 4, this.r / 2, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    for (let i = 0; i < 35; i++) particles.push(new Balloon());
    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

// --- MIC HOOK ---
const useMic = () => {
  const [isBlowing, setIsBlowing] = useState(false);
  const streamRef = useRef(null);
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = getAudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      streamRef.current = stream;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const check = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < 15; i++) sum += data[i];
        setIsBlowing(sum / 15 > 105); // Balanced sensitivity
        requestAnimationFrame(check);
      };
      check();
    } catch (e) { console.error(e); }
  };
  const stop = () => streamRef.current?.getTracks().forEach(t => t.stop());
  return { isBlowing, start, stop };
};

// --- CAKE COMPONENTS ---

const Candle = ({ isLit, x, y }) => (
  <div className="absolute z-[100]" style={{ left: `${x}px`, top: `${y}px` }}>
    <div className="relative flex flex-col items-center">
      <AnimatePresence>
        {isLit && (
          <motion.div 
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            className="flame absolute -top-5"
          />
        )}
      </AnimatePresence>
      <div className="w-[1.5px] h-3 bg-gray-800 absolute -top-2"></div>
      <div className="w-3 h-10 bg-gradient-to-b from-pink-300 to-rose-400 rounded-sm shadow-sm"></div>
    </div>
  </div>
);

const Tier = ({ size, height, color, label, isTopTier, candlesLit, onCandleBlow }) => {
  const sparkles = useMemo(() => [...Array(10)].map(() => ({
    top: Math.random() * 100,
    left: Math.random() * 100,
    delay: Math.random() * 2
  })), []);

  return (
    <div className="tier" style={{ width: size, height: height + 20 }}>
      {/* Top surface - oval perspective */}
      <div 
        className="tier-top" 
        style={{ width: size, height: size * 0.4, top: -size * 0.2, backgroundColor: color }}
      >
        {label && <div className="h-full flex items-center justify-center font-handwriting text-rose-700/60 text-sm md:text-base">{label}</div>}
        
        {/* Candles only on Top Tier */}
        {isTopTier && (
          <div className="relative w-full h-full">
            {candlesLit.map((lit, i) => {
              const angle = (i / candlesLit.length) * Math.PI * 2;
              const cx = (size / 2) + Math.cos(angle) * (size / 3.5) - 6;
              const cy = (size * 0.2) + Math.sin(angle) * (size * 0.08) - 10;
              return <Candle key={i} isLit={lit} x={cx} y={cy} />;
            })}
          </div>
        )}
      </div>
      
      {/* Side of the tier */}
      <div 
        className="tier-side" 
        style={{ width: size, height: height, background: `linear-gradient(to bottom, ${color}, #e0e0e0)` }}
      >
        {sparkles.map((s, i) => (
          <div key={i} className="sparkle" style={{ top: `${s.top}%`, left: `${s.left}%`, animationDelay: `${s.delay}s` }} />
        ))}
      </div>
    </div>
  );
};

const App = () => {
  const [phase, setPhase] = useState('intro'); // intro, blowing, cutting, eating, card
  const [candlesLit, setCandlesLit] = useState(Array(8).fill(true));
  const [cardOpen, setCardOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const { isBlowing, start, stop } = useMic();

  useEffect(() => {
    const handleResize = () => {
      const s = Math.min(window.innerWidth / 700, window.innerHeight / 1000, 1.2);
      setScale(s);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (phase === 'blowing' && isBlowing) {
      setCandlesLit(prev => {
        const lit = prev.map((l, i) => l ? i : -1).filter(i => i !== -1);
        if (lit.length === 0) return prev;
        const out = [...prev];
        const count = Math.min(lit.length, 1);
        const idx = lit[Math.floor(Math.random() * lit.length)];
        out[idx] = false;
        playWhoosh();
        return out;
      });
    }
  }, [isBlowing, phase]);

  useEffect(() => {
    if (phase === 'blowing' && candlesLit.every(c => !c)) {
      setTimeout(() => {
        stop();
        setPhase('cutting');
        playHappyBirthday();
      }, 1200);
    }
  }, [candlesLit, phase]);

  useEffect(() => {
    if (phase === 'cutting') {
      setTimeout(() => setPhase('eating'), 3500);
    }
  }, [phase]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center relative bg-white overflow-hidden">
      <div className="room-background">
        <div className="room-wall-paneling" />
        <div className="room-floor" />
      </div>
      
      <DecorationEngine />
      
      {phase === 'card' && <Confetti numberOfPieces={350} gravity={0.1} />}

      {/* UI OVERLAY */}
      <div className="z-[1000] text-center mb-auto pt-10 px-4 w-full max-w-2xl">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="luxury-glass p-8 shadow-2xl">
              <h1 className="font-handwriting text-5xl text-rose-600 mb-6">Reechita's Birthday</h1>
              <p className="text-xl text-gray-500 mb-8 italic">"A sweet celebration for my darling baby."</p>
              <button 
                onClick={() => { setPhase('blowing'); start(); }} 
                className="px-12 py-5 bg-rose-600 text-white rounded-full font-bold text-2xl shadow-xl hover:bg-rose-700 transform hover:scale-105 transition-all"
              >
                ENTER THE ROOM
              </button>
            </motion.div>
          )}

          {phase === 'blowing' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-3xl font-serif tracking-[0.3em] uppercase text-rose-600 animate-pulse">
                Make a wish, Reechita... <br/><span className="text-4xl">BLOW!</span>
              </h2>
            </motion.div>
          )}

          {phase === 'eating' && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <button 
                onClick={() => setPhase('card')}
                className="px-12 py-6 bg-white border-2 border-rose-500 text-rose-600 rounded-full font-bold text-3xl shadow-2xl hover:bg-rose-50 transition-all"
              >
                YUMMY! READ MY MESSAGE ❤️
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3D CAKE STAGE */}
      <div 
        className="relative mb-32 transition-all duration-1000" 
        style={{ transform: `scale(${scale}) ${phase === 'eating' || phase === 'card' ? 'translateY(500px) opacity(0)' : ''}` }}
      >
        <AnimatePresence>
          {phase === 'cutting' && (
            <motion.div 
              initial={{ x: -300, y: -100, rotate: -20, opacity: 0 }}
              animate={{ x: 150, y: -50, rotate: 0, opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="knife"
            />
          )}
        </AnimatePresence>

        <div className="cake-container-3d">
          {/* Tier 3 (Top) */}
          <Tier size={160} height={70} color="#fffcf2" label="27th Feb" isTopTier candlesLit={candlesLit} />
          
          {/* Tier 2 (Middle) */}
          <div className="-mt-8">
            <Tier size={260} height={90} color="#fff" label="Reechita" />
          </div>
          
          {/* Tier 1 (Bottom) */}
          <div className="-mt-12">
            <Tier size={380} height={120} color="#fff" label="Happy Birthday" />
          </div>

          {/* Plate */}
          <div className="absolute -bottom-10 w-[500px] h-20 bg-gradient-to-b from-white to-gray-200 rounded-[50%] -z-10 shadow-[0_30px_60px_rgba(0,0,0,0.1)] border-2 border-gray-100"></div>
        </div>
      </div>

      {/* SLICE PRESENTATION */}
      <AnimatePresence>
        {phase === 'eating' && (
          <motion.div 
            initial={{ scale: 0, y: 100 }} animate={{ scale: 1.8, y: -50 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2000] flex flex-col items-center"
          >
            <div className="w-40 h-40 bg-[#fffcf2] rounded-lg shadow-2xl transform rotate-3 border-b-8 border-gray-100 relative overflow-hidden">
               <div className="absolute top-0 w-full h-8 bg-pink-200" />
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-handwriting text-rose-500">Delicious!</div>
            </div>
            <p className="mt-8 font-handwriting text-rose-600 text-xl">For my darling baby...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D FOLDING CARD */}
      <AnimatePresence>
        {phase === 'card' && (
          <motion.div 
            initial={{ y: -1000, scale: 0.5 }} 
            animate={{ y: 0, scale: 1 }} 
            onAnimationComplete={() => setTimeout(() => setCardOpen(true), 800)}
            className="fixed inset-0 flex items-center justify-center z-[5000] card-perspective p-4"
          >
            <div className={`card-container ${cardOpen ? 'open' : ''}`}>
              <div className="card-half card-front">
                <h1 className="font-handwriting text-5xl mb-6">Open Me</h1>
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-5xl">❤️</div>
              </div>
              <div className="card-half card-back">
                <h2 className="font-handwriting text-4xl mb-6">My Darling...</h2>
                <p className="font-serif italic text-2xl leading-relaxed text-gray-700">
                  Happy 17th birthday my darlinggg, my babyyyyy... <br/><br/>
                  I lovee you soo muchhh! <br/>
                  You are the most precious thing in my life.
                </p>
                <div className="mt-12 text-rose-500 font-bold tracking-widest text-lg">❤️ Forever Yours ❤️</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
