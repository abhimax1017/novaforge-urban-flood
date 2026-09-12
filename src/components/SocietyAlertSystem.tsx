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
  ArrowRight,
  History,
  Search,
  CheckCheck,
  PlusCircle,
  RotateCcw,
  SlidersHorizontal,
  BellOff
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

export interface QueuedThresholdAlert {
  id: string;
  facilityId: string;
  facilityName: string;
  facilityType: 'hospital' | 'power_station' | 'fire_station' | 'transit_hub' | 'school' | 'shelter' | 'police';
  timestamp: string;
  isoTimestamp: string;
  relativeTime: string;
  triggerCause: string;
  currentDepthCm: number;
  thresholdDepthCm: number;
  excessDepthCm: number;
  elevationM: number;
  accessRoad: string;
  severity: 'critical' | 'warning' | 'emergency';
  acknowledged: boolean;
  targetAgency: string;
  operationalDirectives: string[];
  immediateNotificationMissed: boolean;
}

export type AlertQueue = QueuedThresholdAlert[];

function getInitialAlertQueue(centerLat: number, centerLng: number): AlertQueue {
  const now = Date.now();
  return [
    {
      id: `QUEUE-HIST-01`,
      facilityId: 'FAC-POWER-01',
      facilityName: 'Valley 132kV Power Grid Substation',
      facilityType: 'power_station',
      timestamp: new Date(now - 14 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      isoTimestamp: new Date(now - 14 * 60 * 1000).toISOString(),
      relativeTime: '14 min ago',
      triggerCause: 'Trough depression drainage overflow (+9cm above 25cm limit)',
      currentDepthCm: 34,
      thresholdDepthCm: 25,
      excessDepthCm: 9,
      elevationM: 513.8,
      accessRoad: 'Underpass Trough Service Road',
      severity: 'critical',
      acknowledged: false,
      targetAgency: 'Municipal Electricity Transmission Board (Load Dispatch)',
      operationalDirectives: [
        'Command preventive busbar trip & transfer urban load to North Grid.',
        'Deploy high-capacity mobile dewatering pumps to switchgear basement.',
        'Isolate low-lying auxiliary step-down transformers.'
      ],
      immediateNotificationMissed: true
    },
    {
      id: `QUEUE-HIST-02`,
      facilityId: 'FAC-TRANSIT-01',
      facilityName: 'Metro Interchange & Bus Terminus',
      facilityType: 'transit_hub',
      timestamp: new Date(now - 28 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      isoTimestamp: new Date(now - 28 * 60 * 1000).toISOString(),
      relativeTime: '28 min ago',
      triggerCause: 'Concourse stormwater surcharge (+8cm above 20cm limit)',
      currentDepthCm: 28,
      thresholdDepthCm: 20,
      excessDepthCm: 8,
      elevationM: 515.6,
      accessRoad: 'MG Road Concourse',
      severity: 'critical',
      acknowledged: false,
      targetAgency: 'Urban Mass Transit Corporation & Traffic Police',
      operationalDirectives: [
        'Close Gate 2 underground concourse pedestrian access.',
        'Reroute articulated feeder buses to elevated platform tier.',
        'Activate storm dewatering sumps.'
      ],
      immediateNotificationMissed: true
    },
    {
      id: `QUEUE-HIST-03`,
      facilityId: 'FAC-HOSP-01',
      facilityName: 'City Apex Memorial Hospital',
      facilityType: 'hospital',
      timestamp: new Date(now - 46 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      isoTimestamp: new Date(now - 46 * 60 * 1000).toISOString(),
      relativeTime: '46 min ago',
      triggerCause: 'Ambulance ramp approach water accumulation (+1cm over 15cm limit)',
      currentDepthCm: 16,
      thresholdDepthCm: 15,
      excessDepthCm: 1,
      elevationM: 528.3,
      accessRoad: 'Hospital Link Road',
      severity: 'warning',
      acknowledged: true,
      targetAgency: 'City EMS & State Health Directorate',
      operationalDirectives: [
        'Ambulance reroute advisory active via Route 3 Elevated Corridor.',
        'Deploy perimeter flood barriers at emergency bay entrance.',
        'Protect ground-level oxygen manifold and backup generator feed.'
      ],
      immediateNotificationMissed: false
    },
    {
      id: `QUEUE-HIST-04`,
      facilityId: 'FAC-FIRE-01',
      facilityName: 'Central Fire & Rescue Station #4',
      facilityType: 'fire_station',
      timestamp: new Date(now - 65 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      isoTimestamp: new Date(now - 65 * 60 * 1000).toISOString(),
      relativeTime: '1 hr ago',
      triggerCause: 'Bay apron water ponding approaching threshold limit',
      currentDepthCm: 19,
      thresholdDepthCm: 20,
      excessDepthCm: 0,
      elevationM: 523.5,
      accessRoad: 'Civic West Way',
      severity: 'warning',
      acknowledged: true,
      targetAgency: 'Civic Fire & Emergency Response Command',
      operationalDirectives: [
        'Stage rescue tender vehicles on elevated egress ramp.',
        'Monitor culvert discharge on Civic West Way.'
      ],
      immediateNotificationMissed: false
    }
  ];
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

  // AlertQueue state to keep a persistent history of triggered threshold breaches
  const [alertQueue, setAlertQueue] = useState<AlertQueue>(() => getInitialAlertQueue(location.lat, location.lng));
  const [modalTab, setModalTab] = useState<'radar' | 'queue' | 'directives'>('radar');
  const [queueFilter, setQueueFilter] = useState<'all' | 'missed' | 'unack' | 'hospital' | 'power_station'>('all');
  const [queueSearch, setQueueSearch] = useState<string>('');

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

      // Maintain full historical AlertQueue for all triggered threshold breaches
      setAlertQueue(prev => {
        const recentLoggedIds = new Set(
          prev
            .filter(item => Date.now() - new Date(item.isoTimestamp).getTime() < 120000)
            .map(i => i.facilityId)
        );

        const newQueueItems: QueuedThresholdAlert[] = [];
        const isoNow = new Date().toISOString();

        allThreatenedFacilities.forEach(f => {
          if (!recentLoggedIds.has(f.id)) {
            const isHosp = f.type === 'hospital';
            const isPower = f.type === 'power_station';
            const excess = Math.max(1, f.currentDepthCm - f.thresholdDepthCm);
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

            newQueueItems.push({
              id: `QUEUE-${f.id}-${Date.now()}`,
              facilityId: f.id,
              facilityName: f.name,
              facilityType: f.type,
              currentDepthCm: f.currentDepthCm,
              thresholdDepthCm: f.thresholdDepthCm,
              excessDepthCm: excess,
              elevationM: f.elevationM,
              accessRoad: f.accessRoad,
              severity: f.currentDepthCm >= f.thresholdDepthCm * 1.4 ? 'critical' : 'warning',
              timestamp: nowStr,
              isoTimestamp: isoNow,
              relativeTime: 'Just now',
              triggerCause: excess >= 8
                ? `Severe runoff inundation: +${excess}cm over threshold (${f.currentDepthCm}cm vs ${f.thresholdDepthCm}cm)`
                : `Drainage surcharge backflow: +${excess}cm over operating limit`,
              targetAgency,
              operationalDirectives: directives,
              acknowledged: false,
              immediateNotificationMissed: !isOpen // Flagged as missed if modal was not open at the moment of breach
            });
          }
        });

        return newQueueItems.length > 0 ? [...newQueueItems, ...prev] : prev;
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

  // AlertQueue interactions and handlers
  const handleAcknowledgeQueueItem = (id: string) => {
    setAlertQueue(prev => prev.map(item => item.id === id ? { ...item, acknowledged: true } : item));
  };

  const handleAcknowledgeAllQueue = () => {
    setAlertQueue(prev => prev.map(item => ({ ...item, acknowledged: true })));
  };

  const handleClearAcknowledgedQueue = () => {
    setAlertQueue(prev => prev.filter(item => !item.acknowledged));
  };

  const handleResetQueue = () => {
    setAlertQueue(getInitialAlertQueue(location.lat, location.lng));
  };

  const handleReplayBreachAudio = (item: QueuedThresholdAlert) => {
    playThresholdBreachAlert();
  };

  const handleSimulateBreachToQueue = () => {
    playThresholdBreachAlert();
    const now = new Date();
    const facilitiesPool = evaluatedFacilities.length > 0 ? evaluatedFacilities : getCriticalInfrastructure(location.lat, location.lng);
    const targetFacility = facilitiesPool[Math.floor(Math.random() * facilitiesPool.length)];
    const depth = targetFacility.thresholdDepthCm + Math.floor(Math.random() * 14) + 4;
    const excess = depth - targetFacility.thresholdDepthCm;
    const isHosp = targetFacility.type === 'hospital';
    const isPower = targetFacility.type === 'power_station';

    const simulatedAlert: QueuedThresholdAlert = {
      id: `SIM-QUEUE-${Date.now()}`,
      facilityId: targetFacility.id,
      facilityName: targetFacility.name,
      facilityType: targetFacility.type,
      currentDepthCm: depth,
      thresholdDepthCm: targetFacility.thresholdDepthCm,
      excessDepthCm: excess,
      elevationM: targetFacility.elevationM,
      accessRoad: targetFacility.accessRoad,
      severity: excess >= 8 ? 'critical' : 'warning',
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      isoTimestamp: now.toISOString(),
      relativeTime: 'Just now',
      triggerCause: `Simulated torrential surge: +${excess}cm over threshold (${depth}cm vs ${targetFacility.thresholdDepthCm}cm)`,
      targetAgency: isHosp ? 'City EMS Trauma Command' : isPower ? 'State Power Grid Dispatch' : 'Civil Defense Corps',
      operationalDirectives: [
        `Emergency simulated telemetry pushed for ${targetFacility.name}.`,
        `Surface water level: ${depth}cm exceeding ${targetFacility.thresholdDepthCm}cm design tolerance limit.`,
        `Emergency diversion activated on ${targetFacility.accessRoad}.`
      ],
      acknowledged: false,
      immediateNotificationMissed: true // Simulates a missed pop-up notification!
    };

    setAlertQueue(prev => [simulatedAlert, ...prev]);
    setModalTab('queue');
  };

  const unacknowledgedQueueCount = useMemo(() => 
    alertQueue.filter(a => !a.acknowledged).length,
    [alertQueue]
  );

  const missedNotificationsCount = useMemo(() => 
    alertQueue.filter(a => a.immediateNotificationMissed && !a.acknowledged).length,
    [alertQueue]
  );

  const filteredQueue = useMemo(() => {
    return alertQueue.filter(item => {
      // Category filter
      if (queueFilter === 'missed' && !item.immediateNotificationMissed) return false;
      if (queueFilter === 'unack' && item.acknowledged) return false;
      if (queueFilter === 'hospital' && item.facilityType !== 'hospital') return false;
      if (queueFilter === 'power_station' && item.facilityType !== 'power_station') return false;

      // Search keyword filter
      if (queueSearch.trim()) {
        const q = queueSearch.toLowerCase();
        return (
          item.facilityName.toLowerCase().includes(q) ||
          item.accessRoad.toLowerCase().includes(q) ||
          item.targetAgency.toLowerCase().includes(q) ||
          item.triggerCause.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [alertQueue, queueFilter, queueSearch]);

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

          {/* Missed Pop-Up Notification Alert Banner */}
          {missedNotificationsCount > 0 && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border border-amber-400 dark:border-amber-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-600 text-white shadow-sm shrink-0">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
                      {missedNotificationsCount} Missed Pop-Up {missedNotificationsCount === 1 ? 'Notification' : 'Notifications'} in AlertQueue
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-600 text-white font-black animate-pulse">
                      PAST BREACHES QUEUED
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                    Hydrodynamic threshold breaches were triggered for critical lifelines while the dialog was closed. Scroll through past alerts in the queue to review or acknowledge.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => {
                    setModalTab('queue');
                    setQueueFilter('missed');
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Scroll Past Alerts ({missedNotificationsCount})</span>
                </button>
              </div>
            </div>
          )}

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

          {/* Navigation Tabs Bar */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setModalTab('radar')}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shrink-0",
                modalTab === 'radar'
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              )}
            >
              <RadioTower className="w-4 h-4" />
              <span>Threat Radar & Live Feeds</span>
            </button>

            <button
              type="button"
              onClick={() => setModalTab('queue')}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 relative",
                modalTab === 'queue'
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              )}
            >
              <History className="w-4 h-4" />
              <span>AlertQueue History</span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold leading-none ml-1",
                unacknowledgedQueueCount > 0 ? "bg-red-500 text-white animate-pulse" : "bg-black/20 dark:bg-white/20 text-current"
              )}>
                {alertQueue.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setModalTab('directives')}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shrink-0",
                modalTab === 'directives'
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              )}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Resident Directives & Safe Route</span>
            </button>
          </div>

          {/* ======================================================================= */}
          {/* TAB 1: CRITICAL INFRASTRUCTURE THREAT RADAR & UI PUSH ALERTS */}
          {/* ======================================================================= */}
          {modalTab === 'radar' && (
            <div className="flex flex-col gap-4">
              {/* AlertQueue Snapshot Strip */}
              <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <History className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      AlertQueue Historical Ledger: {alertQueue.length} threshold breaches archived
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      {missedNotificationsCount > 0 
                        ? `${missedNotificationsCount} missed immediate pop-ups are pending review in the queue.` 
                        : "All historical lifeline threats and operational directives are recorded for emergency auditing."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalTab('queue')}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-sm"
                >
                  <span>Open AlertQueue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

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
            </div>
          )}

          {/* ======================================================================= */}
          {/* TAB 2: ALERTQUEUE & BREACH HISTORY (SCROLLABLE RECOVERY LOG) */}
          {/* ======================================================================= */}
          {modalTab === 'queue' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              {/* AlertQueue Telemetry Summary Header */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className={cn(
                  "p-3 rounded-xl border flex flex-col",
                  theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-800/40 border-slate-700"
                )}>
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Queued Breaches</span>
                  <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                    {alertQueue.length}
                  </span>
                  <span className="text-[10px] text-slate-500">Historical Incidents</span>
                </div>

                <div className={cn(
                  "p-3 rounded-xl border flex flex-col",
                  missedNotificationsCount > 0 
                    ? "bg-amber-50/80 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800" 
                    : theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-800/40 border-slate-700"
                )}>
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Missed Pop-ups</span>
                  <span className={cn(
                    "text-lg font-black font-mono mt-0.5 flex items-center gap-1",
                    missedNotificationsCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-400"
                  )}>
                    {missedNotificationsCount}
                    {missedNotificationsCount > 0 && <AlertTriangle className="w-4 h-4 text-amber-500 animate-bounce" />}
                  </span>
                  <span className="text-[10px] text-slate-500">Triggered while away</span>
                </div>

                <div className={cn(
                  "p-3 rounded-xl border flex flex-col",
                  unacknowledgedQueueCount > 0 
                    ? "bg-red-50/80 border-red-300 dark:bg-red-950/30 dark:border-red-800" 
                    : theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-800/40 border-slate-700"
                )}>
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Pending Review</span>
                  <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">
                    {unacknowledgedQueueCount}
                  </span>
                  <span className="text-[10px] text-slate-500">Unacknowledged</span>
                </div>

                <div className={cn(
                  "p-3 rounded-xl border flex flex-col",
                  theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-800/40 border-slate-700"
                )}>
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Max Inundation</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
                    {Math.max(...alertQueue.map(a => a.currentDepthCm), 0)} cm
                  </span>
                  <span className="text-[10px] text-slate-500">Peak Breach Depth</span>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search past alerts by facility, road, agency..."
                    value={queueSearch}
                    onChange={(e) => setQueueSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {queueSearch && (
                    <button
                      type="button"
                      onClick={() => setQueueSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setQueueFilter('all')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-colors shrink-0",
                      queueFilter === 'all'
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black"
                        : "text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
                    )}
                  >
                    All ({alertQueue.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setQueueFilter('missed')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-colors shrink-0 flex items-center gap-1",
                      queueFilter === 'missed'
                        ? "bg-amber-600 text-white font-black"
                        : "text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-950/50"
                    )}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Missed Pop-ups ({missedNotificationsCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQueueFilter('unack')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-colors shrink-0 flex items-center gap-1",
                      queueFilter === 'unack'
                        ? "bg-rose-600 text-white font-black"
                        : "text-rose-700 hover:bg-rose-100 dark:text-rose-300 dark:hover:bg-rose-950/50"
                    )}
                  >
                    <span>Unreviewed ({unacknowledgedQueueCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQueueFilter('hospital')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-colors shrink-0 flex items-center gap-1",
                      queueFilter === 'hospital'
                        ? "bg-blue-600 text-white font-black"
                        : "text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
                    )}
                  >
                    <HeartPulse className="w-3 h-3" />
                    <span>Hospitals</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQueueFilter('power_station')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-colors shrink-0 flex items-center gap-1",
                      queueFilter === 'power_station'
                        ? "bg-blue-600 text-white font-black"
                        : "text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
                    )}
                  >
                    <Zap className="w-3 h-3" />
                    <span>Substations</span>
                  </button>
                </div>
              </div>

              {/* Queue Action Controls */}
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSimulateBreachToQueue}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-sm flex items-center gap-1.5"
                    title="Simulate an immediate threshold breach and log to AlertQueue"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Simulate New Breach</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetQueue}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors flex items-center gap-1 font-semibold"
                    title="Reset default queue demonstration history"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset History</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {unacknowledgedQueueCount > 0 && (
                    <button
                      type="button"
                      onClick={handleAcknowledgeAllQueue}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 font-bold transition-colors flex items-center gap-1.5"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Acknowledge All ({unacknowledgedQueueCount})</span>
                    </button>
                  )}

                  {alertQueue.some(a => a.acknowledged) && (
                    <button
                      type="button"
                      onClick={handleClearAcknowledgedQueue}
                      className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors text-xs font-medium"
                    >
                      Clear Reviewed
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable AlertQueue Feed */}
              <div className="flex flex-col gap-3 max-h-[440px] overflow-y-auto pr-1.5 scrollbar-thin">
                {filteredQueue.length === 0 ? (
                  <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center flex flex-col items-center justify-center gap-2">
                    <History className="w-8 h-8 text-slate-400" />
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Alerts Found in Queue</h4>
                    <p className="text-xs text-slate-500 max-w-sm">
                      {queueSearch ? `No breaches match your search "${queueSearch}". Try clearing filters.` : "All past threshold alerts have been addressed."}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setQueueSearch('');
                        setQueueFilter('all');
                      }}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs"
                    >
                      Show All Alerts
                    </button>
                  </div>
                ) : (
                  filteredQueue.map((item) => {
                    const isHospital = item.facilityType === 'hospital';
                    const isSubstation = item.facilityType === 'power_station';
                    const isTransit = item.facilityType === 'transit_hub';
                    const isFire = item.facilityType === 'fire_station';

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "p-4 rounded-xl border flex flex-col gap-3 transition-all",
                          item.acknowledged
                            ? "opacity-75 bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                            : item.severity === 'critical'
                              ? "bg-red-50/90 border-red-300 dark:bg-red-950/30 dark:border-red-800 shadow-sm"
                              : "bg-amber-50/90 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800 shadow-sm"
                        )}
                      >
                        {/* Top Header Row */}
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              "p-2 rounded-lg flex items-center justify-center shrink-0",
                              isHospital ? "bg-rose-600 text-white" :
                              isSubstation ? "bg-amber-600 text-white" :
                              isTransit ? "bg-indigo-600 text-white" :
                              isFire ? "bg-orange-600 text-white" :
                              "bg-blue-600 text-white"
                            )}>
                              {isHospital && <HeartPulse className="w-4 h-4" />}
                              {isSubstation && <Zap className="w-4 h-4" />}
                              {!isHospital && !isSubstation && <Building2 className="w-4 h-4" />}
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded",
                                  isHospital ? "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200" :
                                  isSubstation ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200" :
                                  "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                                )}>
                                  {item.facilityType.replace('_', ' ').toUpperCase()}
                                </span>

                                <span className={cn(
                                  "text-[9px] font-black px-1.5 py-0.5 rounded uppercase",
                                  item.severity === 'critical' ? "bg-red-600 text-white" : "bg-amber-600 text-white"
                                )}>
                                  {item.severity === 'critical' ? `CRITICAL (+${item.excessDepthCm}cm)` : 'WARNING'}
                                </span>

                                {item.immediateNotificationMissed && !item.acknowledged && (
                                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-600 text-white flex items-center gap-1 animate-pulse shadow-sm">
                                    <BellOff className="w-3 h-3" />
                                    MISSED POP-UP NOTIFICATION
                                  </span>
                                )}
                              </div>

                              <h4 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                                {item.facilityName}
                              </h4>
                            </div>
                          </div>

                          <div className="text-right flex flex-col items-end">
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.relativeTime} ({item.timestamp})
                            </span>
                            <span className="text-[10px] text-slate-400">ID: {item.id}</span>
                          </div>
                        </div>

                        {/* Telemetry Gauge & Limit Comparison */}
                        <div className="p-3 rounded-lg bg-black/5 dark:bg-black/30 flex flex-col gap-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">
                              Access Road: <strong className="text-slate-800 dark:text-slate-200">{item.accessRoad}</strong> • Elevation: {item.elevationM}m MSL
                            </span>
                            <span className="font-mono font-black text-red-600 dark:text-red-400">
                              {item.currentDepthCm}cm <span className="text-slate-500 font-normal">/ {item.thresholdDepthCm}cm Limit</span>
                            </span>
                          </div>

                          {/* Depth Progress Bar */}
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden flex">
                            <div 
                              className={cn(
                                "h-full transition-all duration-500",
                                item.severity === 'critical' ? "bg-red-600" : "bg-amber-500"
                              )}
                              style={{ width: `${Math.min(100, (item.currentDepthCm / (item.thresholdDepthCm * 1.5)) * 100)}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
                              <AlertOctagon className="w-3 h-3 text-red-500" />
                              {item.triggerCause}
                            </span>
                            <span className="font-bold text-red-600 dark:text-red-400">
                              +{item.excessDepthCm}cm Above Limit
                            </span>
                          </div>
                        </div>

                        {/* Target Agency & Operational Directives */}
                        <div className="text-xs flex flex-col gap-1.5">
                          <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            Dispatched Authority: <span className="font-bold text-blue-600 dark:text-blue-400">{item.targetAgency}</span>
                          </div>

                          <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400 pl-1">
                            {item.operationalDirectives.map((directive, dIdx) => (
                              <li key={dIdx} className="flex items-start gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                                <span>{directive}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Card Action Controls Footer */}
                        <div className="pt-2.5 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleReplayBreachAudio(item)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-slate-700 dark:text-slate-300"
                              title="Replay threshold breach warning sound"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Sound Alert</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (onSelectRoute) onSelectRoute('route-shelter');
                                onClose();
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 transition-colors flex items-center gap-1"
                              title="Show recommended safe evacuation route on map"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Reroute Vehicles</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            {!item.acknowledged ? (
                              <button
                                type="button"
                                onClick={() => handleAcknowledgeQueueItem(item.id)}
                                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Acknowledge Breach</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Breach Reviewed</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* TAB 3: RESIDENT ACTION DIRECTIVES & DESIGNATED SAFE SHELTER */}
          {/* ======================================================================= */}
          {modalTab === 'directives' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
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
            </div>
          )}

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

