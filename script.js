const { useState, useEffect, useRef, useCallback, useMemo } = React;
const { motion, AnimatePresence } = window.Motion;
const Confetti = window.ReactConfetti;

// --- AUDIO ---
let audioCtx = null;
const playHappyBirthday = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const t = audioCtx.currentTime;
  const tempo = 0.55;
  const melody = [
    [261.63, 0.5], [261.63, 0.5], [293.66, 1], [261.63, 1], [349.23, 1], [329.63, 2],
    [261.63, 0.5], [261.63, 0.5], [293.66, 1], [261.63, 1], [392.00, 1], [349.23, 2],
    [261.63, 0.5], [261.63, 0.5], [523.25, 1], [440.00, 1], [349.23, 1], [329.63, 1], [293.66, 2],
    [466.16, 0.5], [466.16, 0.5], [440.00, 1], [349.23, 1], [392.00, 1], [349.23, 2]
  ];
  let cur = t;
  melody.forEach(([f, d]) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, cur);
    g.gain.setValueAtTime(0, cur);
    g.gain.linearRampToValueAtTime(0.12, cur + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, cur + d * tempo);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(cur);
    osc.stop(cur + d * tempo);
    cur += (d * tempo) + 0.05;
  });
};

const playWhoosh = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.frequency.setTargetAtTime(80, t, 0.1);
  g.gain.setValueAtTime(0.3, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.connect(g); g.connect(audioCtx.destination);
  osc.start(); osc.stop(t + 0.3);
};

// --- DECORATIONS ---
const Gift = ({ color, x, y, rotate }) => (
  <motion.div 
    className="gift-box"
    style={{ backgroundColor: color, left: x, bottom: y, transform: `rotate(${rotate}deg)` }}
    initial={{ scale: 0 }} animate={{ scale: 1 }}
  >
    <div className="gift-ribbon-v w-4 h-full left-1/2 -translate-x-1/2" />
    <div className="gift-ribbon-h w-full h-4 top-1/2 -translate-y-1/2" />
    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full opacity-40 blur-sm" />
  </motion.div>
);

const Cupcake = ({ x, y }) => (
  <motion.div 
    className="cupcake" 
    style={{ left: x, bottom: y }}
    initial={{ scale: 0 }} animate={{ scale: 1 }}
  >
    <div className="cupcake-frosting">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="absolute w-1 h-1 bg-red-400 rounded-full" style={{ top: Math.random()*20, left: Math.random()*40 }} />
      ))}
    </div>
    <div className="cupcake-base" />
  </motion.div>
);

