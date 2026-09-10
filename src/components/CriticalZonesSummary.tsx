import React from 'react';
import { AlertTriangle, Clock, MapPin } from 'lucide-react';
import { cn } from '../lib/utils';

interface CriticalZonesSummaryProps {
  zones: { name: string; time: number; depth: number }[];
  theme: 'light' | 'dark';
}

export function CriticalZonesSummary({ zones, theme }: CriticalZonesSummaryProps) {
  if (zones.length < 2) return null;

  return (
    <div className={cn(
      "p-5 border-b transition-colors flex flex-col gap-3",
      theme === 'light' ? "bg-red-50/30 border-slate-200" : "bg-red-950/10 border-slate-800"
    )}>
      <div className={cn("flex justify-between items-center border-b pb-2", theme === 'light' ? 'border-red-200' : 'border-red-900/50')}>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h3 className={cn("text-xs font-bold tracking-widest uppercase text-red-500")}>Multi-Zone Risk</h3>
        </div>
        <div className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-600 border border-red-200">
          {zones.length} CRITICAL
        </div>
      </div>
      
      <p className={cn("text-xs leading-relaxed", theme === 'light' ? "text-slate-600" : "text-slate-300")}>
        Multiple areas in this region are projected to reach severe flood levels based on current rainfall intensity.
      </p>

      <ul className="space-y-2 mt-1 max-h-[300px] overflow-y-auto hide-scrollbar pr-1">
        {zones.map((zone, idx) => (
          <li key={idx} className={cn("p-2.5 rounded border flex flex-col gap-1.5", theme === 'light' ? "bg-red-50/50 border-red-100" : "bg-red-950/20 border-red-900/30")}>
            <div className="flex justify-between items-start">
               <div className="flex items-center gap-1.5">
                 <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                 <span className={cn("text-xs font-bold leading-tight", theme === 'light' ? "text-slate-900" : "text-white")}>{zone.name}</span>
               </div>
               <span className="text-xs font-mono font-bold text-red-500 shrink-0">{zone.depth}cm</span>
            </div>
            <div className="flex items-center gap-1.5 pl-[20px]">
              <Clock className="w-3 h-3 text-orange-500" />
              <span className={cn("text-[10px] uppercase font-bold tracking-wider", theme === 'light' ? "text-slate-500" : "text-slate-400")}>
                Est. Impact: <span className={cn(zone.time === 0 ? "text-red-500" : "text-orange-500")}>
                  {zone.time === 0 ? 'IMMINENT' : `${zone.time} mins`}
                </span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
