import React from 'react';
import { 
  Droplets, 
  Map, 
  CloudSun, 
  Activity, 
  Navigation, 
  BarChart2, 
  ShieldAlert, 
  Box, 
  Radio,
  Radar,
  Mountain,
  Sliders,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: 'light' | 'dark';
  onTriggerAlarm?: () => void;
  onOpenWhatIf?: () => void;
  onOpenValidation?: () => void;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  theme, 
  onTriggerAlarm,
  onOpenWhatIf,
  onOpenValidation
}: SidebarProps) {
  const navItems = [
    { id: 'overview', icon: Map, label: 'Live Map Twin' },
    { id: 'radar', icon: Radar, label: 'Doppler Radar' },
    { id: 'dem', icon: Mountain, label: 'DEM 2D Routing' },
    { id: 'drainage', icon: Activity, label: 'Drainage Hydraulics' },
    { id: '3d-map', icon: Box, label: '3D Digital Twin' },
    { id: 'sensors', icon: Radio, label: 'IoT Sensor Fusion' },
    { id: 'routing', icon: Navigation, label: 'Safe Evacuation' },
    { id: 'weather', icon: CloudSun, label: 'Meteo Forecast' },
    { id: 'impact', icon: BarChart2, label: 'Impact Projections' },
  ];

  return (
    <div className={cn(
      "w-16 lg:w-64 border-r flex flex-col h-full shrink-0 z-20 transition-colors",
      theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
    )}>
      {/* Brand Header */}
      <div className={cn(
        "h-16 flex items-center justify-center lg:justify-start lg:px-5 border-b",
        theme === 'light' ? "border-slate-200" : "border-slate-800"
      )}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 shrink-0">
          <Droplets className="w-5 h-5 text-white" />
        </div>
        <div className="ml-3 hidden lg:block">
          <div className={cn(
            "font-black tracking-wider text-base leading-tight flex items-center gap-1.5",
            theme === 'light' ? "text-slate-900" : "text-white"
          )}>
            <span>NOVAFORGE</span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30">
              SIH26085
            </span>
          </div>
          <div className="text-[9px] text-cyan-500 font-bold tracking-widest uppercase truncate">
            Coupled Nowcasting
          </div>
        </div>
      </div>
      
      {/* Main Navigation Items */}
      <div className="flex-1 py-4 flex flex-col gap-1 px-3 overflow-y-auto hide-scrollbar">
        <div className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1 hidden lg:block tracking-wider">
          Coupled Pipeline
        </div>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full group border text-left",
              activeTab === item.id 
                ? theme === 'light' 
                  ? "bg-cyan-50 text-cyan-700 border-cyan-300 shadow-sm font-bold"
                  : "bg-cyan-950/60 text-cyan-300 border-cyan-700/60 font-bold"
                : theme === 'light'
                  ? "text-slate-600 hover:bg-slate-50 hover:text-cyan-700 border-transparent"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-transparent"
            )}
          >
            <item.icon className={cn(
              "w-4 h-4 shrink-0 transition-colors",
              activeTab === item.id ? "text-cyan-500" : "text-slate-400 group-hover:text-cyan-400"
            )} />
            <span className="hidden lg:block text-xs font-medium tracking-wide">{item.label}</span>
          </button>
        ))}

        {/* Action triggers */}
        <div className="pt-2 pb-1 border-t border-slate-200 dark:border-slate-800/80 my-1 hidden lg:block">
          <div className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1 tracking-wider">
            Simulations & Audit
          </div>
        </div>

        {onOpenWhatIf && (
          <button
            onClick={onOpenWhatIf}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 w-full border text-left",
              "bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 dark:text-amber-300 border-amber-500/30"
            )}
          >
            <Sliders className="w-4 h-4 shrink-0 text-amber-500" />
            <span className="hidden lg:block text-xs font-bold tracking-wide">"What-If" Simulator</span>
          </button>
        )}

        {onOpenValidation && (
          <button
            onClick={onOpenValidation}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 w-full border text-left",
              "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30"
            )}
          >
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
            <span className="hidden lg:block text-xs font-bold tracking-wide">SIH Verification Suite</span>
          </button>
        )}
      </div>
      
      {/* Emergency Siren Footer */}
      <div className={cn(
        "p-3 border-t",
        theme === 'light' ? "border-slate-200" : "border-slate-800"
      )}>
        <button 
          onClick={() => {
            if (onTriggerAlarm) {
              onTriggerAlarm();
            } else {
              setActiveTab('alerts');
            }
          }}
          className={cn(
            "w-full flex items-center justify-center lg:justify-start gap-2.5 px-3 py-2.5 border rounded-xl transition-colors cursor-pointer shadow-sm",
            theme === 'light' 
              ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300" 
              : "bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border-rose-900/60"
          )}
        >
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500 animate-pulse" />
          <span className="hidden lg:block text-xs font-black tracking-wider uppercase">EMERGENCY ALARM</span>
        </button>
      </div>
    </div>
  );
}
