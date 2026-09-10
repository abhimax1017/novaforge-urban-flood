import React from 'react';
import { Play, Pause, Minimize2, Maximize2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';

interface TimelineSliderProps {
  timeOffsetMin: number;
  setTimeOffsetMin: (min: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  theme: 'light' | 'dark';
}

const STOPS = [0, 30, 60, 90, 120, 180];

export default function TimelineSlider({ timeOffsetMin, setTimeOffsetMin, isPlaying, setIsPlaying, theme }: TimelineSliderProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (isMinimized) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className={cn(
          "mx-auto backdrop-blur-md rounded-full p-2 pr-4 flex items-center gap-3 shadow-2xl transition-colors border cursor-pointer hover:scale-105",
          theme === 'light' ? "bg-white/90 border-slate-200" : "bg-slate-900/80 border-slate-700/50"
        )}
        style={{ width: 'fit-content' }}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
          className="w-10 h-10 flex-shrink-0 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/30"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
        </button>
        <div className="flex flex-col justify-center">
           <div className={cn("text-[9px] font-bold uppercase", theme === 'light' ? 'text-slate-500' : 'text-slate-400')}>Timeline</div>
           <div className={cn("text-sm font-bold font-mono tracking-tight", timeOffsetMin > 120 ? (theme === 'light' ? "text-red-600" : "text-red-400") : timeOffsetMin > 60 ? (theme === 'light' ? "text-orange-600" : "text-orange-400") : (theme === 'light' ? "text-blue-600" : "text-blue-400"))}>
             {timeOffsetMin === 0 ? 'LIVE' : `+${timeOffsetMin} MIN`}
           </div>
        </div>
        <Maximize2 className={cn("w-4 h-4 ml-2 opacity-50", theme === 'light' ? "text-slate-500" : "text-slate-400")} />
      </div>
    );
  }

  
  const handleStopClick = (stop: number) => {
    setTimeOffsetMin(stop);
    setIsPlaying(false);
  };

  return (
    <div className={cn(
      "w-full backdrop-blur-md rounded-xl p-4 flex items-center gap-6 shadow-2xl transition-colors border",
      theme === 'light' ? "bg-white/90 border-slate-200" : "bg-slate-900/80 border-slate-700/50"
    )}>
      <button 
        onClick={() => setIsPlaying(!isPlaying)}
        className="w-10 h-10 flex-shrink-0 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/30"
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
      </button>

      <div className="flex-1 relative h-12 flex flex-col justify-center">
        {/* Track */}
        <div className={cn("absolute left-0 right-0 h-1.5 rounded-full overflow-hidden", theme === 'light' ? "bg-slate-200" : "bg-slate-800")}>
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-orange-500 to-red-600 transition-all duration-300 ease-linear"
            style={{ width: `${(timeOffsetMin / 180) * 100}%` }}
          />
        </div>

        {/* Stops */}
        <div className="absolute inset-0 flex justify-between items-center pointer-events-none px-1">
          {STOPS.map((stop) => {
            const isPassed = timeOffsetMin >= stop;
            const isCurrent = timeOffsetMin === stop;
            return (
              <div key={stop} className="relative flex flex-col items-center group pointer-events-auto cursor-pointer" onClick={() => handleStopClick(stop)}>
                <div className={cn(
                  "w-3 h-3 rounded-full transition-all duration-300 z-10 border-2",
                  isCurrent ? (theme === 'light' ? "bg-blue-600 border-white scale-150 shadow-md" : "bg-white border-blue-500 scale-150 shadow-[0_0_10px_rgba(59,130,246,0.8)]") : 
                  isPassed ? "bg-blue-500 border-transparent" : (theme === 'light' ? "bg-slate-300 border-transparent group-hover:bg-slate-400" : "bg-slate-700 border-transparent group-hover:bg-slate-500")
                )} />
                <div className={cn(
                  "absolute top-5 text-[10px] font-bold whitespace-nowrap transition-colors",
                  isCurrent ? (theme === 'light' ? "text-slate-900" : "text-white") : isPassed ? (theme === 'light' ? "text-slate-600" : "text-slate-300") : "text-slate-500 group-hover:text-slate-400"
                )}>
                  {stop === 0 ? 'NOW' : `+${stop}m`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="w-24 text-right flex-shrink-0">
        <div className={cn("text-xs font-medium", theme === 'light' ? 'text-slate-500' : 'text-slate-400')}>PREDICTION</div>
        <div className={cn(
          "text-lg font-bold font-mono tracking-tight",
          timeOffsetMin > 120 ? (theme === 'light' ? "text-red-600" : "text-red-400") : timeOffsetMin > 60 ? (theme === 'light' ? "text-orange-600" : "text-orange-400") : (theme === 'light' ? "text-blue-600" : "text-blue-400")
        )}>
          {timeOffsetMin === 0 ? 'LIVE' : `+${timeOffsetMin} MIN`}
        </div>
      </div>
      <button onClick={() => setIsMinimized(true)} className={cn("ml-2 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors", theme === 'light' ? "text-slate-400" : "text-slate-500")}>
        <Minimize2 className="w-4 h-4" />
      </button>
    </div>
  );
}
