import React, { useMemo } from 'react';
import { CloudRain, Wind, Droplets, Cloud, CloudLightning, AlertTriangle, TrendingUp } from 'lucide-react';
import { Location } from '../types';
import { cn } from '../lib/utils';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

interface WeatherPanelProps {
  location: Location;
  theme: 'light' | 'dark';
  weather: any;
  loading: boolean;
  isLive: boolean;
}

export default function WeatherPanel({ location, theme, weather, loading, isLive }: WeatherPanelProps) {
  const chartData = useMemo(() => {
    if (!weather?.forecast?.precipitation) return [];
    let currentLevel = 0.5; // Base level in meters
    return weather.forecast.precipitation.map((precip: number, idx: number) => {
      currentLevel += (precip * 0.1); // Rain increases level
      currentLevel -= 0.05; // Natural drainage
      if (currentLevel < 0.2) currentLevel = 0.2;
      
      return {
        time: new Date(weather.forecast.times[idx]).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        level: Number(currentLevel.toFixed(2))
      };
    });
  }, [weather]);

  if (loading || !weather) return null;

  const current = weather.current;
  const forecast = weather.forecast;
  const alert = weather.alert;

  return (
    <div className={cn(
      "p-5 border-b transition-colors flex flex-col gap-4",
      theme === 'light' ? "bg-slate-50/50 border-slate-200" : "bg-slate-900/50 border-slate-800"
    )}>
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-xs font-bold text-slate-500 tracking-widest uppercase">Live Weather</h2>
        <div className={cn(
          "text-[9px] font-bold px-2 py-0.5 rounded border flex items-center gap-1",
          theme === 'light' ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-slate-800 text-slate-400 border-slate-700"
        )}>
          {isLive && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
          {isLive ? 'LIVE' : 'DEMO'}
        </div>
      </div>

      {alert && (
        <div className={cn(
          "rounded-lg p-3 border animate-pulse",
          alert.level === 'CRITICAL' 
            ? (theme === 'light' ? "bg-red-50 border-red-200" : "bg-red-950/40 border-red-900/50")
            : (theme === 'light' ? "bg-orange-50 border-orange-200" : "bg-orange-950/40 border-orange-900/50")
        )}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={cn("w-5 h-5 shrink-0 mt-0.5", alert.level === 'CRITICAL' ? "text-red-500" : "text-orange-500")} />
            <div>
              <div className={cn("text-xs font-bold uppercase", alert.level === 'CRITICAL' ? "text-red-600" : "text-orange-600")}>
                {alert.level} FLOOD RISK ({alert.triggerTime})
              </div>
              <div className={cn("text-xs mt-1 leading-relaxed", theme === 'light' ? "text-slate-700" : "text-slate-300")}>
                {alert.message}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-end justify-between">
        <div>
          <div className={cn("text-3xl font-bold font-mono leading-none", theme === 'light' ? "text-slate-900" : "text-white")}>{current.temperature.toFixed(1)}°</div>
          <div className={cn("text-sm capitalize mt-1", theme === 'light' ? "text-slate-600" : "text-slate-400")}>{current.description}</div>
        </div>
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center border",
          theme === 'light' ? "bg-blue-50 border-blue-100" : "bg-blue-900/30 border-blue-800/50"
        )}>
          {current.rainfall > 0 ? <CloudRain className={cn("w-6 h-6", theme === 'light' ? "text-blue-500" : "text-blue-400")} /> : <Cloud className={cn("w-6 h-6", theme === 'light' ? "text-slate-400" : "text-slate-400")} />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={cn(
          "rounded p-2 border flex flex-col items-center justify-center",
          theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950/50 border-slate-800/50"
        )}>
          <Droplets className={cn("w-4 h-4 mb-1", theme === 'light' ? "text-blue-500" : "text-blue-400")} />
          <div className={cn("text-xs uppercase font-bold", theme === 'light' ? "text-slate-500" : "text-slate-500")}>Humidity</div>
          <div className={cn("font-bold font-mono", theme === 'light' ? "text-slate-800" : "text-white")}>{current.humidity}%</div>
        </div>
        <div className={cn(
          "rounded p-2 border flex flex-col items-center justify-center",
          theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950/50 border-slate-800/50"
        )}>
          <Wind className={cn("w-4 h-4 mb-1", theme === 'light' ? "text-slate-400" : "text-slate-400")} />
          <div className={cn("text-xs uppercase font-bold", theme === 'light' ? "text-slate-500" : "text-slate-500")}>Wind</div>
          <div className={cn("font-bold font-mono", theme === 'light' ? "text-slate-800" : "text-white")}>{current.windSpeed.toFixed(1)} m/s</div>
        </div>
      </div>

      <div className={cn(
        "border rounded-lg p-3",
        theme === 'light' ? "bg-blue-50/50 border-blue-100" : "bg-blue-950/20 border-blue-900/40"
      )}>
        <div className="flex justify-between items-center mb-2">
          <div className={cn("text-xs font-bold uppercase", theme === 'light' ? "text-blue-600" : "text-blue-400")}>3-Hour Forecast</div>
          <CloudLightning className={cn("w-4 h-4", theme === 'light' ? "text-blue-500" : "text-blue-500")} />
        </div>
        
        {forecast && forecast.precipitation && forecast.precipitation.length > 0 && (
          <div className="flex gap-2 mt-3">
            {forecast.precipitation.map((precip: number, idx: number) => {
              const timeStr = new Date(forecast.times[idx]).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
              return (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div className={cn("text-[10px] mb-1", theme === 'light' ? "text-slate-500" : "text-slate-400")}>{timeStr}</div>
                  <div className={cn(
                    "w-full rounded-t-sm flex items-end justify-center pb-1",
                    theme === 'light' ? "bg-blue-200" : "bg-blue-900/60"
                  )} style={{ height: '40px' }}>
                    <div className={cn("w-full transition-all duration-500 rounded-t-sm", theme === 'light' ? "bg-blue-500" : "bg-blue-400")} style={{ height: `${Math.min(100, Math.max(10, (precip / 10) * 100))}%` }} />
                  </div>
                  <div className={cn("text-xs font-bold mt-1 font-mono", theme === 'light' ? "text-blue-700" : "text-blue-300")}>{precip.toFixed(1)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {chartData.length > 0 && (
        <div className={cn(
          "border rounded-lg p-3",
          theme === 'light' ? "bg-cyan-50/50 border-cyan-100" : "bg-cyan-950/20 border-cyan-900/40"
        )}>
          <div className="flex justify-between items-center mb-3">
            <div className={cn("text-xs font-bold uppercase", theme === 'light' ? "text-cyan-600" : "text-cyan-400")}>Est. Water Level Trend</div>
            <TrendingUp className={cn("w-4 h-4", theme === 'light' ? "text-cyan-500" : "text-cyan-500")} />
          </div>
          <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme === 'light' ? '#06b6d4' : '#22d3ee'} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={theme === 'light' ? '#06b6d4' : '#22d3ee'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis dataKey="level" tick={{ fontSize: 10, fill: theme === 'light' ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: theme === 'light' ? '#ffffff' : '#0f172a', borderColor: theme === 'light' ? '#e2e8f0' : '#334155', fontSize: '12px' }}
                  itemStyle={{ color: theme === 'light' ? '#06b6d4' : '#22d3ee' }}
                  labelStyle={{ color: theme === 'light' ? '#64748b' : '#94a3b8', marginBottom: '4px' }}
                  formatter={(value: number) => [`${value}m`, 'Water Level']}
                />
                <Area type="monotone" dataKey="level" stroke={theme === 'light' ? '#06b6d4' : '#22d3ee'} strokeWidth={2} fillOpacity={1} fill="url(#colorLevel)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
