import React from 'react';
import { 
  CloudRain, 
  Clock, 
  Mountain, 
  Waves, 
  Network, 
  Activity, 
  AlertTriangle, 
  Cpu, 
  MapPin, 
  Box, 
  ShieldAlert, 
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface PipelineStep {
  id: string;
  name: string;
  shortLabel: string;
  icon: React.ElementType;
  tabKey?: string;
  description: string;
  status: 'active' | 'synced' | 'overload';
}

interface PipelineFlowBarProps {
  activeTab: string;
  onSelectTab?: (tab: string) => void;
  onSelectStep?: (step: string) => void;
  onOpenValidation?: () => void;
  surchargingCount?: number;
  timeOffsetMin?: number;
  rainfallMmHr?: number;
}

export default function PipelineFlowBar({
  activeTab,
  onSelectTab,
  onSelectStep,
  onOpenValidation,
  surchargingCount = 0,
  timeOffsetMin = 30,
  rainfallMmHr = 45
}: PipelineFlowBarProps) {
  const steps: PipelineStep[] = [
    {
      id: 'radar',
      name: 'Rainfall / Radar Data',
      shortLabel: 'Radar Feed',
      icon: CloudRain,
      tabKey: 'radar',
      description: 'Doppler reflectivity (dBZ) & IMD precipitation nowcasting',
      status: 'synced'
    },
    {
      id: 'nowcasting',
      name: 'Rainfall Nowcast',
      shortLabel: '0-3h Rain',
      icon: Clock,
      tabKey: 'overview',
      description: `Lagrangian rain cell advection: ${rainfallMmHr} mm/hr`,
      status: 'synced'
    },
    {
      id: 'dem',
      name: 'High-Res DEM / Terrain',
      shortLabel: 'DEM Grid',
      icon: Mountain,
      tabKey: 'dem',
      description: '1m elevation matrix, low basin sinks & gravity slopes',
      status: 'synced'
    },
    {
      id: 'surface-routing',
      name: '2D Surface Water Routing',
      shortLabel: '2D Routing',
      icon: Waves,
      tabKey: 'dem',
      description: 'Kinematic wave overland runoff towards drainage inlets',
      status: 'synced'
    },
    {
      id: 'drainage-graph',
      name: 'Underground Drainage Graph',
      shortLabel: 'Drain Graph',
      icon: Network,
      tabKey: 'drainage',
      description: 'Directed network: 10 Nodes (Manholes, Inlets, PS) & 9 Pipes',
      status: 'synced'
    },
    {
      id: 'hydraulic-calc',
      name: 'Hydraulic Capacity Calculation',
      shortLabel: 'Hydraulics',
      icon: Activity,
      tabKey: 'drainage',
      description: "Manning's open/pressurized 1D conduit flow equations",
      status: 'synced'
    },
    {
      id: 'blockage-backflow',
      name: 'Blockage & Backflow Detection',
      shortLabel: 'Surcharge & Spill',
      icon: AlertTriangle,
      tabKey: 'drainage',
      description: surchargingCount > 0 ? `⚠️ ${surchargingCount} nodes surcharging & spilling` : 'Normal head levels',
      status: surchargingCount > 0 ? 'overload' : 'synced'
    },
    {
      id: 'ai-prediction',
      name: 'AI Sensor + Model Fusion',
      shortLabel: 'AI Fusion',
      icon: Cpu,
      tabKey: 'overview',
      description: 'XGBoost + Hydrodynamic hybrid confidence scoring (91%)',
      status: 'synced'
    },
    {
      id: 'street-depth',
      name: 'Street-Level Flood Depth',
      shortLabel: 'Road Depth',
      icon: MapPin,
      tabKey: 'overview',
      description: 'Centimeter depth and time-to-flood for each urban road',
      status: 'synced'
    },
    {
      id: 'digital-twin',
      name: '3D Digital Twin',
      shortLabel: '3D Twin',
      icon: Box,
      tabKey: '3d-map',
      description: 'Coupled surface terrain & underground pipe infrastructure',
      status: 'synced'
    },
    {
      id: 'alerts-routing',
      name: 'Alerts + Safe Routing + API',
      shortLabel: 'Safe Route & Alerts',
      icon: ShieldAlert,
      tabKey: 'safe-routes',
      description: 'Emergency routing for ambulances & REST API endpoints',
      status: 'synced'
    }
  ];

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-slate-200 px-3 py-1.5 flex items-center overflow-x-auto no-scrollbar shadow-inner text-xs">
      <div className="flex items-center gap-1.5 shrink-0 pr-3 border-r border-slate-700 mr-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-mono text-[10px] tracking-wider text-cyan-400 font-bold uppercase">
          SIH26085 Pipeline
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {steps.map((step, idx) => {
          const isSelected = step.tabKey === activeTab;
          const isOverload = step.status === 'overload';

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => {
                  if (step.tabKey) {
                    if (onSelectStep) onSelectStep(step.tabKey);
                    else if (onSelectTab) onSelectTab(step.tabKey);
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all text-left group shrink-0",
                  isSelected 
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm" 
                    : isOverload
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                      : "hover:bg-slate-800/80 text-slate-400 hover:text-slate-200"
                )}
                title={`${step.name} - ${step.description}`}
              >
                <step.icon className={cn(
                  "w-3.5 h-3.5",
                  isSelected ? "text-cyan-400" : isOverload ? "text-rose-400" : "text-slate-400 group-hover:text-slate-200"
                )} />
                <span className="font-semibold text-[11px] whitespace-nowrap">
                  {step.shortLabel}
                </span>
                {isOverload && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                )}
              </button>

              {idx < steps.length - 1 && (
                <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
