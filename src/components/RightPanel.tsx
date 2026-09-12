import React, { useState } from 'react';
import { AlertTriangle, Clock, Activity, CloudRain, ShieldCheck, Map, ChevronRight, ChevronLeft } from 'lucide-react';
import { PredictionData, RoadRisk } from '../types';
import { cn } from '../lib/utils';

interface RightPanelProps {
  prediction: PredictionData;
  selectedRoad: RoadRisk | null;
  theme: 'light' | 'dark';
  weather?: any;
  weatherLoading?: boolean;
  weatherIsLive?: boolean;
  criticalZones?: { name: string; time: number; depth: number }[];
  activeTab?: string;
  location?: any;
  onOpenAlertModal?: () => void;
  onOpenRouting?: () => void;
  onOpenWhatIfModal?: () => void;
  onOpenValidationModal?: () => void;
  timeToFloodMin?: number;
  confidenceScore?: number;
  drainUtilizationPct?: number;
  fusedExplanations?: string[];
}

import WeatherPanel from './WeatherPanel';
import { CriticalZonesSummary } from './CriticalZonesSummary';
import { ImpactTab } from './ImpactTab';
import { 
  BellRing, 
  Radio, 
  ChevronDown, 
  ChevronUp, 
  Sliders, 
  ShieldCheck as ShieldCheckIcon, 
  Cpu, 
  Network, 
  AlertOctagon,
  Sparkles,
  Layers
} from 'lucide-react';
import { getSocietyAlertForLocation } from '../utils/safetyRouting';
import { getRainfallRisk, RAINFALL_RISK_MATRIX } from '../utils/rainfallRisk';

