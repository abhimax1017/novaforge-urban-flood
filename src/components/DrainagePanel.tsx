import React, { useState } from 'react';
import { 
  Activity, 
  GitMerge, 
  AlertOctagon, 
  Cpu, 
  Layers, 
  Sliders, 
  RotateCcw, 
  Zap, 
  Droplets,
  ArrowDownRight,
  ShieldCheck,
  Radio
} from 'lucide-react';
import { cn } from '../lib/utils';
import { DrainageNode, DrainageEdge } from '../types';

interface DrainagePanelProps {
  theme: 'light' | 'dark';
  nodes: DrainageNode[];
  edges: DrainageEdge[];
  systemLoadPct: number;
  totalBackflowM3s: number;
  surchargingCount: number;
  causalChain: string;
  globalBlockagePct: number;
  onUpdateBlockage: (pct: number) => void;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
  viewMode?: 'surface' | 'underground' | 'both';
  onChangeViewMode?: (mode: 'surface' | 'underground' | 'both') => void;
  onTogglePumps?: () => void;
  pumpsActive?: boolean;
}

export function DrainagePanel({
  theme,
  nodes,
  edges,
  systemLoadPct,
  totalBackflowM3s,
  surchargingCount,
  causalChain,
  globalBlockagePct,
  onUpdateBlockage,
  selectedNodeId,
  onSelectNode,
  viewMode = 'both',
  onChangeViewMode,
  onTogglePumps,
  pumpsActive = true
}: DrainagePanelProps) {
  const [activeTab, setActiveTab] = useState<'network' | 'blockage' | 'nodes'>('blockage');
  const selectedNode = nodes.find(n => n.id === selectedNodeId) || nodes[2]; // Default to J-01 or selected

  return (
    <div className={cn(
      "absolute top-4 left-4 backdrop-blur-md border p-4 rounded-xl shadow-2xl w-84 sm:w-96 pointer-events-auto transition-colors flex flex-col gap-3.5 z-30 max-h-[85vh] overflow-y-auto",
      theme === 'light' ? "bg-white/95 border-slate-200" : "bg-slate-900/95 border-slate-700"
    )}>
      {/* Header */}
      <div className={cn("flex justify-between items-center border-b pb-2", theme === 'light' ? 'border-slate-200' : 'border-slate-800')}>
        <div className="flex items-center gap-2">
          <Activity className={cn("w-4 h-4", theme === 'light' ? "text-slate-700" : "text-cyan-400")} />
          <h3 className={cn("text-xs font-bold tracking-widest uppercase", theme === 'light' ? "text-slate-800" : "text-slate-300")}>
            Hydraulic Drainage Graph
          </h3>
        </div>
        <div className="text-[9px] font-bold px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 uppercase flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
          EPA SWMM 1D/2D
        </div>
      </div>

      {/* Mode Selector: Surface | Underground | Both */}
      <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-950/60 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-semibold">
        <span className="text-slate-400 text-[10px] uppercase font-bold pl-1 flex items-center gap-1">
          <Layers className="w-3 h-3" /> View:
        </span>
        <div className="flex gap-1">
          {(['surface', 'underground', 'both'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => onChangeViewMode && onChangeViewMode(mode)}
              className={cn(
                "px-2.5 py-1 rounded capitalize transition-all",
                viewMode === mode
                  ? "bg-cyan-500 text-white font-bold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-tabs: Blockage Simulator | Network Health | Node List */}
      <div className="grid grid-cols-3 gap-1 border-b border-slate-200 dark:border-slate-800 pb-2 text-[11px] font-bold">
        <button
          onClick={() => setActiveTab('blockage')}
          className={cn(
            "py-1 rounded text-center transition-all",
            activeTab === 'blockage' 
              ? "bg-slate-200 dark:bg-slate-800 text-cyan-600 dark:text-cyan-300" 
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          Blockage Sim
        </button>
        <button
          onClick={() => setActiveTab('network')}
          className={cn(
            "py-1 rounded text-center transition-all",
            activeTab === 'network' 
              ? "bg-slate-200 dark:bg-slate-800 text-cyan-600 dark:text-cyan-300" 
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          Network Load
        </button>
        <button
          onClick={() => setActiveTab('nodes')}
          className={cn(
            "py-1 rounded text-center transition-all",
            activeTab === 'nodes' 
              ? "bg-slate-200 dark:bg-slate-800 text-cyan-600 dark:text-cyan-300" 
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          Nodes ({nodes.length})
        </button>
      </div>

      {/* TAB 1: BLOCKAGE & BACKFLOW SIMULATION (SIH26085 §7) */}
      {activeTab === 'blockage' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-500" />
                Drain Blockage Override:
              </span>
              <span className={cn(
                "text-xs font-mono font-bold px-2 py-0.5 rounded border",
                globalBlockagePct > 50 
                  ? "bg-rose-950 text-rose-300 border-rose-800" 
                  : "bg-amber-950/60 text-amber-300 border-amber-800"
              )}>
                {globalBlockagePct}% Blocked
              </span>
            </div>

            {/* Quick step buttons: 0%, 25%, 50%, 75%, 100% */}
            <div className="grid grid-cols-5 gap-1 mb-2">
              {[0, 25, 50, 75, 100].map(pct => (
                <button
                  key={pct}
                  onClick={() => onUpdateBlockage(pct)}
                  className={cn(
                    "py-1 text-[10px] font-mono font-bold rounded border transition-all",
                    globalBlockagePct === pct
                      ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm"
                      : "bg-slate-200 dark:bg-slate-800/80 text-slate-400 border-slate-300 dark:border-slate-700 hover:text-slate-200"
                  )}
                >
                  {pct}%
                </button>
              ))}
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={globalBlockagePct}
              onChange={(e) => onUpdateBlockage(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg"
            />
          </div>

          {/* Causal Chain Explanation (Explicitly requested by SIH26085) */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-amber-400 tracking-wide">
              <AlertOctagon className="w-3.5 h-3.5" />
              Hydraulic Causal Chain
            </div>
            <div className="text-[10px] font-mono leading-relaxed text-slate-300 bg-slate-950/80 p-2 rounded-lg border border-slate-800">
              {causalChain}
            </div>
          </div>

          {/* Pump Station Emergency Boost Button */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-lg",
                pumpsActive ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-500"
              )}>
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  Sub-Basin Pumping Station PS-01
                </div>
                <div className="text-[9px] text-slate-400">
                  {pumpsActive ? "22 m³/s Active Discharge" : "Pumps Idle / Low"}
                </div>
              </div>
            </div>
            <button
              onClick={onTogglePumps}
              className={cn(
                "px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all",
                pumpsActive 
                  ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm" 
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              )}
            >
              {pumpsActive ? "ACTIVE" : "START BOOST"}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: NETWORK LOAD & OVERFLOW METRICS */}
      {activeTab === 'network' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="grid grid-cols-2 gap-2">
            <div className={cn("p-2.5 rounded-xl border flex flex-col gap-1", theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800")}>
              <div className="flex items-center gap-1.5">
                <GitMerge className="w-3.5 h-3.5 text-cyan-500" />
                <span className="text-[10px] font-bold uppercase text-slate-400">Total Conduits</span>
              </div>
              <span className="text-xl font-mono font-black text-slate-800 dark:text-slate-100">
                {edges.length} Pipes
              </span>
              <span className="text-[10px] text-cyan-400">1200-2400mm Dia</span>
            </div>

            <div className={cn("p-2.5 rounded-xl border flex flex-col gap-1", theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800")}>
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-[10px] font-bold uppercase text-slate-400">Hydraulic Nodes</span>
              </div>
              <span className="text-xl font-mono font-black text-slate-800 dark:text-slate-100">
                {nodes.length} Nodes
              </span>
              <span className="text-[10px] text-purple-400">Manholes & Inlets</span>
            </div>
          </div>

          {/* System Capacity Load Bar */}
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-end mb-1.5">
              <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                Total System Hydraulic Load
              </span>
              <span className={cn(
                "text-xs font-mono font-black",
                systemLoadPct > 100 ? "text-rose-500" : systemLoadPct > 80 ? "text-amber-500" : "text-emerald-500"
              )}>
                {systemLoadPct}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  systemLoadPct > 100 ? "bg-rose-500" : systemLoadPct > 80 ? "bg-amber-500" : "bg-emerald-500"
                )} 
                style={{ width: `${Math.min(100, systemLoadPct)}%` }} 
              />
            </div>
          </div>

          {/* Surcharges & Backflow Banner */}
          <div className={cn(
            "p-3 rounded-xl border flex flex-col gap-2",
            surchargingCount > 0 
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300" 
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          )}>
            <div className="flex items-center gap-1.5 text-xs font-bold">
              {surchargingCount > 0 ? (
                <>
                  <AlertOctagon className="w-4 h-4 text-rose-400 animate-pulse" />
                  <span>{surchargingCount} Surcharging Nodes Detected</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Hydraulic Flow Contained Within Pipes</span>
                </>
              )}
            </div>
            {totalBackflowM3s > 0 && (
              <div className="text-[11px] font-mono text-rose-300">
                Spilling <strong>+{totalBackflowM3s} m³/s</strong> backflow stormwater directly onto street surfaces!
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: NODES INSPECTOR */}
      {activeTab === 'nodes' && (
        <div className="space-y-2 animate-in fade-in duration-150 max-h-64 overflow-y-auto pr-1">
          {nodes.map(n => (
            <div
              key={n.id}
              onClick={() => onSelectNode && onSelectNode(n.id)}
              className={cn(
                "p-2 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between",
                selectedNodeId === n.id 
                  ? "bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow-sm" 
                  : "bg-slate-100 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-200"
              )}
            >
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span className="font-mono text-cyan-400">{n.id}</span>
                  <span>{n.name}</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Elev: {n.elevationM}m • Cap: {n.capacityM3s} m³/s • Flow: {n.currentFlowM3s} m³/s
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-mono font-bold",
                  n.utilizationPct > 100 
                    ? "bg-rose-950 text-rose-300 border border-rose-800" 
                    : n.utilizationPct > 80 
                      ? "bg-amber-950 text-amber-300 border border-amber-800" 
                      : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                )}>
                  {n.utilizationPct}%
                </span>
                {n.backflowRateM3s > 0 && (
                  <div className="text-[9px] text-rose-400 font-bold mt-0.5">
                    +{n.backflowRateM3s} m³/s
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
