import { RoadRisk, PredictionData, WhatIfConfig, NowcastSummaryItem } from '../types';
import { calculateHydraulicNetworkState, SimulationState, generateDrainageNetwork } from './drainageGraph';
import { generateUrbanDEM, calculateSurfaceWaterAccumulation } from './terrainDEM';

export interface CoupledNowcastState {
  timeOffsetMin: number;
  rainfallIntensityMm: number;
  maxDepthCm: number;
  floodedAreaKm2: number;
  timeToFloodMin: number;
  overallFloodProbability: number;
  confidenceScore: number;
  drainUtilizationPct: number;
  surchargingNodesCount: number;
  backflowRateM3s: number;
  causalChain: string;
  roads: RoadRisk[];
  fusedExplanations: string[];
}

export function computeCoupledNowcast(
  centerLat: number,
  centerLng: number,
  timeOffsetMin: number,
  whatIf?: Partial<WhatIfConfig>
): CoupledNowcastState {
  // Base rainfall intensity progression (0 to 180 min)
  const baseRainfallStops: Record<number, number> = {
    0: 14,
    30: 28,
    60: 46,
    90: 74,
    120: 110,
    180: 62
  };

  let rainMm = baseRainfallStops[timeOffsetMin] ?? 35;
  if (whatIf?.rainfallMmHr !== undefined) {
    rainMm = whatIf.rainfallMmHr;
  }

  const blockagePct = whatIf?.drainBlockagePct ?? 0;
  const pumpCapacity = whatIf?.pumpCapacityM3s ?? 12;

  // Run Hydraulic Drainage Graph Solver
  const { nodes, edges } = generateDrainageNetwork(centerLat, centerLng);
  const simState: SimulationState = {
    rainfallMmHr: rainMm,
    timeOffsetMin,
    globalBlockagePct: blockagePct,
    nodeBlockages: {},
    pumpBoostActive: pumpCapacity > 0,
    pumpCapacityM3s: pumpCapacity
  };

  const hydraulic = calculateHydraulicNetworkState(nodes, edges, simState);

  // Run DEM Surface Water Routing
  const { points } = generateUrbanDEM(centerLat, centerLng);
  const demCells = calculateSurfaceWaterAccumulation(points, rainMm, timeOffsetMin);
  const sinkCell = demCells.find(c => c.type === 'sink') || demCells[0];

  // Street-level depth calculations
  // Coupling effect: rainfall runoff depth + surcharge backflow accumulation
  const backflowAdditiveCm = Math.round(hydraulic.totalBackflowM3s * 4.5);
  const sinkDepthCm = Math.min(125, sinkCell.surfaceDepthCm + backflowAdditiveCm);

  // Time-to-flood calculation: minutes until water exceeds pedestrian hazard (20 cm)
  let timeToFlood = 0;
  if (sinkDepthCm >= 20) {
    timeToFlood = Math.max(0, Math.round(180 - timeOffsetMin * 0.9 - (rainMm / 2)));
  } else {
    timeToFlood = Math.max(15, Math.round(180 - timeOffsetMin));
  }

  // Calculate detailed street-level predictions
  const baseRoads: { id: string; name: string; drainNodeId: string; elevationM: number; sensitivity: number }[] = [
    { id: 'R-MGROAD', name: 'MG Road (Arterial Center)', drainNodeId: 'MH-24', elevationM: 515.2, sensitivity: 1.35 },
    { id: 'R-UNDERPASS', name: 'Metro Underpass Trough', drainNodeId: 'J-01', elevationM: 512.6, sensitivity: 1.65 },
    { id: 'R-CENTRAL', name: 'Central Boulevard', drainNodeId: 'J-02', elevationM: 524.1, sensitivity: 0.85 },
    { id: 'R-MARKET', name: 'Market Crossroad Lane', drainNodeId: 'IN-01', elevationM: 531.0, sensitivity: 0.65 },
    { id: 'R-HOSPITAL', name: 'Hospital Access Boulevard', drainNodeId: 'IN-02', elevationM: 528.3, sensitivity: 0.55 },
    { id: 'R-RIDGE', name: 'Highland Ridge Expressway', drainNodeId: 'MH-31', elevationM: 546.0, sensitivity: 0.15 }
  ];

  const roads: RoadRisk[] = baseRoads.map(r => {
    const drainNode = hydraulic.nodes.find(n => n.id === r.drainNodeId);
    const nodeUtil = drainNode ? drainNode.utilizationPct : hydraulic.systemLoadPct;
    const nodeBackflow = drainNode?.backflowRateM3s || 0;

    // Road depth in cm
    const depth = Math.max(
      0,
      Math.round((sinkDepthCm * r.sensitivity) + (nodeBackflow * 3.8))
    );

    // Probability & Risk
    const probability = Math.min(98, Math.max(10, Math.round((depth / 60) * 85 + (nodeUtil > 100 ? 15 : 0))));
    const confidence = Math.min(96, Math.max(82, 92 - (timeOffsetMin / 30) * 2));

    let risk: RoadRisk['risk'] = 'safe';
    if (depth >= 45 || probability >= 85) risk = 'critical';
    else if (depth >= 30 || probability >= 70) risk = 'severe';
    else if (depth >= 18 || probability >= 50) risk = 'high';
    else if (depth >= 8) risk = 'moderate';

    // Time to flood for this road
    const roadTimeToFlood = depth >= 15 ? Math.max(0, Math.round(90 - (timeOffsetMin * 0.5) - (depth * 0.8))) : null;

    // Causes
    const causes: string[] = [];
    if (rainMm > 40) causes.push(`High intensity precipitation (${rainMm} mm/hr)`);
    if (r.elevationM < 520) causes.push(`Low-lying depression topography (${r.elevationM}m DEM)`);
    if (nodeUtil > 100) causes.push(`Stormwater drain overload (${nodeUtil}% at ${r.drainNodeId})`);
    if (nodeBackflow > 0) causes.push(`Manhole surcharge backflow active (+${nodeBackflow} m³/s)`);
    if (blockagePct > 0) causes.push(`Physical debris blockage (${blockagePct}%)`);
    if (causes.length === 0) causes.push('Normal gravity surface runoff');

    return {
      id: r.id,
      name: r.name,
      risk,
      depthCm: depth,
      timeToFloodMin: roadTimeToFlood,
      probability,
      confidence,
      drainUtilizationPct: nodeUtil,
      rainfallIntensityMm: rainMm,
      cause: causes,
      drainNodeId: r.drainNodeId,
      elevationM: r.elevationM
    };
  });

  // Calculate overall flooded area
  const floodedAreaKm2 = Number((0.2 + (sinkDepthCm / 65) * 4.8).toFixed(2));
  const overallProb = Math.round(roads.reduce((acc, r) => acc + r.probability, 0) / roads.length);
  const overallConf = Math.round(roads.reduce((acc, r) => acc + r.confidence, 0) / roads.length);

  // Sensor + Model Fusion Explanations
  const fusedExplanations = [
    `Doppler Radar / Rain Intensity: ${rainMm} mm/hr precipitation load detected across catchment`,
    `DEM Terrain: Low-elevation underpass basin (512.6m) collecting gravity runoff from Eastern hillsides`,
    `Drainage Hydraulic Model: Trunk drain system at ${hydraulic.systemLoadPct}% capacity (${hydraulic.surchargingCount} surcharging nodes)`,
    `IoT Telemetry Fusion: Ultrasonic water level sensors confirming steady stage rise (+3.4 cm/10m)`
  ];

  if (hydraulic.totalBackflowM3s > 0) {
    fusedExplanations.push(`Hydraulic Backflow: Inundating surface streets with ${hydraulic.totalBackflowM3s} m³/s stormwater surcharge`);
  }

  return {
    timeOffsetMin,
    rainfallIntensityMm: rainMm,
    maxDepthCm: sinkDepthCm,
    floodedAreaKm2,
    timeToFloodMin: timeToFlood,
    overallFloodProbability: overallProb,
    confidenceScore: overallConf,
    drainUtilizationPct: hydraulic.systemLoadPct,
    surchargingNodesCount: hydraulic.surchargingCount,
    backflowRateM3s: hydraulic.totalBackflowM3s,
    causalChain: hydraulic.causalSummary,
    roads,
    fusedExplanations
  };
}

/**
 * Returns structured JSON for the SIH26085 API specification
 */
export function getNowcastAPIResults(centerLat: number, centerLng: number, timeOffsetMin = 30): NowcastSummaryItem[] {
  const state = computeCoupledNowcast(centerLat, centerLng, timeOffsetMin);
  return state.roads.map(r => ({
    location: r.name,
    forecast_minutes: timeOffsetMin,
    flood_probability: Number((r.probability / 100).toFixed(2)),
    water_depth_cm: r.depthCm,
    drain_utilization: Number((r.drainUtilizationPct / 100).toFixed(2)),
    confidence: Number((r.confidence / 100).toFixed(2)),
    time_to_flood_min: r.timeToFloodMin ?? 0,
    rainfall_intensity: r.rainfallIntensityMm,
    status: r.risk === 'critical' || r.risk === 'severe' ? 'CRITICAL' : r.risk === 'high' ? 'WARNING' : r.risk === 'moderate' ? 'ADVISORY' : 'SAFE'
  }));
}
