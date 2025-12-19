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
  const tempo = 0.5;
  const melody = [
    [261.63, 0.5], [261.63, 0.5], [293.66, 1], [261.63, 1], [349.23, 1], [329.63, 2],
    [261.63, 0.5], [261.63, 0.5], [293.66, 1], [261.63, 1], [392.00, 1], [349.23, 2],
    [261.63, 0.5], [261.63, 0.5], [523.25, 1], [440.00, 1], [349.23, 1], [329.63, 1], [293.66, 2],
    [466.16, 0.5], [466.16, 0.5], [440.00, 1], [349.23, 1], [392.00, 1], [349.23, 2]
  ];
  let cur = t;
  melody.forEach(([freq, dur]) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, cur);
    g.gain.setValueAtTime(0, cur);
    g.gain.linearRampToValueAtTime(0.1, cur + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, cur + dur * tempo);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(cur);
    osc.stop(cur + dur * tempo);
    cur += (dur * tempo) + 0.05;
  });
};

const playWhoosh = () => {
  const ctx = getAudioCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.setTargetAtTime(80, t, 0.1);
  g.gain.setValueAtTime(0.2, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start();
  osc.stop(t + 0.3);
};

// --- BALLOON PHYSICS ---
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
        this.y = canvas.height + 100 + Math.random() * 600;
        this.r = 24 + Math.random() * 12;
        this.color = `hsl(${Math.random() * 40 + 340}, 85%, 60%)`;
        this.vy = -(1.2 + Math.random() * 1.5);
        this.sway = Math.random() * Math.PI * 2;
      }
      update() {
        this.y += this.vy;
        this.x += Math.sin(Date.now() / 1200 + this.sway) * 0.3;
        if (this.y < -300) this.init();
      }
      draw() {
        ctx.save();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.r);
        ctx.lineTo(this.x, this.y + this.r + 80);
        ctx.stroke();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.r, this.r * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.ellipse(this.x - this.r/3, this.y - this.r/3, this.r/4, this.r/2, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    for (let i = 0; i < 40; i++) particles.push(new Balloon());
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
        setIsBlowing(sum / 15 > 100);
        requestAnimationFrame(check);
      };
      check();
    } catch (e) { console.error("Mic access denied"); }
  };
  const stop = () => streamRef.current?.getTracks().forEach(t => t.stop());
  return { isBlowing, start, stop };
};

// --- CAKE COMPONENTS ---

