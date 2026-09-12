import React, { useState } from 'react';
import { 
  CloudRain, 
  Radar, 
  Layers, 
  Play, 
  Pause, 
  Info, 
  TrendingUp, 
  Maximize2,
  Wind,
  Droplets
} from 'lucide-react';
import { cn } from '../lib/utils';

interface RadarRainfallPanelProps {
  theme: 'light' | 'dark';
  currentRainfallMmHr: number;
  timeOffsetMin: number;
  onClose?: () => void;
}

export default function RadarRainfallPanel({
  theme,
  currentRainfallMmHr,
  timeOffsetMin,
  onClose
}: RadarRainfallPanelProps) {
  const [isPlayingRadar, setIsPlayingRadar] = useState(true);

  // Doppler reflectivity dBZ scale calculation
  // Z = 200 * R^1.6 (Marshall-Palmer relation)
  // dBZ = 10 * log10(Z)
  const zVal = 200 * Math.pow(Math.max(0.1, currentRainfallMmHr), 1.6);
  const currentDbz = Math.min(65, Math.max(10, Math.round(10 * Math.log10(zVal))));

  const radarForecast = [
    { min: 0, rain: 14, dbz: 28, status: 'Light Rain' },
    { min: 30, rain: 28, dbz: 38, status: 'Moderate Rain' },
    { min: 60, rain: 46, dbz: 46, status: 'Heavy Downpour' },
    { min: 90, rain: 74, dbz: 53, status: 'Intense Storm' },
    { min: 120, rain: 110, dbz: 58, status: 'Cloudburst Cell' },
    { min: 180, rain: 62, dbz: 51, status: 'Gradual Easing' }
  ];

  return (
    <div className={cn(
      "absolute top-4 left-4 backdrop-blur-md border p-4 rounded-xl shadow-2xl w-84 sm:w-96 pointer-events-auto transition-colors flex flex-col gap-3.5 z-30 max-h-[85vh] overflow-y-auto",
      theme === 'light' ? "bg-white/95 border-slate-200" : "bg-slate-900/95 border-slate-700"
    )}>
      {/* Header */}
      <div className={cn("flex justify-between items-center border-b pb-2", theme === 'light' ? 'border-slate-200' : 'border-slate-800')}>
        <div className="flex items-center gap-2">
          <Radar className={cn("w-4 h-4", theme === 'light' ? "text-blue-600" : "text-cyan-400")} />
          <h3 className={cn("text-xs font-bold tracking-widest uppercase", theme === 'light' ? "text-slate-800" : "text-slate-300")}>
            Doppler Weather Radar
          </h3>
        </div>
        <div className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 uppercase flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
          S-Band Polarimetric
        </div>
      </div>

      {/* Required Prototype Notice */}
      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 flex items-center gap-2">
        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>
          <strong>DEMO / SIMULATION MODE:</strong> Coupled IMD Doppler radar reflectivity feed (Ready for DWR API).
        </span>
      </div>

      {/* Radar Reflectivity Visual Simulation Display */}
      <div className="relative h-44 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
        {/* Concentric Radar Range Rings */}
        <div className="absolute w-36 h-36 rounded-full border border-cyan-500/20" />
        <div className="absolute w-24 h-24 rounded-full border border-cyan-500/25" />
        <div className="absolute w-12 h-12 rounded-full border border-cyan-500/30" />
        <div className="absolute w-full h-[1px] bg-cyan-500/15" />
        <div className="absolute h-full w-[1px] bg-cyan-500/15" />

        {/* Doppler Storm Cell Simulation */}
        <div 
          className="absolute w-28 h-28 rounded-full blur-xl pointer-events-none opacity-80 animate-pulse"
          style={{
            background: currentDbz >= 55 
              ? 'radial-gradient(circle, rgba(239,68,68,0.9) 0%, rgba(249,115,22,0.7) 40%, rgba(234,179,8,0.4) 70%, transparent 100%)' 
              : currentDbz >= 40
                ? 'radial-gradient(circle, rgba(249,115,22,0.8) 0%, rgba(234,179,8,0.6) 40%, rgba(34,197,94,0.3) 70%, transparent 100%)'
                : 'radial-gradient(circle, rgba(34,197,94,0.8) 0%, rgba(56,189,248,0.5) 50%, transparent 100%)'
          }}
        />

        {/* Sweep Line */}
        {isPlayingRadar && (
          <div 
            className="absolute w-44 h-44 rounded-full pointer-events-none"
            style={{
              background: 'conic-gradient(from 0deg, rgba(6,182,212,0.3) 0deg, rgba(6,182,212,0) 60deg)',
              animation: 'spin 4s linear infinite'
            }}
          />
        )}

        {/* Center Radar Station Marker */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 border border-white shadow-lg shadow-cyan-400/50" />
          <span className="text-[9px] font-mono text-cyan-300 bg-slate-900/80 px-1.5 py-0.5 rounded mt-1 border border-cyan-800">
            DWR RADAR SITE
          </span>
        </div>

        {/* Radar Range Labels */}
        <div className="absolute bottom-2 left-2 text-[9px] font-mono text-slate-400">
          Range: 15 km • Elevation Angle: 0.5°
        </div>
        <div className="absolute top-2 right-2 text-[10px] font-mono font-bold text-cyan-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
          {currentDbz} dBZ
        </div>
      </div>

      {/* dBZ Reflectivity Color Scale */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>Reflectivity Scale (dBZ)</span>
          <span className="font-mono text-cyan-400 font-bold">{currentRainfallMmHr} mm/hr</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden flex">
          <div className="flex-1 bg-sky-400" title="10-20 dBZ (Drizzle)" />
          <div className="flex-1 bg-emerald-500" title="20-30 dBZ (Light Rain)" />
          <div className="flex-1 bg-yellow-400" title="30-40 dBZ (Moderate Rain)" />
          <div className="flex-1 bg-orange-500" title="40-50 dBZ (Heavy Rain)" />
          <div className="flex-1 bg-red-600" title="50-60 dBZ (Torrential)" />
          <div className="flex-1 bg-purple-600" title="60+ dBZ (Extreme Cloudburst)" />
        </div>
        <div className="flex justify-between text-[9px] text-slate-500 font-mono">
          <span>15 Light</span>
          <span>35 Mod</span>
          <span>45 Heavy</span>
          <span>55+ Cloudburst</span>
        </div>
      </div>

      {/* 0-3h Rainfall Nowcast Timeline Bar Chart */}
      <div className="space-y-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-500" />
            0–3 Hour Rain Nowcast
          </span>
          <span className="text-[10px] font-mono text-slate-400">Lagrangian Advection</span>
        </div>

        <div className="grid grid-cols-6 gap-1 pt-1">
          {radarForecast.map(f => {
            const isCurrent = f.min === timeOffsetMin;
            const heightPct = Math.min(100, Math.round((f.rain / 110) * 100));

            return (
              <div key={f.min} className="flex flex-col items-center gap-1">
                <div className="h-16 w-full bg-slate-200 dark:bg-slate-800 rounded-md flex items-end p-0.5 relative">
                  <div 
                    className={cn(
                      "w-full rounded-sm transition-all duration-500",
                      f.rain >= 70 ? "bg-rose-500" : f.rain >= 40 ? "bg-amber-500" : "bg-cyan-500",
                      isCurrent && "ring-2 ring-white shadow-lg"
                    )}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className={cn(
                  "text-[9px] font-mono font-bold",
                  isCurrent ? "text-cyan-400" : "text-slate-400"
                )}>
                  {f.min === 0 ? 'NOW' : `+${f.min}m`}
                </span>
                <span className="text-[8px] font-mono text-slate-500">
                  {f.rain}mm
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
