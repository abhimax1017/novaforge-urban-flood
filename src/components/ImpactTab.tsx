import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { cn } from '../lib/utils';
import { PredictionData } from '../types';

interface ImpactTabProps {
  prediction: PredictionData;
  theme: 'light' | 'dark';
}

export function ImpactTab({ prediction, theme }: ImpactTabProps) {
  const chartData = useMemo(() => {
    // Generate 3-hour projection data (every 30 mins)
    const data = [];
    const now = new Date();
    
    // Base capacity in some unit (e.g., thousands of cubic meters)
    const baseCapacity = 120;
    
    for (let i = 0; i <= 6; i++) {
      const time = new Date(now.getTime() + i * 30 * 60000);
      
      // Simulate water volume rising then falling based on rainfall intensity
      // Simple quadratic-ish curve
      let waterVolume = 50 + (prediction.rainfallIntensityMm * 2.5 * (i / 2)) - (i * i * 1.5);
      if (waterVolume < 40) waterVolume = 40 + Math.random() * 10;
      
      data.push({
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        waterVolume: Math.max(0, waterVolume).toFixed(1),
        capacity: baseCapacity
      });
    }
    return data;
  }, [prediction]);

  return (
    <div className="flex-1 flex flex-col p-5">
      <h2 className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-4">Impact Projections</h2>
      
      <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        3-Hour projection of total urban water volume versus maximum drainage network capacity.
      </div>
      
      <div className={cn(
        "flex-1 min-h-[300px] border rounded-lg p-4",
        theme === 'light' ? "bg-white border-slate-200" : "bg-slate-950 border-slate-800"
      )}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme === 'light' ? '#3b82f6' : '#60a5fa'} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={theme === 'light' ? '#3b82f6' : '#60a5fa'} stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? '#e2e8f0' : '#334155'} vertical={false} />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 10, fill: theme === 'light' ? '#64748b' : '#94a3b8' }} 
              axisLine={false} 
              tickLine={false} 
            />
            <YAxis 
              tick={{ fontSize: 10, fill: theme === 'light' ? '#64748b' : '#94a3b8' }} 
              axisLine={false} 
              tickLine={false} 
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: theme === 'light' ? '#ffffff' : '#0f172a', 
                borderColor: theme === 'light' ? '#e2e8f0' : '#334155', 
                fontSize: '12px',
                borderRadius: '8px'
              }}
              itemStyle={{ color: theme === 'light' ? '#0f172a' : '#f8fafc' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            
            <ReferenceLine y={120} label={{ position: 'top', value: 'Overflow Threshold', fill: '#ef4444', fontSize: 10 }} stroke="#ef4444" strokeDasharray="3 3" />
            
            <Area 
              type="monotone" 
              dataKey="waterVolume" 
              name="Water Volume"
              stroke={theme === 'light' ? '#3b82f6' : '#60a5fa'} 
              fillOpacity={1} 
              fill="url(#colorVolume)" 
            />
            <Area 
              type="step" 
              dataKey="capacity" 
              name="Drainage Capacity"
              stroke={theme === 'light' ? '#10b981' : '#34d399'} 
              fill="none" 
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