const Candle = ({ isLit, x, y, isMain = false }) => (
  <div className="absolute z-[200]" style={{ left: `${x}px`, top: `${y}px` }}>
    <div className="relative flex flex-col items-center">
      <AnimatePresence>
        {isLit && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flame-real" />}
      </AnimatePresence>
      <div className={isMain ? "candle-main" : "candle-mini"}>
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-gray-800" />
      </div>
    </div>
  </div>
);

const Tier = ({ size, height, index, candles, candlesLit }) => {
  return (
    <div className="tier-3d flex flex-col items-center" style={{ width: size, zIndex: 10 - index }}>
      <div className="tier-top" style={{ width: size, height: size * 0.3, top: -size * 0.15 }}>
        {candles.map((cIdx) => {
          const angle = ((cIdx % 6) / 6) * Math.PI * 2;
          const rx = size * 0.38;
          const ry = size * 0.12;
          const cx = (size / 2) + Math.cos(angle) * rx - 5;
          const cy = (size * 0.15) + Math.sin(angle) * ry - (index === 0 ? 40 : 10);
          return <Candle key={cIdx} isLit={candlesLit[cIdx]} x={cx} y={cy} isMain={cIdx === 0} />;
        })}
      </div>
      <div className="tier-side" style={{ width: size, height: height }}>
        <div className="chocolate-piping-top" />
        <div className="filigree" />
        <div className="chocolate-piping-bottom" />
      </div>
    </div>
  );
};

const App = () => {
  const [phase, setPhase] = useState('intro'); // intro, blowing, countdown, celebration, cutting, eating, card
  const [candlesLit, setCandlesLit] = useState(Array(17).fill(true));
  const [countdown, setCountdown] = useState(3);
  const [cardOpen, setCardOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const streamRef = useRef(null);

  // Mic Logic
  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const check = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0; for (let i = 0; i < 10; i++) sum += data[i];
        if (sum / 10 > 95) {
          setCandlesLit(prev => {
            const lit = prev.map((l, i) => l ? i : -1).filter(v => v !== -1);
            if (lit.length === 0) return prev;
            const out = [...prev];
            out[lit[Math.floor(Math.random() * lit.length)]] = false;
            playWhoosh();
            return out;
          });
        }
        requestAnimationFrame(check);
      };
      check();
    } catch (e) { alert("Mic needed for the wish!"); }
  };

  useEffect(() => {
    if (phase === 'blowing' && candlesLit.every(c => !c)) {
      streamRef.current?.getTracks().forEach(t => t.stop());
      setTimeout(() => setPhase('countdown'), 1000);
    }
  }, [candlesLit, phase]);

  useEffect(() => {
    if (phase === 'countdown') {
      if (countdown > 0) {
        setTimeout(() => setCountdown(countdown - 1), 1000);
      } else {
        setPhase('celebration');
        playHappyBirthday();
        setTimeout(() => setPhase('cutting'), 5000);
      }
    }
  }, [countdown, phase]);

  useEffect(() => {
    if (phase === 'cutting') setTimeout(() => setPhase('eating'), 3500);
    const handleResize = () => setScale(Math.min(window.innerWidth / 1200, window.innerHeight / 1000, 1));
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [phase]);

  // Candle distribution
  const tierCandles = [[0], [1,2,3,4], [5,6,7,8,9,10], [11,12,13,14,15,16]];

  return (
    <div className="h-full w-full flex flex-col items-center justify-center relative overflow-hidden">
      <div className="stage-surface" />
      
      {/* Top UI */}
      <div className="top-right-icons">
        <div className="icon-btn">🎵</div>
        <div className="icon-btn">☰</div>
      </div>

      <div className="z-[1000] text-center mb-auto pt-12 px-4 w-full">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center">
              <h1 className="birthday-title mb-10">Happy Birthday Babyy</h1>
              <button onClick={() => { setPhase('blowing'); startMic(); }} className="px-16 py-6 bg-white border-4 border-purple-600 text-purple-700 rounded-full font-black text-3xl shadow-2xl hover:scale-105 transition-all">START CELEBRATION</button>
            </motion.div>
          )}
          {phase === 'blowing' && (
            <motion.h2 initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="birthday-title text-6xl">Blow out all 17 candles!</motion.h2>
          )}
          {phase === 'countdown' && (
            <motion.div key={countdown} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="countdown-overlay">
              {countdown > 0 ? countdown : "YAY!"}
            </motion.div>
          )}
          {phase === 'celebration' && (
            <motion.h1 initial={{ y: -100 }} animate={{ y: 0 }} className="birthday-title">HAPPY BIRTHDAY BABY! ❤️</motion.h1>
          )}
          {phase === 'eating' && (
            <motion.button onClick={() => setPhase('card')} className="px-14 py-6 bg-white border-4 border-purple-500 text-purple-600 rounded-full font-black text-3xl shadow-2xl">READ MY CARD ❤️</motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ACCESSORIES */}
      <div className="absolute inset-0 z-[5] pointer-events-none">
        <Gift color="var(--gift-pink)" x="15%" y="15%" rotate={-10} />
        <Gift color="var(--gift-blue)" x="75%" y="18%" rotate={15} />
        <Gift color="var(--gift-purple)" x="20%" y="8%" rotate={5} />
        <Cupcake x="30%" y="12%" />
        <Cupcake x="65%" y="10%" />
      </div>

      {/* CAKE */}
      <div className="cake-wrapper" style={{ transform: `scale(${scale}) ${phase === 'eating' || phase === 'card' ? 'translateY(1000px)' : ''}`, transition: 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <AnimatePresence>
          {phase === 'cutting' && (
            <motion.div initial={{ x: -500, rotate: -30 }} animate={{ x: 200, rotate: 0 }} className="knife-3d" />
          )}
        </AnimatePresence>
        
        <div className="cake-3d">
          <Tier size={160} height={90} index={0} candles={tierCandles[0]} candlesLit={candlesLit} />
          <Tier size={280} height={110} index={1} candles={tierCandles[1]} candlesLit={candlesLit} />
          <Tier size={400} height={130} index={2} candles={tierCandles[2]} candlesLit={candlesLit} />
          <Tier size={520} height={150} index={3} candles={tierCandles[3]} candlesLit={candlesLit} />
        </div>
      </div>

      {/* FEEDING SLICE */}
      <AnimatePresence>
        {phase === 'eating' && (
          <motion.div initial={{ scale: 0, y: 100 }} animate={{ scale: 1.8, y: -50 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[3000] flex flex-col items-center">
            <div className="w-48 h-48 bg-[#fffcf2] rounded-xl shadow-2xl border-b-8 border-gray-200 flex items-center justify-center">
               <span className="font-black text-purple-600 text-3xl">FOR YOU!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GREETING CARD */}
      <AnimatePresence>
        {phase === 'card' && (
          <motion.div initial={{ y: -1000 }} animate={{ y: 0 }} onAnimationComplete={() => setTimeout(()=>setCardOpen(true), 1000)} className="fixed inset-0 flex items-center justify-center z-[5000] card-perspective">
            <div className={`card-container ${cardOpen ? 'open' : ''} transition-all duration-1000`} style={{ transformStyle: 'preserve-3d' }}>
               <div className="card-half card-front flex flex-col items-center justify-center">
                  <h1 className="font-black text-5xl text-white mb-10">OPEN ME</h1>
                  <div className="text-8xl">🎁</div>
               </div>
               <div className="card-half card-back flex flex-col items-center justify-center p-12 text-center" style={{ transform: 'rotateY(180deg)', position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }}>
                  <h2 className="font-black text-4xl text-purple-700 mb-8">My Darling Baby...</h2>
                  <p className="text-2xl italic font-bold text-gray-700 leading-relaxed">
                    Happy 17th birthday my darlinggg, my babyyyyy... <br/><br/>
                    I lovee you soo muchhh! You make every day feel like a celebration.
                  </p>
                  <div className="mt-12 text-6xl">❤️❤️❤️</div>
               </div>
            </div>
            {cardOpen && <Confetti />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
