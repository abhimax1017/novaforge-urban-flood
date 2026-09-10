import React, { useState } from 'react';
import { 
  CloudRain, 
  Activity, 
  Droplets, 
  Radio, 
  Wifi, 
  AlertTriangle, 
  CheckCircle2, 
  Cpu, 
  ArrowUpRight, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Layers,
  X,
  Compass,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SensorData, PredictionData, Location } from '../types';
import { DEMO_SENSORS } from '../data';

interface SensorFusionPanelProps {
  theme: 'light' | 'dark';
  location: Location;
  prediction: PredictionData | null;
  onClose?: () => void;
  onSelectSensor?: (sensor: SensorData) => void;
}

export function SensorFusionPanel({ 
  theme, 
  location, 
  prediction,
  onClose,
  onSelectSensor 
}: SensorFusionPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'archetypes' | 'telemetry' | 'fusion'>('archetypes');
  const [expandedArchetype, setExpandedArchetype] = useState<string | null>('water_level');

  const currentDepth = prediction?.maxDepthCm ?? 20;
  const currentRain = prediction?.rainfallIntensityMm ?? 18;

  // Calibrated live sensors based on current simulation state
  const liveSensors: SensorData[] = DEMO_SENSORS.map((s, idx) => {
    let val = s.value;
    if (s.type === 'water_level') {
      val = Math.max(4, Math.round(currentDepth * (idx === 0 ? 1.08 : 0.42)));
    } else if (s.type === 'rain_gauge') {
      val = currentRain;
    } else if (s.type === 'drain_flow') {
      val = Math.min(180, Math.round((currentRain / 35) * 110 + (idx === 1 ? 18 : -12)));
    }

    return {
      ...s,
      value: val,
      status: (s.type === 'water_level' && val > 30) || (s.type === 'drain_flow' && val > 100)
        ? 'warning'
        : s.status
    };
  });

  const sensorArchetypes = [
    {
      id: 'water_level',
      title: 'Ultrasonic Water Level Probes',
      code: 'WL Series (e.g. WL-042)',
      icon: Droplets,
      color: 'text-cyan-500',
      bgLight: 'bg-cyan-50 border-cyan-200',
      bgDark: 'bg-cyan-950/30 border-cyan-800/50',
      unit: 'Centimeters (cm)',
      measurement: 'Standing Surface Water & Depression Depth',
      workingPrinciple: 
        'Pole-mounted downward-firing ultrasonic transceivers emit high-frequency acoustic pulses at 40 kHz. By measuring the time-of-flight return echo bounced off water surfaces, the sensor continuously derives the road flood depth with millimeter accuracy without physical water immersion.',
      roleInSystem: 
        'Directly feeds real-time ground truth depth to calculate vehicle stall risks and expands the circular flood inundation radius.',
      thresholds: [
        { label: '0 – 15 cm', desc: 'Passable for standard passenger vehicles', status: 'normal' },
        { label: '15 – 30 cm', desc: 'Ankle-deep; low-sedan exhaust intake warning', status: 'caution' },
        { label: '30 – 50 cm', desc: 'Critical stall risk; bus/SUV high clearance only', status: 'warning' },
        { label: '50+ cm', desc: 'Complete submergence; active vehicular impassability', status: 'critical' }
      ]
    },
    {
      id: 'drain_flow',
      title: 'Acoustic Doppler Drain Flow Meters',
      code: 'DF Series (e.g. DF-104)',
      icon: Activity,
      color: 'text-blue-500',
      bgLight: 'bg-blue-50 border-blue-200',
      bgDark: 'bg-blue-950/30 border-blue-800/50',
      unit: 'Capacity Percentage (%)',
      measurement: 'Stormwater Pipe Velocity & Surcharge Load',
      workingPrinciple: 
        'Submerged within subterranean box culverts and storm sewer conduits, these meters transmit continuous ultrasonic beams into moving water. The Doppler frequency shift reflected from particulate matter calculates true fluid velocity alongside hydrostatic pressure-based cross-sectional fill level.',
      roleInSystem: 
        'Gives early-warning indicators of subterranean pipe choking and backflow surcharges 15–20 minutes before water bursts up through road manholes.',
      thresholds: [
        { label: '< 70%', desc: 'Gravity flow operating under design capacity', status: 'normal' },
        { label: '70 – 95%', desc: 'Near pipe full-bore capacity; limited head space', status: 'caution' },
        { label: '100%+', desc: 'Hydraulic surcharge: backflow risk to surface manholes', status: 'warning' }
      ]
    },
    {
      id: 'rain_gauge',
      title: 'Optical & Tipping Rain Gauges',
      code: 'RG Series (e.g. RG-001)',
      icon: CloudRain,
      color: 'text-indigo-500',
      bgLight: 'bg-indigo-50 border-indigo-200',
      bgDark: 'bg-indigo-950/30 border-indigo-800/50',
      unit: 'Centimeters / Hour (cm in 1 hr)',
      measurement: '1-Hour Rainfall Volume & Cloudburst Inflow',
      workingPrinciple: 
        'Combines an optical infrared sensor that monitors droplet diffraction patterns with a dual-reed precision tipping bucket. The optical sensor detects immediate onset rate in seconds, calibrated to 1-hour cumulative rainfall depth.',
      roleInSystem: 
        'Provides acute 1-hour precipitation volume to classify real-time risk tiers (Safe, Watch, Warning, High Risk, Critical) and calculate runoff expansion.',
      thresholds: [
        { label: '0 – 1.5 cm', desc: '🟢 Safe: Normal conditions, drains flowing smoothly', status: 'normal' },
        { label: '1.5 – 3 cm', desc: '🟡 Watch: Moderate showers, puddling in dips', status: 'caution' },
        { label: '3 – 5 cm', desc: '🟠 Warning: Heavy rain, culvert surcharge alert', status: 'warning' },
        { label: '5 – 10 cm', desc: '🔴 High Risk: Rapid street submergence & flash flooding', status: 'critical' },
        { label: '> 10 cm', desc: '🚨 Critical: Extreme deluge, immediate shelter required', status: 'critical' }
      ]
    }
  ];

  return (
    <div className={cn(
      "absolute top-4 left-4 backdrop-blur-md border rounded-xl shadow-2xl w-96 max-w-[94vw] max-h-[86vh] pointer-events-auto transition-colors flex flex-col z-30 overflow-hidden",
      theme === 'light' ? "bg-white/95 border-slate-200 text-slate-800" : "bg-slate-900/95 border-slate-700 text-slate-100"
    )}>
      {/* Header */}
      <div className={cn(
        "p-3.5 border-b flex items-center justify-between shrink-0",
        theme === 'light' ? "border-slate-200 bg-slate-50/80" : "border-slate-800 bg-slate-950/60"
      )}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-black tracking-wider uppercase">Sensor Fusion Intelligence</h3>
            <p className="text-[10px] text-slate-400">IoT Telemetry & Predictive Ground Monitoring</p>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className={cn(
        "flex border-b p-1 gap-1 text-[11px] font-bold shrink-0",
        theme === 'light' ? "border-slate-200 bg-slate-100/50" : "border-slate-800 bg-slate-950/40"
      )}>
        <button
          onClick={() => setActiveSubTab('archetypes')}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-md transition-all text-center",
            activeSubTab === 'archetypes'
              ? theme === 'light' ? "bg-white text-blue-600 shadow-sm" : "bg-slate-800 text-cyan-300 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          Sensor Guide
        </button>
        <button
          onClick={() => setActiveSubTab('telemetry')}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-md transition-all text-center flex items-center justify-center gap-1",
            activeSubTab === 'telemetry'
              ? theme === 'light' ? "bg-white text-blue-600 shadow-sm" : "bg-slate-800 text-cyan-300 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          <span>Live Grid</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </button>
        <button
          onClick={() => setActiveSubTab('fusion')}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-md transition-all text-center",
            activeSubTab === 'fusion'
              ? theme === 'light' ? "bg-white text-blue-600 shadow-sm" : "bg-slate-800 text-cyan-300 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          How Fusion Works
        </button>
      </div>

      {/* Scrollable Content Body */}
      <div className="overflow-y-auto p-3.5 flex flex-col gap-3 text-xs hide-scrollbar flex-1">
        {/* SUBTAB 1: SENSOR ARCHETYPES & DETAILED EXPLANATION */}
        {activeSubTab === 'archetypes' && (
          <div className="flex flex-col gap-3">
            <div className={cn(
              "p-2.5 rounded-lg border text-[11px] leading-relaxed",
              theme === 'light' ? "bg-blue-50/70 border-blue-200/60 text-blue-900" : "bg-blue-950/20 border-blue-900/50 text-blue-200"
            )}>
              <p>
                AquaSense employs three distinct IoT hardware sensors installed across roads, culverts, and meteorological stations to provide continuous hydrodynamic telemetry.
              </p>
            </div>

            {sensorArchetypes.map((sensor) => {
              const isExpanded = expandedArchetype === sensor.id;
              const Icon = sensor.icon;
              return (
                <div 
                  key={sensor.id}
                  className={cn(
                    "rounded-xl border transition-all overflow-hidden",
                    theme === 'light' ? "bg-white border-slate-200" : "bg-slate-950/50 border-slate-800"
                  )}
                >
                  <div 
                    onClick={() => setExpandedArchetype(isExpanded ? null : sensor.id)}
                    className="p-3 flex items-start justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={cn("p-2 rounded-lg border mt-0.5", theme === 'light' ? sensor.bgLight : sensor.bgDark)}>
                        <Icon className={cn("w-4 h-4", sensor.color)} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs leading-tight">{sensor.title}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">{sensor.code}</span>
                        <div className="mt-1 flex items-center gap-2 text-[10px]">
                          <span className="text-slate-500 dark:text-slate-400">Measures:</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{sensor.unit}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-blue-500 mt-1">
                      {isExpanded ? 'Hide Details' : 'Explain'}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className={cn(
                      "p-3 border-t flex flex-col gap-2.5 text-[11px] bg-slate-50/50 dark:bg-slate-900/40",
                      theme === 'light' ? "border-slate-200" : "border-slate-800/80"
                    )}>
                      <div>
                        <span className="font-bold text-[10px] uppercase text-slate-400 block mb-1">
                          Working Principle (How It Works)
                        </span>
                        <p className="leading-relaxed text-slate-600 dark:text-slate-300">
                          {sensor.workingPrinciple}
                        </p>
                      </div>

                      <div>
                        <span className="font-bold text-[10px] uppercase text-slate-400 block mb-1">
                          Role In Prediction Model
                        </span>
                        <p className="leading-relaxed text-slate-600 dark:text-slate-300">
                          {sensor.roleInSystem}
                        </p>
                      </div>

                      <div>
                        <span className="font-bold text-[10px] uppercase text-slate-400 block mb-1.5">
                          Operational Alert Thresholds
                        </span>
                        <div className="grid grid-cols-1 gap-1">
                          {sensor.thresholds.map((t, i) => (
                            <div 
                              key={i} 
                              className={cn(
                                "flex items-center justify-between p-1.5 rounded text-[10px]",
                                theme === 'light' ? "bg-white border border-slate-200" : "bg-slate-950 border border-slate-800"
                              )}
                            >
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{t.label}</span>
                              <span className="text-slate-500 dark:text-slate-400 text-right truncate ml-2">{t.desc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* SUBTAB 2: LIVE SENSOR TELEMETRY GRID */}
        {activeSubTab === 'telemetry' && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Active IoT Grid: {location.name}</span>
              <span className="flex items-center gap-1 font-mono text-emerald-500 font-bold">
                <Wifi className="w-3 h-3" /> 5 ONLINE
              </span>
            </div>

            {liveSensors.map((sensor) => {
              const isWater = sensor.type === 'water_level';
              const isDrain = sensor.type === 'drain_flow';
              const isRain = sensor.type === 'rain_gauge';

              return (
                <div 
                  key={sensor.id}
                  onClick={() => onSelectSensor && onSelectSensor(sensor)}
                  className={cn(
                    "p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer hover:scale-[1.01]",
                    theme === 'light' ? "bg-white border-slate-200 shadow-sm" : "bg-slate-950/60 border-slate-800"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg border",
                      isWater ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-500" :
                      isDrain ? "bg-blue-500/10 border-blue-500/30 text-blue-500" :
                      "bg-indigo-500/10 border-indigo-500/30 text-indigo-500"
                    )}>
                      {isWater && <Droplets className="w-4 h-4" />}
                      {isDrain && <Activity className="w-4 h-4" />}
                      {isRain && <CloudRain className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs">{sensor.id}</span>
                        <span className={cn(
                          "text-[9px] px-1.5 py-0.2 rounded font-bold uppercase",
                          sensor.status === 'warning' ? "bg-amber-500/15 text-amber-500" : "bg-emerald-500/15 text-emerald-500"
                        )}>
                          {sensor.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {sensor.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-mono font-black text-slate-900 dark:text-slate-100">
                        {sensor.value}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">{sensor.unit}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-slate-400">
                      {sensor.trend === 'rising' ? (
                        <span className="flex items-center text-red-500 font-bold">
                          <TrendingUp className="w-3 h-3" /> rising
                        </span>
                      ) : sensor.trend === 'falling' ? (
                        <span className="flex items-center text-emerald-500 font-bold">
                          <TrendingDown className="w-3 h-3" /> falling
                        </span>
                      ) : (
                        <span className="flex items-center text-slate-400 font-medium">
                          <Minus className="w-3 h-3" /> stable
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SUBTAB 3: HOW SENSOR FUSION WORKS */}
        {activeSubTab === 'fusion' && (
          <div className="flex flex-col gap-3">
            <div className={cn(
              "p-3 rounded-xl border flex flex-col gap-2",
              theme === 'light' ? "bg-white border-slate-200" : "bg-slate-950/60 border-slate-800"
            )}>
              <div className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase">
                <Cpu className="w-4 h-4" />
                <span>Multi-Modal Telemetry Triangulation</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                Single sensors can produce false alarms (e.g. debris blocking a drain inlet or wind disturbing a gauge). 
                <strong> Sensor Fusion</strong> mathematically synthesizes three independent data vectors to produce trustworthy predictions:
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className={cn("p-2.5 rounded-lg border", theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800")}>
                <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-500 mb-1">
                  <span>1. Lag-Time Correlation</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  When optical rain gauges detect a cloudburst ({currentRain} mm/h), the model uses catchment topography to project that underground culverts will reach 100%+ capacity within a 15–20 minute transit window.
                </p>
              </div>

              <div className={cn("p-2.5 rounded-lg border", theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800")}>
                <div className="flex items-center gap-1.5 font-bold text-xs text-blue-500 mb-1">
                  <span>2. Backflow Surcharge Verification</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Acoustic Doppler sensors detect backflow pressure spikes before water surfaces. Ultrasonic road sensors then verify if the hydraulic surge has breached ground gutters.
                </p>
              </div>

              <div className={cn("p-2.5 rounded-lg border", theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800")}>
                <div className="flex items-center gap-1.5 font-bold text-xs text-cyan-500 mb-1">
                  <span>3. Dynamic Evacuation Rerouting</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  As the fused telemetry expands the circular flood inundation radius beyond road thresholds, corrupted transit corridors are instantly flagged as blocked, shifting safe evacuation routes to elevated bypasses.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info Badge */}
      <div className={cn(
        "p-2.5 border-t text-[10px] flex items-center justify-between shrink-0",
        theme === 'light' ? "border-slate-200 bg-slate-50 text-slate-500" : "border-slate-800 bg-slate-950 text-slate-400"
      )}>
        <span className="flex items-center gap-1">
          <Info className="w-3 h-3 text-blue-500" />
          <span>Fusing IoT, Radar & DEM Graph</span>
        </span>
        <span className="font-mono font-bold text-emerald-500">Telemetry Active</span>
      </div>
    </div>
  );
}
