import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  CloudRain, 
  AlertOctagon, 
  Zap, 
  RotateCcw, 
  Check, 
  Clock, 
  Droplets, 
  ShieldAlert, 
  ArrowRight,
  Info,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { WhatIfConfig } from '../types';

interface WhatIfSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WhatIfConfig;
  onApplyConfig: (newConfig: WhatIfConfig) => void;
  onResetConfig?: () => void;
  currentResult?: {
    maxDepthCm: number;
    floodedAreaKm2: number;
    drainLoadPct: number;
    timeToFloodMin: number;
    roadsAtRiskCount: number;
  };
}

export default function WhatIfSimulatorModal({
  isOpen,
  onClose,
  config,
  onApplyConfig,
  onResetConfig,
  currentResult
}: WhatIfSimulatorModalProps) {
  const [localConfig, setLocalConfig] = useState<WhatIfConfig>(config);

  useEffect(() => {
    if (isOpen) {
      setLocalConfig(config);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  // Immediate recalculation for preview
  const rain = localConfig.rainfallMmHr;
  const blockage = localConfig.drainBlockagePct;
  const pump = localConfig.pumpCapacityM3s;

  const effectiveLoad = Math.round((rain / 35) * 65 * (1 + (blockage / 100) * 1.2) - (pump * 0.8));
  const peakDepthCm = Math.max(0, Math.min(130, Math.round((rain * 0.42) * (1 + (blockage / 100) * 1.5) - (pump * 0.5))));
  const timeToFloodMin = peakDepthCm >= 15 ? Math.max(5, Math.round(180 - (rain * 1.1) - (blockage * 0.9) + (pump * 0.8))) : 180;
  const backflowRate = blockage > 20 || rain > 60 ? Number((Math.max(0, (effectiveLoad - 100) * 0.12)).toFixed(1)) : 0;

  const presets = [
    {
      name: 'Nominal Baseline',
      desc: 'Moderate rain, zero blockage, standard pumps',
      cfg: { rainfallMmHr: 35, drainBlockagePct: 0, drainCapacityMultiplier: 1.0, pumpCapacityM3s: 12, forecastDurationMin: 60 }
    },
    {
      name: 'Monsoon Cloudburst',
      desc: 'Severe 110 mm/hr downpour with 35% debris choke',
      cfg: { rainfallMmHr: 110, drainBlockagePct: 35, drainCapacityMultiplier: 1.0, pumpCapacityM3s: 12, forecastDurationMin: 90 }
    },
    {
      name: 'Underpass Catastrophic Choke',
      desc: '130 mm/hr storm + 80% trunk drain blockage',
      cfg: { rainfallMmHr: 130, drainBlockagePct: 80, drainCapacityMultiplier: 1.0, pumpCapacityM3s: 5, forecastDurationMin: 120 }
    },
    {
      name: 'Emergency Pumping Response',
      desc: 'High rain (85 mm/hr) mitigated by max 45 m³/s pump station boost',
      cfg: { rainfallMmHr: 85, drainBlockagePct: 25, drainCapacityMultiplier: 1.2, pumpCapacityM3s: 45, forecastDurationMin: 60 }
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Hydrodynamic "What-If" Scenario Simulator
                </h2>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">
                  SIH26085 §15
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Adjust hydraulic parameters to observe dynamic downstream street inundation and time-to-flood impacts.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* Quick Presets */}
          <div>
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block mb-2">
              Hydraulic Scenario Presets
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {presets.map(p => (
                <button
                  key={p.name}
                  onClick={() => setLocalConfig(p.cfg)}
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800 hover:border-cyan-500/40 text-left transition-all group"
                >
                  <div className="font-bold text-xs text-slate-200 group-hover:text-cyan-300">
                    {p.name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {p.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Sliders */}
          <div className="space-y-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
            {/* 1. Rainfall Intensity */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <CloudRain className="w-3.5 h-3.5 text-blue-400" />
                  Precipitation Intensity:
                </label>
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800">
                  {localConfig.rainfallMmHr} mm/hr
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="150"
                step="5"
                value={localConfig.rainfallMmHr}
                onChange={(e) => setLocalConfig({ ...localConfig, rainfallMmHr: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0 mm/hr (Dry)</span>
                <span>45 mm/hr (Heavy)</span>
                <span>90 mm/hr (Downpour)</span>
                <span>150 mm/hr (Extreme)</span>
              </div>
            </div>

            {/* 2. Drain Blockage */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
                  Stormwater Drain Blockage / Silt Debris:
                </label>
                <span className={cn(
                  "text-xs font-mono font-bold px-2 py-0.5 rounded border",
                  localConfig.drainBlockagePct > 50 
                    ? "bg-rose-950/60 text-rose-300 border-rose-800" 
                    : "bg-amber-950/50 text-amber-300 border-amber-800"
                )}>
                  {localConfig.drainBlockagePct}% Blockage
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={localConfig.drainBlockagePct}
                onChange={(e) => setLocalConfig({ ...localConfig, drainBlockagePct: Number(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0% (Clean conduits)</span>
                <span>25% (Partial silt)</span>
                <span>50% (Heavy debris)</span>
                <span>100% (Complete Choke)</span>
              </div>
            </div>

            {/* 3. Pump Station Discharge Capacity */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  Active Pumping Station Discharge:
                </label>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800">
                  {localConfig.pumpCapacityM3s} m³/s
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={localConfig.pumpCapacityM3s}
                onChange={(e) => setLocalConfig({ ...localConfig, pumpCapacityM3s: Number(e.target.value) })}
                className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0 m³/s (Pumps Offline)</span>
                <span>15 m³/s (Standard)</span>
                <span>30 m³/s (Auxiliary)</span>
                <span>50 m³/s (Emergency Max)</span>
              </div>
            </div>
          </div>

          {/* Real-time Dynamic Impact Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-950 to-slate-900 border border-cyan-500/30 shadow-lg">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Droplets className="w-4 h-4" />
                Simulated Downstream Hydraulic Output
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Coupled Rational + Manning Kinematics
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700">
                <div className="text-[10px] text-slate-400">Peak Street Depth</div>
                <div className={cn(
                  "text-xl sm:text-2xl font-black mt-0.5",
                  peakDepthCm >= 45 ? "text-rose-400" : peakDepthCm >= 20 ? "text-amber-400" : "text-emerald-400"
                )}>
                  {peakDepthCm} cm
                </div>
                <div className="text-[9px] text-slate-400">underpass basin</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700">
                <div className="text-[10px] text-slate-400">Time-to-Flood</div>
                <div className="text-xl sm:text-2xl font-black text-cyan-300 mt-0.5">
                  {timeToFloodMin} min
                </div>
                <div className="text-[9px] text-slate-400">hazard threshold</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700">
                <div className="text-[10px] text-slate-400">Drain System Load</div>
                <div className={cn(
                  "text-xl sm:text-2xl font-black mt-0.5",
                  effectiveLoad > 100 ? "text-rose-400" : "text-emerald-400"
                )}>
                  {effectiveLoad}%
                </div>
                <div className="text-[9px] text-slate-400">conduit capacity</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700">
                <div className="text-[10px] text-slate-400">Backflow Spill</div>
                <div className={cn(
                  "text-xl sm:text-2xl font-black mt-0.5",
                  backflowRate > 0 ? "text-rose-400" : "text-slate-400"
                )}>
                  +{backflowRate} m³/s
                </div>
                <div className="text-[9px] text-slate-400">manhole surcharge</div>
              </div>
            </div>

            {/* Causal Explanation Flow */}
            <div className="mt-3 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] font-mono flex items-center gap-2 text-slate-300">
              <span className="text-cyan-400 shrink-0 font-bold">Causal Pipeline:</span>
              <span className="truncate">
                Rainfall {rain} mm/hr + Blockage {blockage}% → Load {effectiveLoad}% {effectiveLoad > 100 ? '→ Surcharge & Backflow +' + backflowRate + ' m³/s → Road Inundation (' + peakDepthCm + 'cm)' : '→ Contained within gravity pipes'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            onClick={() => {
              const baselineConfig: WhatIfConfig = {
                rainfallMmHr: 35,
                drainBlockagePct: 0,
                drainCapacityMultiplier: 1.0,
                pumpCapacityM3s: 12,
                forecastDurationMin: 60,
                tideLevelM: 0.5,
                soilSaturationPct: 50,
                greenInfraEfficiencyPct: 30
              };
              setLocalConfig(baselineConfig);
              if (typeof onResetConfig === 'function') {
                onResetConfig();
              }
            }}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Nominal Baseline
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onApplyConfig(localConfig);
                onClose();
              }}
              className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 shadow-lg shadow-cyan-950/40 transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Apply Scenario to Live Twin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