const Candle = ({ isLit, x, y, tierOffset = 0 }) => (
  <div className="absolute z-[200]" style={{ left: `${x}px`, top: `${y + tierOffset}px` }}>
    <div className="relative flex flex-col items-center">
      <AnimatePresence>
        {isLit && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flame absolute -top-5" />}
      </AnimatePresence>
      <div className="w-[1px] h-3 bg-gray-700 absolute -top-2"></div>
      <div className="w-2.5 h-10 bg-gradient-to-b from-pink-300 to-rose-400 rounded-sm shadow-sm"></div>
    </div>
  </div>
);

const Tier = ({ size, height, color, label, candles = [], candlesLit, onCandleBlow }) => {
  const sparkles = useMemo(() => [...Array(8)].map(() => ({
    top: Math.random() * 80 + 10,
    left: Math.random() * 80 + 10,
    delay: Math.random() * 2
  })), []);

  return (
    <div className="tier flex flex-col items-center" style={{ width: size }}>
      <div className="tier-top-surface" style={{ width: size, height: size * 0.35, top: -size * 0.17, backgroundColor: color }}>
        {label && <div className="h-full flex items-center justify-center font-handwriting text-rose-800/40 text-sm md:text-base pointer-events-none select-none">{label}</div>}
        <div className="relative w-full h-full">
          {candles.map((cIdx) => {
            const angle = ((cIdx % 6) / 6) * Math.PI * 2;
            const radiusX = size * 0.35;
            const radiusY = size * 0.12;
            const cx = (size / 2) + Math.cos(angle) * radiusX - 5;
            const cy = (size * 0.175) + Math.sin(angle) * radiusY - 10;
            return <Candle key={cIdx} isLit={candlesLit[cIdx]} x={cx} y={cy} />;
          })}
        </div>
      </div>
      <div className="tier-side" style={{ width: size, height: height, background: `linear-gradient(to bottom, ${color}, #eeeeee)` }}>
        <div className="piping"></div>
        {sparkles.map((s, i) => (
          <div key={i} className="sparkle" style={{ top: `${s.top}%`, left: `${s.left}%`, animationDelay: `${s.delay}s` }} />
        ))}
      </div>
    </div>
  );
};

const App = () => {
  const TOTAL_CANDLES = 17;
  const [phase, setPhase] = useState('intro'); // intro, blowing, countdown, celebration, cutting, eating, card
  const [candlesLit, setCandlesLit] = useState(Array(TOTAL_CANDLES).fill(true));
  const [cardOpen, setCardOpen] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [scale, setScale] = useState(1);
  const { isBlowing, start, stop } = useMic();

  useEffect(() => {
    const handleResize = () => {
      const s = Math.min(window.innerWidth / 800, window.innerHeight / 1000, 1.2);
      setScale(s);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (phase === 'blowing' && isBlowing) {
      setCandlesLit(prev => {
        const litIndices = prev.map((l, i) => l ? i : -1).filter(i => i !== -1);
        if (litIndices.length === 0) return prev;
        const out = [...prev];
        const idx = litIndices[Math.floor(Math.random() * litIndices.length)];
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
        setPhase('countdown');
      }, 1000);
    }
  }, [candlesLit, phase]);

  useEffect(() => {
    if (phase === 'countdown') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setPhase('celebration');
        playHappyBirthday();
        setTimeout(() => setPhase('cutting'), 4000);
      }
    }
  }, [countdown, phase]);

  useEffect(() => {
    if (phase === 'cutting') {
      setTimeout(() => setPhase('eating'), 3000);
    }
  }, [phase]);

  // Candle distribution: 5 top, 6 mid, 6 bottom
  const topCandles = [0, 1, 2, 3, 4];
  const midCandles = [5, 6, 7, 8, 9, 10];
  const botCandles = [11, 12, 13, 14, 15, 16];

  return (
    <div className="h-full w-full flex flex-col items-center justify-center relative bg-white overflow-hidden">
      <div className="room-background">
        <div className="room-wall-paneling" />
        <div className="room-floor" />
      </div>
      
      <DecorationEngine />
      
      {(phase === 'celebration' || phase === 'card') && <Confetti numberOfPieces={400} gravity={0.12} />}

      {/* --- UI LAYER --- */}
      <div className="z-[2000] text-center mb-auto pt-10 px-4 w-full">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="luxury-glass p-10 max-w-lg mx-auto shadow-xl">
              <h1 className="font-handwriting text-5xl text-rose-600 mb-4">Happy 17th Birthday Baby</h1>
              <p className="text-xl text-gray-400 mb-10 italic">"My darling, your special magic starts now."</p>
              <button 
                onClick={() => { setPhase('blowing'); start(); }} 
                className="w-full py-5 bg-rose-600 text-white rounded-full font-bold text-2xl shadow-xl hover:scale-105 transition-transform"
              >
                ENTER THE MAGIC
              </button>
            </motion.div>
          )}

          {phase === 'blowing' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
              <h2 className="text-3xl font-serif tracking-[0.4em] uppercase text-rose-600 animate-pulse">
                Blow out all 17 candles, Reechita... <br/><span className="text-5xl">MAKE A WISH!</span>
              </h2>
            </motion.div>
          )}

          {phase === 'countdown' && (
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} key={countdown}>
              <span className="countdown-text">{countdown > 0 ? countdown : "SURPRISE!"}</span>
            </motion.div>
          )}

          {phase === 'celebration' && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
               <h1 className="font-handwriting text-7xl gold-text mb-4 drop-shadow-lg">Happy Birthday Babyyy!</h1>
            </motion.div>
          )}

          {phase === 'eating' && (
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <button 
                onClick={() => setPhase('card')}
                className="px-14 py-6 bg-white border-2 border-rose-500 text-rose-600 rounded-full font-bold text-3xl shadow-2xl hover:bg-rose-50 transition-colors"
              >
                YUMMY! READ MY MESSAGE ❤️
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- CAKE STAGE --- */}
      <div 
        className="relative mb-24" 
        style={{ transform: `scale(${scale}) ${phase === 'eating' || phase === 'card' ? 'translateY(600px) opacity(0)' : ''}`, transition: 'all 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
      >
        <AnimatePresence>
          {phase === 'cutting' && (
            <motion.div 
              initial={{ x: -400, y: -120, rotate: -25, opacity: 0 }}
              animate={{ x: 200, y: -60, rotate: 0, opacity: 1 }}
              transition={{ duration: 1.8, ease: "easeInOut" }}
              className="knife"
            />
          )}
        </AnimatePresence>

        <div className="cake-container-3d">
          <Tier size={160} height={80} color="#fffcf2" label="27th Feb" candles={topCandles} candlesLit={candlesLit} />
          <div className="-mt-10">
            <Tier size={280} height={100} color="#ffffff" label="Reechita" candles={midCandles} candlesLit={candlesLit} />
          </div>
          <div className="-mt-14">
            <Tier size={420} height={130} color="#ffffff" label="Happy Birthday" candles={botCandles} candlesLit={candlesLit} />
          </div>

          {/* Plate */}
          <div className="absolute -bottom-10 w-[550px] h-20 bg-gradient-to-b from-white to-gray-200 rounded-[50%] -z-10 shadow-[0_40px_80px_rgba(0,0,0,0.08)] border-2 border-gray-100"></div>
        </div>
      </div>

      {/* --- SLICE --- */}
      <AnimatePresence>
        {phase === 'eating' && (
          <motion.div 
            initial={{ scale: 0, y: 150 }} animate={{ scale: 2, y: -80 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[3000] flex flex-col items-center"
          >
            <div className="w-44 h-44 bg-[#fffcf2] rounded-lg shadow-2xl transform rotate-6 border-b-8 border-gray-100 overflow-hidden relative">
               <div className="absolute top-0 w-full h-10 bg-rose-200" />
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-handwriting text-rose-500 text-xl">Taste of Love!</div>
            </div>
            <p className="mt-10 font-handwriting text-rose-600 text-2xl drop-shadow-sm">Enjoy, my darling baby... ❤️</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MESSAGE CARD --- */}
      <AnimatePresence>
        {phase === 'card' && (
          <motion.div 
            initial={{ y: -1200, scale: 0.6 }} animate={{ y: 0, scale: 1 }} 
            onAnimationComplete={() => setTimeout(() => setCardOpen(true), 800)}
            className="fixed inset-0 flex items-center justify-center z-[5000] card-perspective p-6"
          >
            <div className={`card-container ${cardOpen ? 'open' : ''}`} onClick={() => setCardOpen(!cardOpen)}>
              <div className="card-half card-front">
                <h1 className="font-handwriting text-5xl mb-8">For You Baby ❤️</h1>
                <div className="w-28 h-28 bg-white/20 rounded-full flex items-center justify-center text-6xl animate-pulse">❤️</div>
                <p className="mt-8 font-serif italic text-lg opacity-80">Tap to open</p>
              </div>
              <div className="card-half card-back">
                <h2 className="font-handwriting text-4xl mb-6">Happy Birthday Darling!</h2>
                <p className="font-serif italic text-2xl leading-relaxed text-gray-800">
                  "Happy 17th birthday my darlinggg, my babyyyyy... <br/><br/>
                  I lovee you soo muchhh! <br/>
                  You are the most precious soul I know."
                </p>
                <div className="mt-14 text-rose-500 font-bold tracking-widest text-xl animate-bounce">❤️❤️❤️</div>
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
