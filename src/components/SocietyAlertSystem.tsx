import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Bell, 
  BellRing, 
  Volume2, 
  VolumeX, 
  AlertTriangle, 
  ShieldAlert, 
  Share2, 
  PhoneCall, 
  CheckCircle2, 
  Radio, 
  Users, 
  Building2, 
  ExternalLink,
  Flame,
  ZapOff,
  Zap,
  Copy,
  Check,
  Activity,
  HeartPulse,
  Send,
  RadioTower,
  AlertOctagon,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Location, PredictionData, SocietyAlert, SafetyRoute, CriticalFacility } from '../types';
import { getSocietyAlertForLocation } from '../utils/safetyRouting';
import { startEmergencyAlarm, stopEmergencyAlarm, playAlertChirp, playThresholdBreachAlert } from '../utils/sirenAudio';
import { getCriticalInfrastructure, evaluateFacilityThreats } from '../utils/criticalInfrastructure';
import { CoupledNowcastState } from '../utils/nowcastEngine';

export interface PushedInfrastructureAlert {
  id: string;
  facilityId: string;
  facilityName: string;
  facilityType: 'hospital' | 'power_station' | 'fire_station' | 'transit_hub' | 'school' | 'shelter' | 'police';
  currentDepthCm: number;
  thresholdDepthCm: number;
  accessRoad: string;
  severity: 'critical' | 'warning';
  pushedAt: string;
  targetAgency: string;
  operationalDirectives: string[];
  acknowledged: boolean;
}

interface SocietyAlertSystemProps {
  location: Location;
  prediction: PredictionData;
  theme: 'light' | 'dark';
  selectedRoute?: SafetyRoute;
  onSelectRoute?: (routeId: string) => void;
  isOpen: boolean;
  onClose: () => void;
  coupledState?: CoupledNowcastState;
  facilities?: CriticalFacility[];
}

