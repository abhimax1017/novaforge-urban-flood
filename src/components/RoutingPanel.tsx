import React, { useState } from 'react';
import { 
  Navigation, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  TrendingUp, 
  ShieldAlert, 
  Home, 
  MapPin, 
  ExternalLink,
  Share2,
  CheckCircle2,
  BellRing,
  Layers,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Location, PredictionData, SafetyRoute } from '../types';
import { useRealSafetyRoutes } from '../hooks/useRealSafetyRoutes';

interface RoutingPanelProps {
  theme: 'light' | 'dark';
  location: Location;
  prediction: PredictionData;
  selectedRouteId: string;
  onSelectRoute: (routeId: string) => void;
  onTriggerAlarm: () => void;
}

export function RoutingPanel({
  theme,
  location,
  prediction,
  selectedRouteId,
  onSelectRoute,
  onTriggerAlarm,
}: RoutingPanelProps) {
  const routes = useRealSafetyRoutes(location, prediction);
  const activeRoute = routes.find(r => r.id === selectedRouteId) || routes[0];
  const [copiedShare, setCopiedShare] = useState(false);

  const handleShareRoute = (route: SafetyRoute) => {
    const text = `🚨 *Verified Safe Evacuation Route*: ${route.name}
🛡️ *Safety Rating*: ${route.safetyRating}
📏 *Distance*: ${route.distanceKm} km (~${route.etaMin} mins)
⛰️ *Elevation Gain*: +${route.elevationGainM}m above storm flood level
📍 *Destination*: ${route.destinationName}
⚠️ *Avoids*: ${route.avoidedHazards.join(', ')}

Shared via NovaForge Urban Flood Nowcasting System.`;

    navigator.clipboard.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  return (
    <div className={cn(
      "absolute top-4 left-4 backdrop-blur-md border p-4 rounded-xl shadow-2xl w-96 max-h-[calc(100vh-140px)] overflow-y-auto pointer-events-auto transition-colors flex flex-col gap-4 z-30",
      theme === 'light' ? "bg-white/95 border-slate-200" : "bg-slate-900/95 border-slate-700"
    )}>
      {/* Header */}
      <div className={cn("flex justify-between items-center border-b pb-2", theme === 'light' ? 'border-slate-200' : 'border-slate-800')}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h3 className={cn("text-xs font-bold tracking-widest uppercase", theme === 'light' ? "text-slate-800" : "text-slate-200")}>
              Multi-Route Safety Hub
            </h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {routes.length} Verified Escape Corridors
            </span>
          </div>
        </div>
        <div className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 uppercase flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Terrain Clear
        </div>
      </div>

      <p className={cn("text-xs leading-relaxed", theme === 'light' ? "text-slate-600" : "text-slate-300")}>
        Forward-looking nowcast for <strong>{location.name.split(',')[0]}</strong>. Standard arterial is flood-prone. Select an elevated corridor below:
      </p>

      {/* Route Selection Tabs / Cards */}
      <div className="flex flex-col gap-2">
        {routes.map((route) => {
          const isSelected = route.id === activeRoute.id;
          const isBlocked = route.tag === 'standard_blocked';

          return (
            <div
              key={route.id}
              onClick={() => onSelectRoute(route.id)}
              className={cn(
                "p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-2",
                isSelected
                  ? isBlocked
                    ? "bg-red-50/80 border-red-400 ring-2 ring-red-500/20 dark:bg-red-950/30 dark:border-red-600"
                    : "bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500/20 dark:bg-emerald-950/30 dark:border-emerald-600"
                  : theme === 'light'
                    ? "bg-slate-50/80 border-slate-200 hover:bg-slate-100"
                    : "bg-slate-800/40 border-slate-700/80 hover:bg-slate-800/80"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    isBlocked 
                      ? "bg-red-500" 
                      : route.tag === 'primary' 
                        ? "bg-emerald-500 animate-pulse" 
                        : route.tag === 'shelter'
                          ? "bg-sky-500"
                          : "bg-amber-500"
                  )} />
                  <span className={cn(
                    "text-xs font-bold line-clamp-1",
                    isBlocked 
                      ? "text-red-600 dark:text-red-400 line-through" 
                      : theme === 'light' ? "text-slate-800" : "text-slate-100"
                  )}>
                    {route.name}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                    {route.etaMin}m
                  </span>
                  <span className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase",
                    isBlocked 
                      ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                      : route.isRecommended 
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                  )}>
                    {isBlocked ? "Blocked" : route.isRecommended ? "Top Pick" : `${route.safetyScore}%`}
                  </span>
                </div>
              </div>

              {/* Sub-details */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span>{route.distanceKm} km • +{route.elevationGainM}m elevation</span>
                <span className={cn(
                  "font-medium",
                  isBlocked ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"
                )}>
                  {isBlocked ? "Severe Standing Water" : route.safetyRating.split('(')[0]}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed View of Active Selected Route */}
      <div className={cn(
        "p-3 rounded-xl border flex flex-col gap-2.5",
        activeRoute.tag === 'standard_blocked'
          ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/40"
          : theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-800/60 border-slate-700"
      )}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
            Active Corridor Inspection
          </span>
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
            activeRoute.tag === 'standard_blocked' ? "bg-red-500 text-white" : "bg-emerald-600 text-white"
          )}>
            {activeRoute.tag === 'standard_blocked' ? "IMPASSABLE" : "100% CLEAR"}
          </span>
        </div>

        <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
          {activeRoute.description}
        </p>

        {/* Hazards Avoided Checklist */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
            {activeRoute.tag === 'standard_blocked' ? "Critical Dangers Detected:" : "Hazards Safely Bypassed:"}
          </span>
          {activeRoute.avoidedHazards.map((hazard, idx) => (
            <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
              {activeRoute.tag === 'standard_blocked' ? (
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
              )}
              <span>{hazard}</span>
            </div>
          ))}
        </div>

        {/* Step-by-step turn guidance */}
        <div className="space-y-1 pt-1 border-t border-slate-200 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
            Evacuation Steps:
          </span>
          {activeRoute.turnSteps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
              <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleShareRoute(activeRoute)}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border transition-colors",
              theme === 'light' ? "bg-white hover:bg-slate-100 border-slate-300 text-slate-700" : "bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200"
            )}
          >
            <Share2 className="w-3.5 h-3.5" />
            {copiedShare ? "Copied Route Link!" : "Share GPS Route"}
          </button>

          <button
            onClick={onTriggerAlarm}
            className="py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-500 text-white shadow-md transition-colors"
          >
            <BellRing className="w-3.5 h-3.5" />
            Society Alarm
          </button>
        </div>

        <button 
          onClick={() => {
            alert(`Safe route '${activeRoute.name}' broadcasted to emergency navigation and community responders.`);
          }}
          className={cn(
            "w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-md",
            theme === 'light' ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-blue-600 text-white hover:bg-blue-500"
          )}
        >
          Dispatch Route to Society Units
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
