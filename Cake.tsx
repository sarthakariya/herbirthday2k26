import React from 'react';
import { motion } from 'framer-motion';

interface CakeProps {
  candlesLit: boolean[];
}

export const Cake: React.FC<CakeProps> = ({ candlesLit }) => {
  return (
    <div className="relative flex flex-col items-center justify-end select-none transform md:scale-125">
      
      {/* Candles Container */}
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
        
        {/* Frosting drips */}
        <div className="absolute -top-1 w-full h-8 flex justify-between px-2">
           {[...Array(9)].map((_, i) => (
             <div key={i} className="w-8 h-8 bg-pink-300 rounded-b-full border-b-4 border-pink-400/10 -mx-1"></div>
           ))}
        </div>
        
        <div className="z-10 text-white/40 font-bold text-6xl mix-blend-overlay tracking-widest">♥</div>
      </div>

      {/* Middle Layer */}
      <div className="w-80 h-28 bg-yellow-100 relative z-0 shadow-md -mt-2 rounded-xl border-b-4 border-yellow-200/50 flex items-center justify-center overflow-hidden">
        {/* Cream filling look */}
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_20px,rgba(255,255,255,0.4)_20px,rgba(255,255,255,0.4)_40px)]"></div>
        
        {/* Decorative frosting line */}
        <div className="absolute top-1/2 w-full h-3 bg-white/60 shadow-inner"></div>
        
        {/* Fruit bits */}
        {[...Array(8)].map((_, i) => (
           <div key={i} className="absolute w-4 h-4 bg-red-400/30 rounded-full blur-[1px]" style={{ top: `${Math.random() * 60 + 20}%`, left: `${Math.random() * 80 + 10}%` }}></div>
        ))}
      </div>

      {/* Bottom Layer */}
      <div className="w-96 h-32 bg-amber-700 relative z-0 shadow-xl -mt-2 rounded-b-3xl rounded-t-lg flex items-center justify-center overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-tr from-amber-900 via-amber-700 to-amber-600"></div>
         {/* Chocolate texture */}
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

interface CandleProps {
  isLit: boolean;
  index: number;
}

const Candle: React.FC<CandleProps> = ({ isLit, index }) => {
  // Cycle through pastel colors
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
            {/* Inner blue flame */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-2 bg-blue-500/40 rounded-full blur-[1px]"></div>
          </motion.div>
        )}
        
        {/* Smoke effect when extinguished */}
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
         {/* Stripes */}
         <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.2),rgba(255,255,255,0.2)_5px,transparent_5px,transparent_8px)]"></div>
         {/* Wick */}
         <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-[2px] h-2 bg-black/60"></div>
      </div>
    </div>
  );
};
