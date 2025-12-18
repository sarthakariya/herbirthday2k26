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

const playNote = (freq, start, duration) => {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.15, start + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration);
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
    playNote(freq, cur, dur * tempo);
    cur += (dur * tempo) + 0.05;
  });
};

const playWhoosh = () => {
  const ctx = getAudioCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.setTargetAtTime(80, t, 0.1);
  g.gain.setValueAtTime(0.3, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start();
  osc.stop(t + 0.2);
};

// --- DECORATION ENGINE (PHYSICS & BLACK STRINGS) ---
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
        this.y = canvas.height + 200 + Math.random() * 500;
        this.r = 20 + Math.random() * 20;
        this.color = `hsl(${Math.random() * 60 + 330}, 80%, 60%)`;
        this.vy = -(0.8 + Math.random() * 1.5);
        this.vx = 0;
        this.sway = Math.random() * 1000;
      }
      update() {
        this.y += this.vy;
        this.vx = Math.sin(Date.now() / 1000 + this.sway) * 0.5;
        this.x += this.vx;
        if (this.y < -300) this.init();
      }
      draw() {
        ctx.save();
        // String (Black)
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.r * 1.2);
        ctx.bezierCurveTo(this.x - 10, this.y + this.r * 1.5, this.x + 10, this.y + this.r * 2, this.x, this.y + this.r * 2.5);
        ctx.stroke();
        // Balloon
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.r, this.r * 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x - this.r / 3, this.y - this.r / 3, this.r / 4, this.r / 2, -0.5, 0, Math.PI * 2);
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

// --- MICROPHONE HOOK ---
const useMic = () => {
  const [isBlowing, setIsBlowing] = useState(false);
  const streamRef = useRef(null);
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = getAudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      streamRef.current = stream;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const check = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < 10; i++) sum += data[i];
        setIsBlowing(sum / 10 > 95); // High threshold
        requestAnimationFrame(check);
      };
      check();
    } catch (e) { alert("Mic needed for the birthday wish!"); }
  };
  const stop = () => streamRef.current?.getTracks().forEach(t => t.stop());
  return { isBlowing, start, stop };
};

// --- COMPONENTS ---

const Candle = ({ isLit, index }) => (
  <div className="relative flex flex-col items-center mx-1 z-50">
    <div className="h-8 w-4 flex justify-center items-end relative">
      <AnimatePresence>
        {isLit && (
          <motion.div 
            initial={{ scale: 0 }} animate={{ scale: 1.1 }} exit={{ scale: 0 }}
            className="w-4 h-6 bg-gradient-to-t from-orange-600 to-amber-200 rounded-full animate-flame shadow-[0_0_20px_rgba(255,150,0,0.5)]"
          />
        )}
      </AnimatePresence>
      <div className="w-[1.5px] h-2 bg-black opacity-50 absolute bottom-0"></div>
    </div>
    <div className="w-3 h-10 bg-pink-200 rounded-sm shadow-md"></div>
  </div>
);

