import React from 'react';
import { 
  Mountain, 
  Waves, 
  ArrowDownRight, 
  Compass, 
  Layers, 
  AlertCircle,
  TrendingDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { DEMPoint } from '../types';
import { CatchmentBasin } from '../utils/terrainDEM';

interface DEMTerrainPanelProps {
  theme: 'light' | 'dark';
  points: DEMPoint[];
  catchments: CatchmentBasin[];
  lowPoint: { lat: number; lng: number; elevationM: number; name: string };
  highPoint: { lat: number; lng: number; elevationM: number; name: string };
  rainfallMmHr: number;
}

export default function DEMTerrainPanel({
  theme,
  points,
  catchments,
  lowPoint,
  highPoint,
  rainfallMmHr
}: DEMTerrainPanelProps) {
  return (
    <div className={cn(
      "absolute top-4 left-4 backdrop-blur-md border p-4 rounded-xl shadow-2xl w-84 sm:w-96 pointer-events-auto transition-colors flex flex-col gap-3.5 z-30 max-h-[85vh] overflow-y-auto",
      theme === 'light' ? "bg-white/95 border-slate-200" : "bg-slate-900/95 border-slate-700"
    )}>
      {/* Header */}
      <div className={cn("flex justify-between items-center border-b pb-2", theme === 'light' ? 'border-slate-200' : 'border-slate-800')}>
        <div className="flex items-center gap-2">
          <Mountain className={cn("w-4 h-4", theme === 'light' ? "text-emerald-600" : "text-emerald-400")} />
          <h3 className={cn("text-xs font-bold tracking-widest uppercase", theme === 'light' ? "text-slate-800" : "text-slate-300")}>
            DEM Terrain & 2D Routing
          </h3>
        </div>
        <div className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 uppercase flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          1-Meter LiDaR DEM
        </div>
      </div>

      <p className={cn("text-[11px] leading-relaxed", theme === 'light' ? "text-slate-600" : "text-slate-400")}>
        Kinematic wave 2D surface routing calculates downhill runoff concentration into low-elevation depression sinks and stormwater inlets.
      </p>

      {/* High and Low Point Badges */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col">
          <div className="flex items-center gap-1 text-[10px] font-bold text-rose-400 uppercase">
            <TrendingDown className="w-3.5 h-3.5" />
            Depression Sink (Lowest)
          </div>
          <span className="text-xl font-mono font-black text-rose-400 mt-0.5">
            {lowPoint.elevationM} m
          </span>
          <span className="text-[9px] text-slate-400 truncate">{lowPoint.name}</span>
        </div>

        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col">
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase">
            <Mountain className="w-3.5 h-3.5" />
            Elevated Ridge (Highest)
          </div>
          <span className="text-xl font-mono font-black text-emerald-400 mt-0.5">
            {highPoint.elevationM} m
          </span>
          <span className="text-[9px] text-slate-400 truncate">{highPoint.name}</span>
        </div>
      </div>

      {/* Hypsometric Elevation Colormap */}
      <div className="space-y-1 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between text-[10px] text-slate-400 font-bold">
          <span>Hypsometric Tint</span>
          <span className="font-mono text-cyan-400">Δh = 36m Relief</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden flex">
          <div className="flex-1 bg-cyan-700" title="508-515m (Sink Depression)" />
          <div className="flex-1 bg-emerald-600" title="515-525m (Valley Trough)" />
          <div className="flex-1 bg-yellow-500" title="525-535m (Plateau)" />
          <div className="flex-1 bg-amber-700" title="535-545m (Slope Ridge)" />
          <div className="flex-1 bg-stone-300" title="545m+ (Peak Ridge)" />
        </div>
        <div className="flex justify-between text-[9px] text-slate-500 font-mono">
          <span>508m Sink</span>
          <span>525m Valley</span>
          <span>538m Slope</span>
          <span>548m Ridge</span>
        </div>
      </div>

      {/* Delineated Catchments */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          Delineated Sub-Basins
        </span>
        <div className="space-y-1.5">
          {catchments.map(c => (
            <div 
              key={c.id}
              className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/50 flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {c.name}
                </div>
                <div className="text-[10px] text-slate-400">
                  Area: {c.areaKm2} km² • Avg Elev: {c.avgElevationM}m • Runoff Coeff: {c.runoffCoefficient}
                </div>
              </div>
              <span className={cn(
                "px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase",
                c.pondRisk === 'critical' ? "bg-rose-950 text-rose-300 border border-rose-800" : "bg-emerald-950 text-emerald-300 border border-emerald-800"
              )}>
                {c.pondRisk} Risk
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Surface Water Overland Routing Formula */}
      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 space-y-1">
        <div className="text-cyan-400 font-bold uppercase flex items-center gap-1.5">
          <Waves className="w-3.5 h-3.5" />
          Rational Method Kinematic Runoff
        </div>
        <div className="text-slate-400">
          Q = C × I × A • Manning Overland n = 0.015 (Asphalt)
        </div>
        <div className="text-emerald-400">
          Overland flow vectors converge at MG Road & Metro Underpass inlets.
        </div>
      </div>
    </div>
  );
}
