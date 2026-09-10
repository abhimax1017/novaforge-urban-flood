import React, { useState, useEffect } from 'react';
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
  Copy,
  Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Location, PredictionData, SocietyAlert, SafetyRoute } from '../types';
import { getSocietyAlertForLocation } from '../utils/safetyRouting';
import { startEmergencyAlarm, stopEmergencyAlarm, playAlertChirp } from '../utils/sirenAudio';

interface SocietyAlertSystemProps {
  location: Location;
  prediction: PredictionData;
  theme: 'light' | 'dark';
  selectedRoute?: SafetyRoute;
  onSelectRoute?: (routeId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function SocietyAlertSystem({
  location,
  prediction,
  theme,
  selectedRoute,
  onSelectRoute,
  isOpen,
  onClose,
}: SocietyAlertSystemProps) {
  const alertData: SocietyAlert = getSocietyAlertForLocation(location, prediction);
  const [isSirenPlaying, setIsSirenPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [pumpStatus, setPumpStatus] = useState<'running' | 'standby' | 'alert'>('running');

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

  const handleCopyAlert = () => {
    const locShort = location.name.split(',')[0].trim();
    const text = `🚨 *URGENT FLOOD ALARM & EVACUATION WARNING* 🚨
📍 *Society*: ${alertData.societyName}
⚠️ *Warning Level*: ${alertData.alertLevel} (${alertData.riskScore}% Risk)
🌊 *Predicted Water Depth*: ${alertData.projectedDepthCm} cm
⏱️ *Peak Inundation Window*: Next ${alertData.estimatedInundationTimeMin} Minutes

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
    // Sound short alert tone if not already playing
    playAlertChirp();
    setTimeout(() => setBroadcastSent(false), 4000);
  };

  if (!isOpen) return null;

  const isCritical = alertData.alertLevel === 'CRITICAL_ALARM';
  const isWarning = alertData.alertLevel === 'WARNING';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={cn(
        "relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl flex flex-col transition-colors",
        theme === 'light' ? "bg-white border-slate-200 text-slate-800" : "bg-slate-900 border-slate-700 text-slate-100"
      )}>
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
            <div className="absolute inset-0 bg-red-500/20 animate-pulse pointer-events-none" />
          )}

          <div className="flex items-center gap-3 z-10">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-transform",
              isSirenPlaying ? "bg-white text-red-600 animate-bounce scale-110" : "bg-white/20 text-white"
            )}>
              {isSirenPlaying ? <BellRing className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest uppercase px-2 py-0.5 rounded bg-white/25">
                  COMMUNITY DISASTER ALARM
                </span>
                {isSirenPlaying && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-red-700 uppercase animate-pulse">
                    SIREN ACTIVE (92 dB)
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black tracking-tight mt-0.5">{alertData.societyName}</h2>
              <p className="text-xs text-white/90 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5" />
                {alertData.colonySector} • {alertData.householdsCovered.toLocaleString()} Households
              </p>
            </div>
          </div>

          <button 
            onClick={() => {
              stopEmergencyAlarm();
              setIsSirenPlaying(false);
              onClose();
            }}
            className="z-10 p-2 rounded-lg bg-black/20 hover:bg-black/40 transition-colors text-white font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Alarm Controls & Quick Broadcast Actions */}
        <div className="p-5 flex flex-col gap-5">
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
                    <span className="inline-flex items-center gap-1 text-[10px] text-red-600 font-bold px-1.5 py-0.5 bg-red-100 rounded">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                      Acoustic Horn Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isSirenPlaying 
                    ? "Warning siren sounding across 1.8km radius. Press below to silence." 
                    : "Sound emergency acoustic warning horns across all society blocks."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
                onClick={toggleSiren}
                className={cn(
                  "px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all shadow-md flex items-center gap-2 shrink-0",
                  isSirenPlaying 
                    ? "bg-slate-900 text-white hover:bg-black dark:bg-white dark:text-slate-900" 
                    : "bg-red-600 text-white hover:bg-red-500 shadow-red-600/30"
                )}
              >
                {isSirenPlaying ? (
                  <>
                    <VolumeX className="w-4 h-4" />
                    Silence Alarm
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
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{alertData.alertLevel.replace('_', ' ')}</span>
            </div>

            <div className={cn(
              "p-3 rounded-xl border flex flex-col",
              theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-800/40 border-slate-700"
            )}>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Projected Depth</span>
              <span className="text-lg font-black mt-1 text-sky-500 font-mono">
                {alertData.projectedDepthCm} cm
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Street & Basement Level</span>
            </div>

            <div className={cn(
              "p-3 rounded-xl border flex flex-col",
              theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-800/40 border-slate-700"
            )}>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Time to Inundation</span>
              <span className="text-lg font-black mt-1 text-amber-500 font-mono">
                ~{alertData.estimatedInundationTimeMin} min
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Evacuation Window</span>
            </div>

            <div className={cn(
              "p-3 rounded-xl border flex flex-col",
              theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-800/40 border-slate-700"
            )}>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Drainage Sump Pumps</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Pumping (3/3)</span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Gates Sealed</span>
            </div>
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
