import React from 'react';
import { Activity, GitMerge, AlertOctagon, TrendingUp, Cpu } from 'lucide-react';
import { cn } from '../lib/utils';
import { PredictionData } from '../types';

interface DrainagePanelProps {
  theme: 'light' | 'dark';
  prediction: PredictionData | null;
}

export function DrainagePanel({ theme, prediction }: DrainagePanelProps) {
  const intensity = prediction?.rainfallIntensityMm || 0;
  
  // Calculate synthetic hydraulic stats based on rain intensity
  const systemCapacity = Math.min(100, Math.max(20, (intensity / 40) * 100));
  const activeSurcharges = Math.floor(systemCapacity / 15);
  const backflowNodes = Math.floor(systemCapacity / 25);

  return (
    <div className={cn(
      "absolute top-4 left-4 backdrop-blur-md border p-4 rounded-xl shadow-2xl w-80 pointer-events-auto transition-colors flex flex-col gap-4 z-30",
      theme === 'light' ? "bg-white/95 border-slate-200" : "bg-slate-900/95 border-slate-700"
    )}>
      <div className={cn("flex justify-between items-center border-b pb-2", theme === 'light' ? 'border-slate-200' : 'border-slate-800')}>
        <div className="flex items-center gap-2">
          <Activity className={cn("w-4 h-4", theme === 'light' ? "text-slate-700" : "text-white")} />
          <h3 className={cn("text-xs font-bold tracking-widest uppercase", theme === 'light' ? "text-slate-800" : "text-slate-300")}>Hydraulic Graph Model</h3>
        </div>
        <div className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-600 border border-emerald-200 uppercase flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Coupled DEM
        </div>
      </div>
      
      <p className={cn("text-[11px] leading-relaxed", theme === 'light' ? "text-slate-600" : "text-slate-400")}>
        Fusing real-time Doppler radar nowcasts with high-resolution Digital Elevation Models (DEM) and the city's underground stormwater directed graph.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div className={cn("p-2 rounded-lg border flex flex-col gap-1", theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950/50 border-slate-800")}>
          <div className="flex items-center gap-1.5">
            <GitMerge className="w-3.5 h-3.5 text-blue-500" />
            <span className={cn("text-[10px] font-bold uppercase", theme === 'light' ? "text-slate-500" : "text-slate-400")}>Edges</span>
          </div>
          <span className={cn("text-lg font-mono font-bold leading-none", theme === 'light' ? "text-slate-800" : "text-white")}>
            Pipes
          </span>
          <span className="text-[10px] text-blue-500 font-medium">Flow Simulation</span>
        </div>
        
        <div className={cn("p-2 rounded-lg border flex flex-col gap-1", theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950/50 border-slate-800")}>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-purple-500" />
            <span className={cn("text-[10px] font-bold uppercase", theme === 'light' ? "text-slate-500" : "text-slate-400")}>Nodes</span>
          </div>
          <span className={cn("text-lg font-mono font-bold leading-none", theme === 'light' ? "text-slate-800" : "text-white")}>
            Manholes
          </span>
          <span className="text-[10px] text-purple-500 font-medium">Inlet Capacity</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-1">
        <div className="flex justify-between items-end mb-1">
          <span className={cn("text-xs font-bold uppercase", theme === 'light' ? "text-slate-700" : "text-slate-300")}>System Capacity Load</span>
          <span className={cn("text-xs font-mono font-bold", systemCapacity > 85 ? "text-red-500" : systemCapacity > 60 ? "text-orange-500" : "text-blue-500")}>
            {systemCapacity.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-1000",
              systemCapacity > 85 ? "bg-red-500" : systemCapacity > 60 ? "bg-orange-500" : "bg-blue-500"
            )} 
            style={{ width: `${systemCapacity}%` }} 
          />
        </div>
      </div>

      {(activeSurcharges > 0 || backflowNodes > 0) && (
        <div className={cn("p-3 rounded-lg border flex flex-col gap-2 mt-2", theme === 'light' ? "bg-red-50 border-red-200" : "bg-red-950/20 border-red-900/40")}>
          <div className="flex items-center gap-2 text-red-500 font-bold uppercase text-[10px] tracking-wider">
            <AlertOctagon className="w-3.5 h-3.5" />
            Hydraulic Overcapacity
          </div>
          <div className="grid grid-cols-2 gap-2 text-red-700 dark:text-red-400">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase opacity-80">Surcharges</span>
              <span className="font-mono font-bold text-sm">{activeSurcharges} Active</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase opacity-80">Backflow Events</span>
              <span className="font-mono font-bold text-sm">{backflowNodes} Nodes</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