export function SocietyAlertSystem({
  location,
  prediction,
  theme,
  selectedRoute,
  onSelectRoute,
  isOpen,
  onClose,
  coupledState,
  facilities: initialFacilities
}: SocietyAlertSystemProps) {
  const alertData: SocietyAlert = getSocietyAlertForLocation(location, prediction);
  const [isSirenPlaying, setIsSirenPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [autoAudioEnabled, setAutoAudioEnabled] = useState(true);
  const [activeInfraFilter, setActiveInfraFilter] = useState<'all' | 'hospital' | 'power_station'>('all');
  const [pushedAlerts, setPushedAlerts] = useState<PushedInfrastructureAlert[]>([]);
  const [lastAutoTriggerTime, setLastAutoTriggerTime] = useState<string | null>(null);

  const prevBreachRef = useRef<boolean>(false);

  // Evaluate critical facilities dynamically based on coupled state or prediction depth
  const effectiveFloodDepth = coupledState?.maxDepthCm ?? alertData.projectedDepthCm;
  const evaluatedFacilities = useMemo(() => {
    const rawFacilities = initialFacilities && initialFacilities.length > 0
      ? initialFacilities
      : getCriticalInfrastructure(location.lat, location.lng);
    const { updatedFacilities } = evaluateFacilityThreats(rawFacilities, effectiveFloodDepth);
    return updatedFacilities;
  }, [initialFacilities, location.lat, location.lng, effectiveFloodDepth]);

  // Identify specific lifeline breaches (Hospitals & Power Substations)
  const hospitalThreats = useMemo(() => 
    evaluatedFacilities.filter(f => f.type === 'hospital' && (f.isThreatened || f.currentDepthCm >= f.thresholdDepthCm)),
    [evaluatedFacilities]
  );

  const powerSubstationThreats = useMemo(() => 
    evaluatedFacilities.filter(f => f.type === 'power_station' && (f.isThreatened || f.currentDepthCm >= f.thresholdDepthCm)),
    [evaluatedFacilities]
  );

  const allThreatenedFacilities = useMemo(() => 
    evaluatedFacilities.filter(f => f.isThreatened || f.currentDepthCm >= f.thresholdDepthCm),
    [evaluatedFacilities]
  );

  // Determine overall threshold breach condition
  const isThresholdBreached = useMemo(() => {
    return (
      effectiveFloodDepth >= 15 || 
      alertData.alertLevel === 'CRITICAL_ALARM' ||
      alertData.alertLevel === 'WARNING' ||
      hospitalThreats.length > 0 ||
      powerSubstationThreats.length > 0 ||
      (coupledState?.surchargingNodesCount ?? 0) > 0
    );
  }, [effectiveFloodDepth, alertData.alertLevel, hospitalThreats.length, powerSubstationThreats.length, coupledState?.surchargingNodesCount]);

  // Automatic visual and audio notification trigger when hydrodynamic threshold breach is detected
  useEffect(() => {
    if (!isThresholdBreached) {
      prevBreachRef.current = false;
      return;
    }

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // When breach is newly detected or modal opens on breach
    if (isOpen) {
      setLastAutoTriggerTime(nowStr);

      // Automatic Audio Notification Trigger (if armed)
      if (autoAudioEnabled && !isSirenPlaying) {
        // High urgency breach acoustic alert tone
        playThresholdBreachAlert();
      }
    }

    // Automatically generate pushed alerts to the UI for critical facilities if not already in list
    if (allThreatenedFacilities.length > 0) {
      setPushedAlerts(prev => {
        const existingIds = new Set(prev.map(p => p.facilityId));
        const newItems: PushedInfrastructureAlert[] = [];

        allThreatenedFacilities.forEach(f => {
          if (!existingIds.has(f.id)) {
            const isHosp = f.type === 'hospital';
            const isPower = f.type === 'power_station';
            const targetAgency = isHosp 
              ? 'City EMS & State Health Directorate' 
              : isPower 
                ? 'Municipal Electricity Transmission Board (Load Dispatch)' 
                : 'District Disaster Management Authority';

            const directives = isHosp ? [
              `Emergency Ingress Alert: ${f.accessRoad} flooded (${f.currentDepthCm}cm / ${f.thresholdDepthCm}cm limit).`,
              'Ambulance reroute commanded via Route 3 Elevated Corridor.',
              'Initiate ground-level patient transfer & protect basement oxygen manifold.'
            ] : isPower ? [
              `High-Voltage Yard Threat: ${f.currentDepthCm}cm water approaching 132kV transformers.`,
              'Command preventive busbar trip & transfer urban load to North Grid.',
              'Deploy high-capacity mobile dewatering pumps to switchgear basement.'
            ] : [
              `Facility access route ${f.accessRoad} breached by ${f.currentDepthCm}cm standing flood water.`,
              'Deploy perimeter flood barriers and sandbag conduits immediately.'
            ];

            newItems.push({
              id: `ALERT-${f.id}-${Date.now()}`,
              facilityId: f.id,
              facilityName: f.name,
              facilityType: f.type,
              currentDepthCm: f.currentDepthCm,
              thresholdDepthCm: f.thresholdDepthCm,
              accessRoad: f.accessRoad,
              severity: f.currentDepthCm >= f.thresholdDepthCm * 1.4 ? 'critical' : 'warning',
              pushedAt: nowStr,
              targetAgency,
              operationalDirectives: directives,
              acknowledged: false
            });
          }
        });

        return newItems.length > 0 ? [...newItems, ...prev] : prev;
      });
    }

    prevBreachRef.current = true;
  }, [isThresholdBreached, isOpen, autoAudioEnabled, allThreatenedFacilities]);

  // Stop siren if modal unmounts or location switches
  useEffect(() => {
    return () => {
      stopEmergencyAlarm();
    };
  }, [location.id]);

  const toggleSiren = () => {
    if (isSirenPlaying) {
      stopEmergencyAlarm();
      setIsSirenPlaying(false);
    } else {
      const started = startEmergencyAlarm(0.5);
      if (started) {
        setIsSirenPlaying(true);
      }
    }
  };

  const handleTestChirp = () => {
    playAlertChirp();
  };

  const handleTestThresholdTone = () => {
    playThresholdBreachAlert();
  };

  // Manual or instant push of a specific critical infrastructure alert
  const handlePushAlertToUI = (facility: CriticalFacility) => {
    playThresholdBreachAlert();
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const isHosp = facility.type === 'hospital';
    const isPower = facility.type === 'power_station';
    
    const newAlert: PushedInfrastructureAlert = {
      id: `MANUAL-${facility.id}-${Date.now()}`,
      facilityId: facility.id,
      facilityName: facility.name,
      facilityType: facility.type,
      currentDepthCm: facility.currentDepthCm,
      thresholdDepthCm: facility.thresholdDepthCm,
      accessRoad: facility.accessRoad,
      severity: facility.currentDepthCm >= facility.thresholdDepthCm ? 'critical' : 'warning',
      pushedAt: timeNow,
      targetAgency: isHosp ? 'City EMS & Trauma Ambulance Dispatch' : isPower ? 'State Power Grid Control Room' : 'Civic Defense Command',
      operationalDirectives: [
        `Broadcast Priority 1 alert to UI: ${facility.name} threshold breach detected.`,
        `Immediate clearance required for ${facility.accessRoad}.`,
        'Activate auxiliary emergency response protocol.'
      ],
      acknowledged: false
    };

    setPushedAlerts(prev => [newAlert, ...prev.filter(a => a.facilityId !== facility.id)]);
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    setPushedAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
  };

  const handleCopyAlert = () => {
    const text = `🚨 *URGENT URBAN HYDRODYNAMIC ALERT & CRITICAL INFRASTRUCTURE WARNING* 🚨
📍 *Zone / Society*: ${alertData.societyName}
⚠️ *Warning Status*: ${isThresholdBreached ? 'HYDRODYNAMIC THRESHOLD BREACH' : alertData.alertLevel}
🌊 *Standing Depth*: ${effectiveFloodDepth} cm (Coupled Hydrodynamic State)
⏱️ *Evacuation Window*: ~${alertData.estimatedInundationTimeMin} Minutes

🏥 *CRITICAL INFRASTRUCTURE THREAT RADAR*:
${hospitalThreats.map(h => `• HOSPITAL: ${h.name} - Entrance flooded to ${h.currentDepthCm}cm (Threshold: ${h.thresholdDepthCm}cm). Reroute ambulances!`).join('\n') || '• Hospitals: Normal access maintained.'}
${powerSubstationThreats.map(p => `• POWER SUBSTATION: ${p.name} - Flood depth ${p.currentDepthCm}cm (Threshold: ${p.thresholdDepthCm}cm). Grid isolation advisory!`).join('\n') || '• Substations: Stable dry elevation.'}

🛡️ *RECOMMENDED ACTION*:
1. Immediately move vehicles from basement parking to Elevated Ridge Highway (Route 1).
2. Turn OFF ground-floor main electrical circuit breakers.
3. Evacuate to Designated Safe Shelter: ${alertData.safeShelterName} (${alertData.shelterDistance}).
4. Use Verified Safe Escape Route: ${selectedRoute ? selectedRoute.name : 'Elevated Ridge Corridor'} (Grade A+).

📞 *Emergency Helplines*:
- Disaster Helpline: 1077
- Society Control Room: +91 98765 43210
- Fire & Rescue: 101`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleBroadcastToSociety = () => {
    setBroadcastSent(true);
    playThresholdBreachAlert();
    setTimeout(() => setBroadcastSent(false), 4000);
  };

  if (!isOpen) return null;

  const isCritical = alertData.alertLevel === 'CRITICAL_ALARM' || isThresholdBreached;
  const isWarning = alertData.alertLevel === 'WARNING' && !isThresholdBreached;

  const filteredPushedAlerts = pushedAlerts.filter(a => {
    if (activeInfraFilter === 'all') return true;
    return a.facilityType === activeInfraFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className={cn(
        "relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border shadow-2xl flex flex-col transition-colors",
        theme === 'light' ? "bg-white border-slate-200 text-slate-800" : "bg-slate-900 border-slate-700 text-slate-100"
      )}>
        {/* Automatic Threshold Breach Strobe Notification Bar */}
        {isThresholdBreached && (
          <div className="px-4 py-2 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white flex flex-wrap items-center justify-between gap-2 shadow-inner border-b border-red-700/50">
            <div className="flex items-center gap-2 text-xs font-black tracking-wide">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
              </span>
              <AlertOctagon className="w-4 h-4 animate-bounce" />
              <span>AUTOMATED HYDRODYNAMIC THRESHOLD BREACH TRIGGERED</span>
              {lastAutoTriggerTime && (
                <span className="text-[10px] font-mono font-normal opacity-90 px-1.5 py-0.5 rounded bg-black/25">
                  Detected at {lastAutoTriggerTime}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold bg-black/30 px-2 py-0.5 rounded-lg">
                <span>Auto-Audio Alarm:</span>
                <button 
                  onClick={() => setAutoAudioEnabled(!autoAudioEnabled)}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-black uppercase transition-colors",
                    autoAudioEnabled ? "bg-emerald-500 text-white" : "bg-slate-600 text-slate-300"
                  )}
                >
                  {autoAudioEnabled ? 'ARMED' : 'MUTED'}
                </button>
              </div>

              {isSirenPlaying ? (
                <button
                  onClick={toggleSiren}
                  className="px-2.5 py-0.5 rounded text-[11px] font-black bg-white text-red-700 hover:bg-slate-100 uppercase tracking-wider flex items-center gap-1 shadow"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  Silence Siren
                </button>
              ) : (
                <button
                  onClick={toggleSiren}
                  className="px-2.5 py-0.5 rounded text-[11px] font-black bg-red-950 text-white hover:bg-black uppercase tracking-wider flex items-center gap-1 border border-white/30"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Sound Siren
                </button>
              )}
            </div>
          </div>
        )}

        {/* Header with Emergency Siren Banner */}
        <div className={cn(
          "p-5 border-b flex items-center justify-between relative overflow-hidden",
          isCritical 
            ? "bg-gradient-to-r from-red-600 to-rose-700 text-white"
            : isWarning 
              ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white"
              : "bg-gradient-to-r from-blue-600 to-indigo-700 text-white"
        )}>
          {isSirenPlaying && (
            <div className="absolute inset-0 bg-red-500/25 animate-pulse pointer-events-none" />
          )}

          <div className="flex items-center gap-3.5 z-10">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-transform",
              isSirenPlaying ? "bg-white text-red-600 animate-bounce scale-110" : "bg-white/20 text-white"
            )}>
              {isSirenPlaying ? <BellRing className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black tracking-widest uppercase px-2 py-0.5 rounded bg-white/25">
                  HYDRODYNAMIC NOWCAST ALARM
                </span>
                {isSirenPlaying && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-red-700 uppercase animate-pulse">
                    ACOUSTIC SIREN ACTIVE (92 dB)
                  </span>
                )}
                {hospitalThreats.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-400 text-slate-950 uppercase flex items-center gap-1">
                    <HeartPulse className="w-3 h-3 text-red-600" />
                    HOSPITAL AT RISK
                  </span>
                )}
                {powerSubstationThreats.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-300 text-slate-950 uppercase flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-700" />
                    SUBSTATION AT RISK
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black tracking-tight mt-1">{alertData.societyName}</h2>
              <p className="text-xs text-white/90 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5" />
                {alertData.colonySector} • {alertData.householdsCovered.toLocaleString()} Households Monitored
              </p>
            </div>
          </div>

          <button 
            onClick={() => {
              stopEmergencyAlarm();
              setIsSirenPlaying(false);
              onClose();
            }}
            className="z-10 p-2 rounded-lg bg-black/25 hover:bg-black/40 transition-colors text-white font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content Container */}
        <div className="p-5 flex flex-col gap-6">

          {/* Siren Activation Bar */}
          <div className={cn(
            "p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm",
            isSirenPlaying 
              ? "bg-red-50 border-red-300 dark:bg-red-950/40 dark:border-red-800" 
              : theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-800/60 border-slate-700"
          )}>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className={cn(
                "p-3 rounded-xl flex items-center justify-center shrink-0",
                isSirenPlaying 
                  ? "bg-red-600 text-white shadow-lg shadow-red-500/30" 
                  : theme === 'light' ? "bg-slate-200 text-slate-700" : "bg-slate-700 text-slate-200"
              )}>
                {isSirenPlaying ? <Volume2 className="w-6 h-6 animate-pulse" /> : <VolumeX className="w-6 h-6" />}
              </div>
              <div>
                <div className="text-sm font-bold flex items-center gap-2">
                  <span>Society Public Address Siren</span>
                  {isSirenPlaying && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-red-600 font-bold px-1.5 py-0.5 bg-red-100 dark:bg-red-900/50 rounded">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                      Acoustic Horn Sounding
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isSirenPlaying 
                    ? "Warning siren sounding across 1.8km radius. Press Silence to disarm." 
                    : "Sound emergency acoustic warning horns across all society blocks and civic areas."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              <button
                type="button"
                onClick={handleTestChirp}
                title="Test short chirp tone"
                className={cn(
                  "px-3 py-2 text-xs font-bold rounded-lg border transition-colors shrink-0",
                  theme === 'light' ? "bg-white hover:bg-slate-100 border-slate-300 text-slate-700" : "bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200"
                )}
              >
                Test Chirp
              </button>

              <button
                type="button"
                onClick={handleTestThresholdTone}
                title="Test threshold breach acoustic beacon"
                className={cn(
                  "px-3 py-2 text-xs font-bold rounded-lg border transition-colors shrink-0 flex items-center gap-1.5",
                  theme === 'light' ? "bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900" : "bg-amber-950/40 hover:bg-amber-900/50 border-amber-700 text-amber-200"
                )}
              >
                <Radio className="w-3.5 h-3.5 text-amber-500" />
                Breach Tone
              </button>

              <button
                type="button"
                onClick={toggleSiren}
                className={cn(
                  "px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all shadow-md flex items-center gap-2 shrink-0",
                  isSirenPlaying 
                    ? "bg-slate-900 text-white hover:bg-black dark:bg-white dark:text-slate-900" 
                    : "bg-red-600 text-white hover:bg-red-500 shadow-red-600/30"
                )}
              >
                {isSirenPlaying ? (
                  <>
                    <VolumeX className="w-4 h-4" />
                    Silence Siren
                  </>
                ) : (
                  <>
                    <BellRing className="w-4 h-4 animate-bounce" />
                    Sound Society Alarm
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Critical Community Threat Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={cn(
              "p-3 rounded-xl border flex flex-col",
              theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-800/40 border-slate-700"
            )}>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Risk Assessment</span>
              <span className={cn(
                "text-lg font-black mt-1",
                isCritical ? "text-red-500" : isWarning ? "text-amber-500" : "text-blue-500"
              )}>
                {alertData.riskScore}%
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {isThresholdBreached ? 'THRESHOLD BREACH' : alertData.alertLevel.replace('_', ' ')}
              </span>
            </div>

            <div className={cn(
              "p-3 rounded-xl border flex flex-col",
              theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-800/40 border-slate-700"
            )}>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Coupled Flood Depth</span>
              <span className="text-lg font-black mt-1 text-sky-500 font-mono">
                {effectiveFloodDepth} cm
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {effectiveFloodDepth >= 15 ? 'Hazard Threshold Exceeded' : 'Under Safety Threshold'}
              </span>
            </div>

            <div className={cn(
              "p-3 rounded-xl border flex flex-col",
              theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-800/40 border-slate-700"
            )}>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Time to Inundation</span>
              <span className="text-lg font-black mt-1 text-amber-500 font-mono">
                ~{coupledState?.timeToFloodMin ?? alertData.estimatedInundationTimeMin} min
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Evacuation Window</span>
            </div>

            <div className={cn(
              "p-3 rounded-xl border flex flex-col",
              theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-800/40 border-slate-700"
            )}>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Drainage Surcharging</span>
              <div className="flex items-center gap-1.5 mt-1">
                {(coupledState?.surchargingNodesCount ?? 0) > 0 ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      {coupledState?.surchargingNodesCount} Nodes Pressurized
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Gravity Flow Stable</span>
                  </>
                )}
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {coupledState?.drainUtilizationPct ?? 65}% Network Load
              </span>
            </div>
          </div>

          {/* ======================================================================= */}
          {/* CRITICAL INFRASTRUCTURE THREAT RADAR & UI PUSH ALERTS (HOSPITALS & SUBSTATIONS) */}
          {/* ======================================================================= */}
          <div className={cn(
            "p-5 rounded-2xl border flex flex-col gap-4 shadow-sm",
            hospitalThreats.length > 0 || powerSubstationThreats.length > 0
              ? "bg-rose-50/70 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50"
              : theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-800/40 border-slate-700"
          )}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-600 text-white shadow-md">
                  <RadioTower className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
                    <span>Critical Infrastructure Threat Radar</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600 text-white font-black">
                      UI PUSH DISPATCH
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Continuous monitoring of lifeline facilities (Hospitals & Power Substations) under coupled hydrodynamic runoff.
                  </p>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <button
                  onClick={() => setActiveInfraFilter('all')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-colors text-[11px]",
                    activeInfraFilter === 'all' 
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black" 
                      : "text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
                  )}
                >
                  All Lifelines ({evaluatedFacilities.length})
                </button>
                <button
                  onClick={() => setActiveInfraFilter('hospital')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-colors text-[11px] flex items-center gap-1",
                    activeInfraFilter === 'hospital' 
                      ? "bg-rose-600 text-white font-black" 
                      : "text-rose-600 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-950/50"
                  )}
                >
                  <HeartPulse className="w-3.5 h-3.5" />
                  Hospitals ({hospitalThreats.length})
                </button>
                <button
                  onClick={() => setActiveInfraFilter('power_station')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-colors text-[11px] flex items-center gap-1",
                    activeInfraFilter === 'power_station' 
                      ? "bg-amber-600 text-white font-black" 
                      : "text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-950/50"
                  )}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Substations ({powerSubstationThreats.length})
                </button>
              </div>
            </div>

            {/* Critical Infrastructure Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {evaluatedFacilities
                .filter(f => activeInfraFilter === 'all' ? (f.type === 'hospital' || f.type === 'power_station' || f.isThreatened) : f.type === activeInfraFilter)
                .map(facility => {
                  const isHospital = facility.type === 'hospital';
                  const isSubstation = facility.type === 'power_station';
                  const isBreached = facility.currentDepthCm >= facility.thresholdDepthCm;

                  return (
                    <div 
                      key={facility.id}
                      className={cn(
                        "p-4 rounded-xl border flex flex-col justify-between transition-all",
                        isBreached 
                          ? "bg-red-50/80 border-red-300 dark:bg-red-950/30 dark:border-red-800 shadow-sm"
                          : theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900/80 border-slate-700"
                      )}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "p-2 rounded-lg flex items-center justify-center",
                              isHospital 
                                ? "bg-rose-600 text-white" 
                                : isSubstation 
                                  ? "bg-amber-600 text-white" 
                                  : "bg-blue-600 text-white"
                            )}>
                              {isHospital && <HeartPulse className="w-4 h-4" />}
                              {isSubstation && <Zap className="w-4 h-4" />}
                              {!isHospital && !isSubstation && <Building2 className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded",
                                  isHospital ? "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200" :
                                  isSubstation ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200" :
                                  "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                                )}>
                                  {isHospital ? 'HOSPITAL / MEDICAL' : isSubstation ? 'POWER SUBSTATION' : facility.type.toUpperCase()}
                                </span>
                                {isBreached && (
                                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-600 text-white animate-pulse">
                                    THRESHOLD BREACH
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-black mt-0.5">{facility.name}</h4>
                            </div>
                          </div>

                          {/* Depth metric pill */}
                          <div className="text-right">
                            <span className={cn(
                              "text-sm font-mono font-black",
                              isBreached ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-300"
                            )}>
                              {facility.currentDepthCm} cm
                            </span>
                            <div className="text-[10px] text-slate-500">
                              Limit: {facility.thresholdDepthCm}cm
                            </div>
                          </div>
                        </div>

                        {/* Specific Consequence & Route Advisory */}
                        <div className="mt-3 p-2.5 rounded-lg bg-black/5 dark:bg-black/25 text-xs flex flex-col gap-1 text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            <ArrowRight className="w-3 h-3 text-red-500" />
                            <span>Access Road: <strong>{facility.accessRoad}</strong></span>
                          </div>

                          {isHospital && (
                            <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed font-medium">
                              🚑 <strong>Ambulance Ingress Hazard:</strong> Entrance water exceeds {facility.thresholdDepthCm}cm. Reroute non-critical casualties to Upper Ridge Medical Camp.
                            </p>
                          )}

                          {isSubstation && (
                            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                              ⚡ <strong>Transformer Submersion Threat:</strong> 132kV busbars at flashover risk. Automated alert pushed to City Power Dispatch for preventive feeder isolation.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Push to UI Button */}
                      <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                        <span className="text-[10px] font-medium text-slate-500">
                          Elevation: {facility.elevationM}m MSL
                        </span>

                        <button
                          type="button"
                          onClick={() => handlePushAlertToUI(facility)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5",
                            isBreached 
                              ? "bg-red-600 hover:bg-red-500 text-white shadow-red-600/25" 
                              : "bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600"
                          )}
                        >
                          <Send className="w-3.5 h-3.5" />
                          Push Alert to UI
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Pushed UI Alerts Live Feed */}
            {pushedAlerts.length > 0 && (
              <div className="mt-2 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                    Active UI Pushed Alert Stream ({pushedAlerts.length})
                  </span>
                  <span className="text-[10px] text-slate-500">Auto-dispatched via Hydrodynamic Rule Engine</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {filteredPushedAlerts.map((alert) => (
                    <div 
                      key={alert.id}
                      className={cn(
                        "p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors",
                        alert.acknowledged
                          ? "opacity-60 bg-slate-100 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700"
                          : alert.severity === 'critical'
                            ? "bg-red-50 border-red-300 dark:bg-red-950/40 dark:border-red-800/80"
                            : "bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800/80"
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={cn(
                          "p-1.5 rounded-lg mt-0.5 shrink-0",
                          alert.facilityType === 'hospital' ? "bg-rose-600 text-white" :
                          alert.facilityType === 'power_station' ? "bg-amber-600 text-white" :
                          "bg-blue-600 text-white"
                        )}>
                          {alert.facilityType === 'hospital' ? <HeartPulse className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-white">{alert.facilityName}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10 font-mono">
                              {alert.currentDepthCm}cm / {alert.thresholdDepthCm}cm Limit
                            </span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3" />
                              {alert.pushedAt}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                            Target Agency: <strong className="text-slate-800 dark:text-slate-200">{alert.targetAgency}</strong>
                          </p>
                          <ul className="mt-1 space-y-0.5 text-[10px] text-slate-600 dark:text-slate-400">
                            {alert.operationalDirectives.slice(0, 2).map((d, i) => (
                              <li key={i} className="flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-slate-400" />
                                <span>{d}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {!alert.acknowledged ? (
                          <button
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 text-[10px] font-bold uppercase transition-colors"
                          >
                            Acknowledge
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Pushed & Logged
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Urgent Society Action Directives */}
          <div className={cn(
            "p-4 rounded-xl border flex flex-col gap-2.5",
            theme === 'light' ? "bg-amber-50/70 border-amber-200" : "bg-amber-950/20 border-amber-900/40"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                Immediate Directives for Society Residents
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400">
                Action Mandate
              </span>
            </div>

            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              {alertData.urgentInstructions.map((instruction, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <span>{instruction}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommended Safe Shelter & Route Link */}
          <div className={cn(
            "p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
            theme === 'light' ? "bg-emerald-50/70 border-emerald-200" : "bg-emerald-950/20 border-emerald-900/40"
          )}>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Designated Evacuation Assembly Area
              </span>
              <h4 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                {alertData.safeShelterName}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Elevated high-ground relief center with backup power, drinking water, and medical station.
              </p>
            </div>

            <button
              onClick={() => {
                if (onSelectRoute) onSelectRoute('route-shelter');
                onClose();
              }}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-md shrink-0 flex items-center gap-1.5"
            >
              View Route 3 on Map
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Broadcast & Social Dispatch Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={handleCopyAlert}
              className={cn(
                "flex-1 w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition-all",
                theme === 'light' ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700" : "bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200"
              )}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied Alert to Clipboard!" : "Copy Society WhatsApp Alert"}
            </button>

            <button
              onClick={handleBroadcastToSociety}
              disabled={broadcastSent}
              className="flex-1 w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 transition-all"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              {broadcastSent ? "Alert Dispatched to Residents!" : "Dispatch Society SMS & PA Horn"}
            </button>
          </div>

          {/* Emergency Hotlines Footer */}
          <div className={cn(
            "pt-3 border-t grid grid-cols-2 sm:grid-cols-4 gap-2 text-center",
            theme === 'light' ? "border-slate-200" : "border-slate-800"
          )}>
            {alertData.emergencyContacts.map((contact, i) => (
              <div key={i} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{contact.role}</span>
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5">{contact.phone}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

