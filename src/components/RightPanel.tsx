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
}

import WeatherPanel from './WeatherPanel';
import { CriticalZonesSummary } from './CriticalZonesSummary';
import { ImpactTab } from './ImpactTab';
import { BellRing, Radio, ChevronDown, ChevronUp } from 'lucide-react';
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
  onOpenRouting
}: RightPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showRainfallMatrix, setShowRainfallMatrix] = useState(true);
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
        <div className="writing-vertical-lr transform rotate-180 text-xs font-bold text-slate-400 tracking-widest uppercase">Live Prediction</div>
        <div className="flex-1" />
      </div>
    );
  }

  return (
    <div className={cn(
      "hidden lg:flex w-80 border-l flex-col h-full shrink-0 z-20 transition-colors relative",
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
        <div className={cn(
          "p-5 border-b",
          theme === 'light' ? "bg-slate-50/50 border-slate-200" : "bg-slate-900/50 border-slate-800"
        )}>
          <h2 className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-4">Live Prediction</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className={cn(
            "border rounded-lg p-3 transition-colors",
            theme === 'light' ? "bg-white border-slate-200" : "bg-slate-950 border-slate-800"
          )}>
            <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Max Depth</div>
            <div className="text-2xl font-bold text-red-500 font-mono">{prediction.maxDepthCm}<span className="text-sm text-slate-500 ml-1">cm</span></div>
          </div>
          <div className={cn(
            "border rounded-lg p-3 transition-colors",
            theme === 'light' ? "bg-white border-slate-200" : "bg-slate-950 border-slate-800"
          )}>
            <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Flooded Area</div>
            <div className="text-2xl font-bold text-orange-500 font-mono">{prediction.floodedAreaKm2.toFixed(1)}<span className="text-sm text-slate-500 ml-1">km²</span></div>
          </div>
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

      
      {['overview', 'sensors'].includes(activeTab || 'overview') && weather && (
        <WeatherPanel location={location!} theme={theme} weather={weather} loading={!!weatherLoading} isLive={!!weatherIsLive} />
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
                <div className="text-xs font-medium text-slate-500">{selectedRoad.probability}% Prob</div>
              </div>

              <div className="flex items-baseline gap-2 mb-1">
                <span className={cn("text-3xl font-bold font-mono", theme === 'light' ? 'text-slate-900' : 'text-white')}>{selectedRoad.depthCm}</span>
                <span className="text-sm text-slate-500 font-medium">cm predicted</span>
              </div>
              
              {selectedRoad.timeToFloodMin !== undefined && (
                <div className={cn("flex items-center gap-2 mt-4 text-sm rounded p-2", theme === 'light' ? "bg-white border border-slate-100" : "bg-slate-950/50")}>
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span className={cn(theme === 'light' ? "text-slate-700" : "text-slate-300")}>Time to flood: <strong className="text-orange-500 font-mono">{selectedRoad.timeToFloodMin} min</strong></span>
                </div>
              )}
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