const CakeSlice = ({ show }) => (
  <AnimatePresence>
    {show && (
      <motion.div 
        initial={{ scale: 0, y: 100, rotate: -20 }}
        animate={{ scale: 1.5, y: -50, rotate: 0 }}
        exit={{ scale: 0, opacity: 0 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] cake-slice-present"
      >
        <div className="w-40 h-40 relative">
          <div className="absolute inset-0 bg-pink-300 rounded-lg shadow-2xl transform skew-x-12 velvet-texture"></div>
          <div className="absolute inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center font-handwriting text-pink-700 text-2xl">Delicious!</div>
          <div className="absolute -top-4 left-0 w-full h-8 bg-[#fffcf2] rounded-full border-b-2 border-pink-100"></div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

const App = () => {
  const [phase, setPhase] = useState('intro'); // intro, blowing, cutting, eating, card
  const [candlesLit, setCandlesLit] = useState(Array(12).fill(true));
  const [cardOpen, setCardOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const { isBlowing, start, stop } = useMic();

  useEffect(() => {
    const handleResize = () => setScale(Math.min(window.innerWidth / 600, window.innerHeight / 1000, 1));
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
        const count = Math.min(lit.length, Math.floor(Math.random() * 2) + 1);
        for (let i = 0; i < count; i++) {
          out[lit.splice(Math.floor(Math.random() * lit.length), 1)[0]] = false;
        }
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
      }, 1000);
    }
  }, [candlesLit, phase]);

  useEffect(() => {
    if (phase === 'cutting') {
      setTimeout(() => setPhase('eating'), 3000);
    }
  }, [phase]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center relative bg-black/20">
      <div className="room-background"><div className="room-wall-pattern"></div><div className="room-floor"></div></div>
      <DecorationEngine />
      
      {phase !== 'intro' && <Confetti numberOfPieces={200} recycle={phase === 'card'} />}

      {/* --- TOP UI --- */}
      <div className="z-[150] text-center mb-auto pt-10 px-4 w-full">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="luxury-glass p-8 max-w-sm mx-auto">
              <h1 className="font-handwriting text-4xl text-rose-500 mb-4">Reechita's 17th</h1>
              <button onClick={() => { setPhase('blowing'); start(); }} className="w-full py-4 bg-rose-600 rounded-full font-bold text-xl text-white shadow-xl">START THE MAGIC</button>
            </motion.div>
          )}
          {phase === 'blowing' && (
            <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-2xl font-serif text-white tracking-widest uppercase animate-pulse">
              Make a wish, darling... <br/><span className="text-rose-400">BLOW HARD!</span>
            </motion.h2>
          )}
          {phase === 'eating' && (
            <motion.button 
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              onClick={() => setPhase('card')}
              className="px-10 py-4 bg-white text-rose-600 rounded-full font-bold text-2xl shadow-2xl"
            >
              YUM! READ MY CARD
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* --- CAKE & ANIMATIONS --- */}
      <div className="relative mb-20 transition-all duration-1000" style={{ transform: `scale(${scale}) ${phase === 'eating' || phase === 'card' ? 'translateY(300px) opacity(0.3)' : ''}` }}>
        <AnimatePresence>
          {phase === 'cutting' && (
            <motion.div 
              initial={{ x: -200, y: -50, opacity: 0 }} animate={{ x: 100, y: -50, opacity: 1 }}
              className="knife"
            />
          )}
        </AnimatePresence>
        
        <div className="cake-stage">
          <div className="absolute bottom-[280px] left-1/2 -translate-x-1/2 flex flex-wrap justify-center w-64 z-50">
            {candlesLit.map((lit, i) => <Candle key={i} isLit={lit} index={i} />)}
          </div>
          <div className="flex flex-col items-center">
            <div className="w-48 h-20 bg-[#3d1308] rounded-t-2xl velvet-texture relative">
               <div className="absolute -top-4 w-full h-8 bg-[#4e1d10] rounded-[50%] flex items-center justify-center font-handwriting text-amber-200 text-sm">27th Feb</div>
            </div>
            <div className="w-72 h-24 bg-[#fffcf2] -mt-4 rounded-2xl shadow-xl flex items-center justify-center relative">
               <div className="absolute -top-6 w-full h-12 bg-white rounded-[50%] border-b border-pink-100"></div>
               <h2 className="font-handwriting text-4xl text-rose-500 z-10">Reechita</h2>
            </div>
            <div className="w-[380px] h-32 -mt-4 rounded-b-[3rem] velvet-texture shadow-2xl flex flex-col items-center justify-center relative">
               <div className="absolute -top-8 w-full h-16 bg-[#a30000] rounded-[50%]"></div>
               <span className="gold-3d text-3xl font-serif tracking-widest uppercase">17th Birthday</span>
               <div className="absolute bottom-0 w-full flex justify-center gap-1">
                 {[...Array(15)].map((_, i) => <div key={i} className="w-5 h-5 bg-white rounded-full -mb-2 shadow-inner icing-rim"></div>)}
               </div>
            </div>
          </div>
        </div>
      </div>

      <CakeSlice show={phase === 'eating'} />

      {/* --- GREETING CARD --- */}
      <AnimatePresence>
        {phase === 'card' && (
          <motion.div 
            initial={{ y: -1000, rotate: -10 }} 
            animate={{ y: 0, rotate: 0 }} 
            onAnimationComplete={() => setTimeout(() => setCardOpen(true), 800)}
            className="fixed inset-0 flex items-center justify-center z-[300] card-perspective"
          >
            <div className={`card-container ${cardOpen ? 'open' : ''}`}>
              <div className="card-front">
                <h3 className="font-handwriting text-3xl text-rose-600 mb-4">Open Me...</h3>
                <div className="w-20 h-20 bg-rose-200 rounded-full flex items-center justify-center text-rose-600 text-4xl">❤️</div>
              </div>
              <div className="card-inside">
                <h1 className="font-handwriting text-4xl text-rose-600 mb-6">Happy Birthday!</h1>
                <p className="font-serif italic text-xl leading-relaxed">
                  Happy 17th birthday my darlinggg, my babyyyyy... <br/><br/>
                  I lovee you soo muchhh! You are the most beautiful part of my world. ❤️
                </p>
                <div className="mt-10 gold-text font-bold text-lg tracking-widest">Forever Yours</div>
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