export default function RightPanel({ 
  prediction, 
  selectedRoad, 
  theme, 
  weather, 
  weatherLoading, 
  weatherIsLive, 
  criticalZones, 
  activeTab, 
  location,
  onOpenAlertModal,
  onOpenRouting,
  onOpenWhatIfModal,
  onOpenValidationModal,
  timeToFloodMin = 27,
  confidenceScore = 91,
  drainUtilizationPct = 138,
  fusedExplanations = []
}: RightPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showRainfallMatrix, setShowRainfallMatrix] = useState(false);
  const [showFusionDetails, setShowFusionDetails] = useState(true);
  const societyAlert = location ? getSocietyAlertForLocation(location, prediction) : null;
  const rainfallRisk = getRainfallRisk(prediction.rainfallIntensityMm);

  if (!isOpen) {
    return (
      <div className={cn(
        "hidden lg:flex w-12 border-l flex-col h-full shrink-0 z-20 transition-colors items-center py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800",
        theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
      )} onClick={() => setIsOpen(true)}>
        <ChevronLeft className={cn("w-6 h-6", theme === 'light' ? "text-slate-400" : "text-slate-500")} />
        <div className="flex-1" />
        <div className="writing-vertical-lr transform rotate-180 text-xs font-bold text-slate-400 tracking-widest uppercase">Nowcasting Intelligence</div>
        <div className="flex-1" />
      </div>
    );
  }

  return (
    <div className={cn(
      "hidden lg:flex w-84 sm:w-96 border-l flex-col h-full shrink-0 z-20 transition-colors relative",
      theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
    )}>
      <button 
        onClick={() => setIsOpen(false)}
        className={cn(
          "absolute top-4 -left-3 w-6 h-6 rounded-full border shadow-sm flex items-center justify-center z-30 transition-colors",
          theme === 'light' ? "bg-white border-slate-200 text-slate-500 hover:bg-slate-50" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
        )}
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      <div className="overflow-y-auto hide-scrollbar flex-1 flex flex-col">
        {/* TIME-TO-FLOOD MAJOR COUNTDOWN FEATURE BANNER (SIH26085 §12) */}
        {prediction.maxDepthCm >= 15 && (
          <div className="p-3.5 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 text-white shadow-md flex items-center justify-between border-b border-rose-700 animate-in fade-in duration-300">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-black/20 animate-pulse">
                <Clock className="w-5 h-5 text-amber-200" />
              </div>
              <div>
                <div className="text-[10px] font-mono tracking-widest uppercase opacity-90 font-bold">
                  Time-To-Flood Countdown
                </div>
                <div className="text-sm sm:text-base font-black tracking-tight flex items-baseline gap-1.5">
                  <span>FLOOD IN {timeToFloodMin} MIN</span>
                  <span className="text-xs font-semibold opacity-90">({prediction.maxDepthCm}cm peak)</span>
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-black/30 font-mono text-[10px] font-bold border border-white/20">
              URGENT
            </span>
          </div>
        )}

        {/* Quick Scenario & Validation Action Bar */}
        <div className="p-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-2">
          <button
            onClick={onOpenWhatIfModal}
            className="flex-1 py-1.5 px-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <Sliders className="w-3.5 h-3.5" />
            "What-If" Simulator
          </button>

          <button
            onClick={onOpenValidationModal}
            className="py-1.5 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1 transition-all"
            title="SIH 2026 Problem Statement Verification Suite"
          >
            <ShieldCheckIcon className="w-3.5 h-3.5" />
            SIH Suite
          </button>
        </div>

        <div className={cn(
          "p-4 border-b",
          theme === 'light' ? "bg-slate-50/50 border-slate-200" : "bg-slate-900/50 border-slate-800"
        )}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-500 tracking-widest uppercase">
              Coupled Nowcast Metrics
            </h2>
            <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
              0–3h Horizon
            </span>
          </div>
        
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className={cn(
              "border rounded-lg p-2.5 transition-colors",
              theme === 'light' ? "bg-white border-slate-200" : "bg-slate-950 border-slate-800"
            )}>
              <div className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">Peak Depth</div>
              <div className="text-2xl font-bold text-rose-500 font-mono">
                {prediction.maxDepthCm}<span className="text-xs text-slate-500 ml-1">cm</span>
              </div>
              <div className="text-[9px] text-slate-400">Street low basin</div>
            </div>

            <div className={cn(
              "border rounded-lg p-2.5 transition-colors",
              theme === 'light' ? "bg-white border-slate-200" : "bg-slate-950 border-slate-800"
            )}>
              <div className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">Drain Load</div>
              <div className={cn(
                "text-2xl font-bold font-mono",
                drainUtilizationPct > 100 ? "text-rose-500" : "text-emerald-500"
              )}>
                {drainUtilizationPct}<span className="text-xs text-slate-500 ml-1">%</span>
              </div>
              <div className="text-[9px] text-slate-400">
                {drainUtilizationPct > 100 ? "Surcharge Backflow" : "Gravity Containment"}
              </div>
            </div>
          </div>

          {/* SENSOR + MODEL FUSION (CONFIDENCE ENGINE) (SIH26085 §11) */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-extrabold uppercase text-slate-300 tracking-wide">
                  Sensor + Model Fusion
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400">Confidence:</span>
                <span className="text-xs font-mono font-black text-cyan-300 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-800">
                  {confidenceScore}%
                </span>
              </div>
            </div>

            {showFusionDetails && (
              <div className="text-[10px] text-slate-400 space-y-1.5 pt-1 border-t border-slate-800/80">
                <div className="flex items-start gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1 shrink-0" />
                  <span><strong>Doppler Radar:</strong> {prediction.rainfallIntensityMm} mm/hr Lagrangian storm tracking.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 shrink-0" />
                  <span><strong>1m LiDaR DEM:</strong> 512m sink basin collecting downhill gravity runoff.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1 shrink-0" />
                  <span><strong>Drainage Graph:</strong> Manning 1D solver detects {drainUtilizationPct}% conduit utilization.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 shrink-0" />
                  <span><strong>IoT Telemetry:</strong> Ultrasonic stage sensors confirm water rise rate.</span>
                </div>
              </div>
            )}
          </div>

        {/* Rainfall in 1 hour & Risk Level Classification */}
        <div className={cn(
          "border rounded-lg p-3 transition-colors flex flex-col gap-2.5",
          theme === 'light' ? "bg-white border-slate-200" : "bg-slate-950 border-slate-800"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CloudRain className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Rainfall in 1 hour
              </span>
            </div>
            <button
              onClick={() => setShowRainfallMatrix(!showRainfallMatrix)}
              className="text-[10px] font-bold text-blue-500 hover:text-blue-600 flex items-center gap-0.5"
              title="Toggle Risk Table"
            >
              <span>{showRainfallMatrix ? 'Hide Table' : 'Risk Table'}</span>
              {showRainfallMatrix ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          <div className="flex items-baseline justify-between pt-0.5">
            <div>
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
                {rainfallRisk.rainfallCm.toFixed(1)}
              </span>
              <span className="text-xs font-bold text-slate-500 ml-1">cm</span>
              <span className="text-[10px] text-slate-400 ml-1.5 font-mono">
                ({prediction.rainfallIntensityMm} mm/hr)
              </span>
            </div>

            <div className={cn(
              "px-2 py-1 rounded-md border flex items-center gap-1.5 text-xs font-black",
              rainfallRisk.badgeBg,
              rainfallRisk.badgeText,
              rainfallRisk.badgeBorder
            )}>
              <span>{rainfallRisk.emoji}</span>
              <span>{rainfallRisk.level}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
            {rainfallRisk.description}
          </p>

          {/* Interactive Rainfall in 1 hour vs Risk Level Table */}
          {showRainfallMatrix && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-1">
              <div className="flex items-center justify-between text-[9px] font-black uppercase text-slate-400 tracking-wider px-1 pb-1">
                <span>Rainfall in 1 hour</span>
                <span>Risk Level</span>
              </div>

              <div className="flex flex-col gap-1">
                {RAINFALL_RISK_MATRIX.map((row) => {
                  const isActive = rainfallRisk.level === row.level;
                  return (
                    <div
                      key={row.range}
                      className={cn(
                        "flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-all border",
                        isActive
                          ? cn(row.borderActive, theme === 'light' ? row.bgLightActive : row.bgDarkActive, "shadow-sm font-bold ring-1 ring-blue-500/20")
                          : cn(
                              "border-transparent hover:bg-slate-50 dark:hover:bg-slate-900/40 text-slate-600 dark:text-slate-400 font-medium",
                              theme === 'light' ? "bg-slate-50/50" : "bg-slate-900/30"
                            )
                      )}
                    >
                      <div className="flex items-center gap-1.5 font-mono">
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                        <span>{row.range}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">{row.emoji}</span>
                        <span className={cn("font-bold", row.color)}>{row.level}</span>
                        {isActive && (
                          <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-blue-600 text-white font-extrabold ml-1">
                            Current
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Weather Forecast Module */}
      {weather && (
        <WeatherPanel location={location!} theme={theme} weather={weather} loading={!!weatherLoading} isLive={!!weatherIsLive} />
      )}

      {/* Society Risk Alert Module */}
      {societyAlert && (
        <div className={cn(
          "p-4 border-b flex flex-col gap-2.5",
          societyAlert.alertLevel === 'CRITICAL_ALARM'
            ? "bg-red-50/70 border-red-200 dark:bg-red-950/30 dark:border-red-900/50"
            : societyAlert.alertLevel === 'WARNING'
              ? "bg-amber-50/70 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50"
              : theme === 'light' ? "bg-slate-50/50 border-slate-200" : "bg-slate-900/50 border-slate-800"
        )}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Society Risk Alert
            </span>
            <span className={cn(
              "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase",
              societyAlert.alertLevel === 'CRITICAL_ALARM' ? "bg-red-600 text-white animate-pulse" :
              societyAlert.alertLevel === 'WARNING' ? "bg-amber-600 text-white" : "bg-blue-600 text-white"
            )}>
              {societyAlert.alertLevel.replace('_', ' ')}
            </span>
          </div>

          <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
            {societyAlert.societyName}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
            <span>Risk: <strong>{societyAlert.riskScore}%</strong></span>
            <span>Shelter: <strong>{societyAlert.shelterDistance}</strong></span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onOpenAlertModal}
              className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-sm flex items-center justify-center gap-1.5 transition-colors"
            >
              <BellRing className="w-3.5 h-3.5" />
              Sound Alarm
            </button>

            {onOpenRouting && (
              <button
                type="button"
                onClick={onOpenRouting}
                className={cn(
                  "py-1.5 px-2.5 rounded-lg text-xs font-bold border transition-colors",
                  theme === 'light' ? "bg-white hover:bg-slate-100 border-slate-300 text-slate-700" : "bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200"
                )}
              >
                Safe Routes
              </button>
            )}
          </div>
        </div>
      )}

      
      {activeTab === 'overview' && criticalZones && criticalZones.length > 0 && (
        <CriticalZonesSummary zones={criticalZones} theme={theme} />
      )}
      
      {activeTab === 'impact' && (
        <ImpactTab prediction={prediction} theme={theme} />
      )}
      <div className="p-5 flex-1 flex flex-col">
        <h2 className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-4">Location Intelligence</h2>
        
        {selectedRoad ? (
          <div className="space-y-4">
            <div>
              <div className="text-[10px] text-slate-500 uppercase mb-1">Selected Asset</div>
              <div className={cn("text-lg font-bold leading-tight", theme === 'light' ? "text-slate-900" : "text-white")}>{selectedRoad.name}</div>
            </div>

            <div className={cn(
              "p-4 rounded-lg border",
              selectedRoad.risk === 'critical' ? (theme === 'light' ? 'bg-red-50 border-red-200' : 'bg-red-950/40 border-red-900/50') :
              selectedRoad.risk === 'high' ? (theme === 'light' ? 'bg-orange-50 border-orange-200' : 'bg-orange-950/40 border-orange-900/50') :
              selectedRoad.risk === 'moderate' ? (theme === 'light' ? 'bg-yellow-50 border-yellow-200' : 'bg-yellow-950/40 border-yellow-900/50') :
              (theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700')
            )}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={cn(
                    "w-4 h-4",
                    selectedRoad.risk === 'critical' ? 'text-red-500' :
                    selectedRoad.risk === 'high' ? 'text-orange-500' : 'text-yellow-600'
                  )} />
                  <span className={cn("text-sm font-bold uppercase tracking-wider", theme === 'light' ? 'text-slate-800' : 'text-white')}>
                    {selectedRoad.risk} RISK
                  </span>
                </div>
                <div className="text-xs font-bold font-mono text-cyan-500">
                  Confidence: {selectedRoad.confidence || confidenceScore}%
                </div>
              </div>

              {/* Exact SIH26085 Metrics Grid */}
              <div className="space-y-1.5 pt-1 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-500 font-medium">Flood probability:</span>
                  <span className="font-mono font-bold text-rose-500">{selectedRoad.probability}%</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-500 font-medium">Expected depth:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{selectedRoad.depthCm} cm</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-500 font-medium">Time-to-flood:</span>
                  <span className="font-mono font-bold text-amber-500">
                    {selectedRoad.timeToFloodMin !== null ? `${selectedRoad.timeToFloodMin} min` : 'Safe (>180m)'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-500 font-medium">Drain utilization:</span>
                  <span className={cn(
                    "font-mono font-bold",
                    (selectedRoad.drainUtilizationPct || drainUtilizationPct) > 100 ? "text-rose-500" : "text-emerald-500"
                  )}>
                    {selectedRoad.drainUtilizationPct || drainUtilizationPct}%
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-medium">Hydraulic node:</span>
                  <span className="font-mono text-[11px] text-cyan-400 font-bold">
                    {selectedRoad.drainNodeId || "MH-24 Trunk"}
                  </span>
                </div>
              </div>
            </div>

            <div className={cn("rounded-lg p-4 border", theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-800 border-slate-700")}>
              <div className="text-xs font-bold text-slate-500 uppercase mb-3">Primary Causes</div>
              <ul className="space-y-2">
                {selectedRoad.cause.map((c, i) => (
                  <li key={i} className={cn("flex items-start gap-2 text-sm", theme === 'light' ? "text-slate-700" : "text-slate-300")}>
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={cn("rounded-lg p-4 border", theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-800 border-slate-700")}>
              <div className="text-xs font-bold text-slate-500 uppercase mb-3">Recommended Action</div>
              <div className="flex gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <p className={cn("text-sm", theme === 'light' ? "text-blue-800" : "text-blue-200")}>
                  Divert non-emergency traffic immediately. Prepare mobile pumps at downstream node.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className={cn("flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed rounded-xl", theme === 'light' ? "border-slate-200" : "border-slate-800")}>
            <Map className="w-8 h-8 text-slate-400 mb-3" />
            <div className="text-slate-500 text-sm font-medium">Select a road or drainage node on the map to view detailed intelligence.</div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
