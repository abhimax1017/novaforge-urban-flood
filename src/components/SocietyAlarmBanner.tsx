import React, { useState, useMemo } from 'react';
import { BellRing, Volume2, VolumeX, ShieldAlert, ChevronRight, Radio, HeartPulse, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { Location, PredictionData, SocietyAlert, CriticalFacility } from '../types';
import { getSocietyAlertForLocation } from '../utils/safetyRouting';
import { startEmergencyAlarm, stopEmergencyAlarm } from '../utils/sirenAudio';
import { CoupledNowcastState } from '../utils/nowcastEngine';
import { getCriticalInfrastructure, evaluateFacilityThreats } from '../utils/criticalInfrastructure';

interface SocietyAlarmBannerProps {
  location: Location;
  prediction: PredictionData;
  theme: 'light' | 'dark';
  onOpenAlertModal: () => void;
  onOpenRoutingTab: () => void;
  coupledState?: CoupledNowcastState;
  facilities?: CriticalFacility[];
}

export function SocietyAlarmBanner({
  location,
  prediction,
  theme,
  onOpenAlertModal,
  onOpenRoutingTab,
  coupledState,
  facilities: initialFacilities
}: SocietyAlarmBannerProps) {
  const alertData: SocietyAlert = getSocietyAlertForLocation(location, prediction);
  const [sirenPlaying, setSirenPlaying] = useState(false);

  const effectiveDepth = coupledState?.maxDepthCm ?? alertData.projectedDepthCm;

  const evaluatedFacilities = useMemo(() => {
    const raw = initialFacilities && initialFacilities.length > 0
      ? initialFacilities
      : getCriticalInfrastructure(location.lat, location.lng);
    const { updatedFacilities } = evaluateFacilityThreats(raw, effectiveDepth);
    return updatedFacilities;
  }, [initialFacilities, location.lat, location.lng, effectiveDepth]);

  const threatenedHospitals = useMemo(() => 
    evaluatedFacilities.filter(f => f.type === 'hospital' && (f.isThreatened || f.currentDepthCm >= f.thresholdDepthCm)),
    [evaluatedFacilities]
  );

  const threatenedSubstations = useMemo(() => 
    evaluatedFacilities.filter(f => f.type === 'power_station' && (f.isThreatened || f.currentDepthCm >= f.thresholdDepthCm)),
    [evaluatedFacilities]
  );

  const isThresholdBreach = effectiveDepth >= 15 || threatenedHospitals.length > 0 || threatenedSubstations.length > 0 || (coupledState?.surchargingNodesCount ?? 0) > 0;

  const toggleSiren = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sirenPlaying) {
      stopEmergencyAlarm();
      setSirenPlaying(false);
    } else {
      const started = startEmergencyAlarm(0.4);
      if (started) {
        setSirenPlaying(true);
      }
    }
  };

  const isCritical = alertData.alertLevel === 'CRITICAL_ALARM' || isThresholdBreach;
  const isWarning = alertData.alertLevel === 'WARNING' && !isThresholdBreach;

  // Always show banner to give quick community alarm access, styling adapts with risk
  return (
    <div className={cn(
      "w-full px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs z-20 border-b transition-colors shadow-sm",
      isCritical 
        ? "bg-red-600 text-white border-red-700 animate-pulse" 
        : isWarning 
          ? "bg-amber-600 text-white border-amber-700" 
          : theme === 'light' 
            ? "bg-blue-50 text-blue-900 border-blue-200" 
            : "bg-slate-900 text-slate-200 border-slate-800"
    )}>
      <div className="flex items-center gap-2.5 flex-1 min-w-[280px] flex-wrap">
        <div className={cn(
          "p-1.5 rounded-lg flex items-center justify-center shrink-0",
          isCritical || isWarning ? "bg-white/20 text-white" : "bg-blue-600 text-white"
        )}>
          {sirenPlaying ? (
            <BellRing className="w-4 h-4 animate-bounce" />
          ) : (
            <ShieldAlert className="w-4 h-4" />
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-black uppercase tracking-wider text-[11px] px-1.5 py-0.5 rounded bg-black/20">
            {alertData.societyName}
          </span>
          <span className="font-semibold">
            {isCritical 
              ? `🚨 FLASH FLOOD ALARM: ${effectiveDepth}cm standing runoff expected in ~${coupledState?.timeToFloodMin ?? alertData.estimatedInundationTimeMin}m!`
              : isWarning
                ? `⚠️ FLOOD ADVISORY: Rising runoff (${effectiveDepth}cm). Monitor low-lying drains.`
                : `Community Flood Monitoring Active • No active inundation warning.`}
          </span>

          {/* Lifeline Badges */}
          {threatenedHospitals.length > 0 && (
            <button
              onClick={onOpenAlertModal}
              className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white text-rose-700 hover:bg-rose-50 shadow-sm transition-transform active:scale-95"
            >
              <HeartPulse className="w-3 h-3 text-rose-600 animate-pulse" />
              <span>Hospital Ingress Warning ({threatenedHospitals[0].currentDepthCm}cm)</span>
            </button>
          )}

          {threatenedSubstations.length > 0 && (
            <button
              onClick={onOpenAlertModal}
              className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-yellow-300 text-slate-950 hover:bg-yellow-200 shadow-sm transition-transform active:scale-95"
            >
              <Zap className="w-3 h-3 text-amber-700" />
              <span>Substation Breach ({threatenedSubstations[0].currentDepthCm}cm)</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Siren Sound Toggle Button */}
        <button
          type="button"
          onClick={toggleSiren}
          className={cn(
            "px-2.5 py-1 rounded-md font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 transition-all shadow-sm",
            sirenPlaying 
              ? "bg-white text-red-600 hover:bg-slate-100 animate-bounce"
              : isCritical || isWarning
                ? "bg-white/20 hover:bg-white/30 text-white border border-white/40"
                : "bg-red-600 hover:bg-red-500 text-white"
          )}
        >
          {sirenPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          {sirenPlaying ? "Silence Siren" : "Sound Society Siren"}
        </button>

        {/* View Safe Evacuation Routes */}
        <button
          type="button"
          onClick={onOpenRoutingTab}
          className={cn(
            "px-2.5 py-1 rounded-md font-bold uppercase tracking-wider text-[10px] flex items-center gap-1 transition-colors",
            isCritical || isWarning 
              ? "bg-white text-slate-900 hover:bg-slate-100" 
              : "bg-emerald-600 hover:bg-emerald-500 text-white"
          )}
        >
          <span>Safety Routes</span>
          <ChevronRight className="w-3 h-3" />
        </button>

        {/* View Full Society Risk Modal */}
        <button
          type="button"
          onClick={onOpenAlertModal}
          className={cn(
            "px-2.5 py-1 rounded-md font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 transition-colors border",
            isCritical || isWarning 
              ? "border-white/40 text-white hover:bg-white/10" 
              : theme === 'light' ? "border-slate-300 text-slate-700 hover:bg-slate-100" : "border-slate-700 text-slate-300 hover:bg-slate-800"
          )}
        >
          <Radio className="w-3 h-3 animate-pulse" />
          <span>Alerts & Push Center</span>
        </button>
      </div>
    </div>
  );
}

