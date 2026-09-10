import React from 'react';
import { Droplets, Map, CloudSun, Activity, Navigation, BarChart2, ShieldAlert, Box, Radio } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: 'light' | 'dark';
  onTriggerAlarm?: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, theme, onTriggerAlarm }: SidebarProps) {
  const navItems = [
    { id: 'overview', icon: Map, label: 'Live Map' },
    { id: 'weather', icon: CloudSun, label: 'Live Forecast' },
    { id: '3d-map', icon: Box, label: '3D View' },
    { id: 'drainage', icon: Activity, label: 'Drainage Network' },
    { id: 'sensors', icon: Radio, label: 'Sensor Fusion' },
    { id: 'routing', icon: Navigation, label: 'Safe Routing' },
    { id: 'impact', icon: BarChart2, label: 'Impact Projections' },
  ];

  return (
    <div className={cn(
      "w-16 lg:w-64 border-r flex flex-col h-full shrink-0 z-20 transition-colors",
      theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
    )}>
      <div className={cn(
        "h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b",
        theme === 'light' ? "border-slate-200" : "border-slate-800"
      )}>
        <Droplets className="w-8 h-8 text-blue-500 shrink-0" />
        <div className="ml-3 hidden lg:block">
          <div className={cn(
            "font-bold tracking-widest text-lg leading-tight",
            theme === 'light' ? "text-slate-900" : "text-white"
          )}>AQUASENSE</div>
          <div className="text-[9px] text-blue-500 font-medium tracking-widest uppercase">Flood Intelligence</div>
        </div>
      </div>
      
      <div className="flex-1 py-6 flex flex-col gap-2 px-3 overflow-y-auto hide-scrollbar">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 w-full group border",
              activeTab === item.id 
                ? theme === 'light' 
                  ? "bg-blue-50 text-blue-600 border-blue-200 shadow-sm"
                  : "bg-blue-600/20 text-blue-400 border-blue-500/30"
                : theme === 'light'
                  ? "text-slate-600 hover:bg-slate-50 hover:text-blue-600 border-transparent"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-transparent"
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="hidden lg:block text-sm font-medium tracking-wide text-left">{item.label}</span>
          </button>
        ))}
      </div>
      
      <div className={cn(
        "p-4 border-t",
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
            "w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-3 border rounded-lg transition-colors cursor-pointer",
            theme === 'light' ? "bg-red-50 hover:bg-red-100 text-red-600 border-red-200 shadow-sm" : "bg-red-950/40 hover:bg-red-900/60 text-red-400 border-red-900/50"
          )}
        >
          <ShieldAlert className="w-5 h-5 shrink-0 animate-pulse" />
          <span className="hidden lg:block text-sm font-bold tracking-wide">EMERGENCY ALARM</span>
        </button>
      </div>
    </div>
  );
}
