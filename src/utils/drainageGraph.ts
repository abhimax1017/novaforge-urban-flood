import { DrainageNode, DrainageEdge } from '../types';

/**
 * Underground Stormwater Directed Graph Generator & Hydraulic Engine
 * Models coupled urban hydrology (rainfall runoff + 1D pipe network hydraulics)
 * Ready for EPA SWMM integration / NetworkX pipeline
 */

export interface SimulationState {
  rainfallMmHr: number;
  timeOffsetMin: number;
  globalBlockagePct: number;
  nodeBlockages: Record<string, number>;
  pumpBoostActive: boolean;
  pumpCapacityM3s: number;
}

export function generateDrainageNetwork(centerLat: number, centerLng: number): {
  nodes: DrainageNode[];
  edges: DrainageEdge[];
} {
  // Generate a realistic urban stormwater topology around the center
  const nodes: DrainageNode[] = [
    // Low-lying main outfalls
    {
      id: 'OF-01',
      name: 'South Canal Primary Outfall',
      type: 'outfall',
      lat: centerLat - 0.012,
      lng: centerLng + 0.008,
      elevationM: 508.2,
      depthM: 3.8,
      capacityM3s: 28.0,
      currentFlowM3s: 6.2,
      utilizationPct: 22,
      status: 'normal',
      isSurcharging: false,
      backflowRateM3s: 0,
      blockagePct: 0,
      connectedEdgeIds: ['P-10', 'P-14', 'C-01'],
      nearestRoadId: 'R-RIVER'
    },
    {
      id: 'PS-01',
      name: 'Sub-Basin Pumping Station 1',
      type: 'pumping_station',
      lat: centerLat - 0.008,
      lng: centerLng - 0.006,
      elevationM: 511.4,
      depthM: 5.2,
      capacityM3s: 22.0,
      currentFlowM3s: 7.1,
      utilizationPct: 32,
      status: 'normal',
      isSurcharging: false,
      backflowRateM3s: 0,
      blockagePct: 0,
      connectedEdgeIds: ['P-08', 'P-09'],
      nearestRoadId: 'R-PUMP'
    },
    // Critical junctions in depression zones
    {
      id: 'J-01',
      name: 'Junction J-01 (Underpass Confluence)',
      type: 'junction',
      lat: centerLat - 0.002,
      lng: centerLng - 0.001,
      elevationM: 512.6,
      depthM: 3.5,
      capacityM3s: 14.5,
      currentFlowM3s: 15.8,
      utilizationPct: 109,
      status: 'overcapacity',
      isSurcharging: true,
      backflowRateM3s: 1.3,
      blockagePct: 0,
      connectedEdgeIds: ['P-04', 'P-05', 'P-08'],
      nearestRoadId: 'R-UNDERPASS'
    },
    {
      id: 'J-02',
      name: 'Junction J-02 (Central Boulevard)',
      type: 'junction',
      lat: centerLat + 0.003,
      lng: centerLng + 0.002,
      elevationM: 524.1,
      depthM: 2.8,
      capacityM3s: 12.0,
      currentFlowM3s: 9.4,
      utilizationPct: 78,
      status: 'stressed',
      isSurcharging: false,
      backflowRateM3s: 0,
      blockagePct: 0,
      connectedEdgeIds: ['P-02', 'P-03', 'P-05'],
      nearestRoadId: 'R-CENTRAL'
    },
    {
      id: 'J-03',
      name: 'Junction J-03 (East Arterial Culvert)',
      type: 'junction',
      lat: centerLat + 0.001,
      lng: centerLng + 0.009,
      elevationM: 519.5,
      depthM: 3.0,
      capacityM3s: 16.0,
      currentFlowM3s: 14.8,
      utilizationPct: 92,
      status: 'near_capacity',
      isSurcharging: false,
      backflowRateM3s: 0,
      blockagePct: 0,
      connectedEdgeIds: ['P-06', 'P-07', 'P-10'],
      nearestRoadId: 'R-EAST'
    },
    // Stormwater Inlets & Manholes
    {
      id: 'IN-01',
      name: 'Inlet IN-01 (Market Crossroad Catchbasin)',
      type: 'stormwater_inlet',
      lat: centerLat + 0.006,
      lng: centerLng - 0.003,
      elevationM: 531.0,
      depthM: 2.0,
      capacityM3s: 6.5,
      currentFlowM3s: 4.8,
      utilizationPct: 74,
      status: 'stressed',
      isSurcharging: false,
      backflowRateM3s: 0,
      blockagePct: 0,
      connectedEdgeIds: ['P-01', 'P-02'],
      nearestRoadId: 'R-MARKET'
    },
    {
      id: 'IN-02',
      name: 'Inlet IN-02 (Hospital Road Grate)',
      type: 'stormwater_inlet',
      lat: centerLat + 0.005,
      lng: centerLng + 0.006,
      elevationM: 528.3,
      depthM: 2.2,
      capacityM3s: 7.2,
      currentFlowM3s: 4.9,
      utilizationPct: 68,
      status: 'normal',
      isSurcharging: false,
      backflowRateM3s: 0,
      blockagePct: 0,
      connectedEdgeIds: ['P-03', 'P-06'],
      nearestRoadId: 'R-HOSPITAL'
    },
    {
      id: 'MH-12',
      name: 'Manhole MH-12 (Civic Center Trunk)',
      type: 'manhole',
      lat: centerLat + 0.001,
      lng: centerLng - 0.005,
      elevationM: 521.8,
      depthM: 3.2,
      capacityM3s: 9.8,
      currentFlowM3s: 7.6,
      utilizationPct: 78,
      status: 'stressed',
      isSurcharging: false,
      backflowRateM3s: 0,
      blockagePct: 0,
      connectedEdgeIds: ['P-01', 'P-04'],
      nearestRoadId: 'R-CIVIC'
    },
    {
      id: 'MH-24',
      name: 'Manhole MH-24 (MG Road Bottleneck)',
      type: 'manhole',
      lat: centerLat - 0.004,
      lng: centerLng + 0.004,
      elevationM: 515.2,
      depthM: 3.4,
      capacityM3s: 10.0,
      currentFlowM3s: 14.3,
      utilizationPct: 143,
      status: 'overcapacity',
      isSurcharging: true,
      backflowRateM3s: 4.3,
      blockagePct: 0,
      connectedEdgeIds: ['P-05', 'P-07', 'P-11'],
      nearestRoadId: 'R-MGROAD'
    },
    {
      id: 'MH-31',
      name: 'Manhole MH-31 (Ridge Crest Inspection)',
      type: 'manhole',
      lat: centerLat + 0.008,
      lng: centerLng + 0.002,
      elevationM: 546.0,
      depthM: 2.1,
      capacityM3s: 8.0,
      currentFlowM3s: 2.4,
      utilizationPct: 30,
      status: 'normal',
      isSurcharging: false,
      backflowRateM3s: 0,
      blockagePct: 0,
      connectedEdgeIds: ['P-01'],
      nearestRoadId: 'R-RIDGE'
    }
  ];

  // Underground Pipes & Channels Connecting Nodes
  const edges: DrainageEdge[] = [
    {
      id: 'P-01',
      name: 'Trunk Pipe P-01 (Ridge to Market)',
      fromNodeId: 'MH-31',
      toNodeId: 'IN-01',
      lengthM: 420,
      diameterMm: 1200,
      slopePct: 2.8,
      capacityM3s: 8.5,
      currentFlowM3s: 3.2,
      utilizationPct: 38,
      blockagePct: 0,
      status: 'normal',
      coordinates: [
        [centerLng + 0.002, centerLat + 0.008],
        [centerLng - 0.003, centerLat + 0.006]
      ]
    },
    {
      id: 'P-02',
      name: 'Trunk Pipe P-02 (Market to Central)',
      fromNodeId: 'IN-01',
      toNodeId: 'J-02',
      lengthM: 510,
      diameterMm: 1400,
      slopePct: 1.4,
      capacityM3s: 11.2,
      currentFlowM3s: 8.4,
      utilizationPct: 75,
      blockagePct: 0,
      status: 'stressed',
      coordinates: [
        [centerLng - 0.003, centerLat + 0.006],
        [centerLng + 0.002, centerLat + 0.003]
      ]
    },
    {
      id: 'P-03',
      name: 'Trunk Pipe P-03 (Hospital to Central)',
      fromNodeId: 'IN-02',
      toNodeId: 'J-02',
      lengthM: 380,
      diameterMm: 1200,
      slopePct: 1.8,
      capacityM3s: 9.6,
      currentFlowM3s: 6.2,
      utilizationPct: 65,
      blockagePct: 0,
      status: 'normal',
      coordinates: [
        [centerLng + 0.006, centerLat + 0.005],
        [centerLng + 0.002, centerLat + 0.003]
      ]
    },
    {
      id: 'P-04',
      name: 'Trunk Pipe P-04 (Civic to Underpass)',
      fromNodeId: 'MH-12',
      toNodeId: 'J-01',
      lengthM: 460,
      diameterMm: 1500,
      slopePct: 1.9,
      capacityM3s: 13.0,
      currentFlowM3s: 11.5,
      utilizationPct: 88,
      blockagePct: 0,
      status: 'near_capacity',
      coordinates: [
        [centerLng - 0.005, centerLat + 0.001],
        [centerLng - 0.001, centerLat - 0.002]
      ]
    },
    {
      id: 'P-05',
      name: 'Main Collector P-05 (Central to MG Road MH-24)',
      fromNodeId: 'J-02',
      toNodeId: 'MH-24',
      lengthM: 620,
      diameterMm: 1800,
      slopePct: 1.2,
      capacityM3s: 16.5,
      currentFlowM3s: 17.2,
      utilizationPct: 104,
      blockagePct: 0,
      status: 'overcapacity',
      coordinates: [
        [centerLng + 0.002, centerLat + 0.003],
        [centerLng + 0.004, centerLat - 0.004]
      ]
    },
    {
      id: 'P-06',
      name: 'Culvert P-06 (Hospital to East Arterial)',
      fromNodeId: 'IN-02',
      toNodeId: 'J-03',
      lengthM: 490,
      diameterMm: 1200,
      slopePct: 1.6,
      capacityM3s: 9.8,
      currentFlowM3s: 7.8,
      utilizationPct: 80,
      blockagePct: 0,
      status: 'stressed',
      coordinates: [
        [centerLng + 0.006, centerLat + 0.005],
        [centerLng + 0.009, centerLat + 0.001]
      ]
    },
    {
      id: 'P-07',
      name: 'Collector P-07 (East Arterial to MH-24)',
      fromNodeId: 'J-03',
      toNodeId: 'MH-24',
      lengthM: 580,
      diameterMm: 1600,
      slopePct: 1.1,
      capacityM3s: 14.0,
      currentFlowM3s: 13.2,
      utilizationPct: 94,
      blockagePct: 0,
      status: 'near_capacity',
      coordinates: [
        [centerLng + 0.009, centerLat + 0.001],
        [centerLng + 0.004, centerLat - 0.004]
      ]
    },
    {
      id: 'P-08',
      name: 'Discharge Conduit P-08 (Underpass to Pump Station)',
      fromNodeId: 'J-01',
      toNodeId: 'PS-01',
      lengthM: 530,
      diameterMm: 2000,
      slopePct: 0.8,
      capacityM3s: 18.0,
      currentFlowM3s: 16.2,
      utilizationPct: 90,
      blockagePct: 0,
      status: 'near_capacity',
      coordinates: [
        [centerLng - 0.001, centerLat - 0.002],
        [centerLng - 0.006, centerLat - 0.008]
      ]
    },
    {
      id: 'P-10',
      name: 'Canal Outflow Channel C-01 (MH-24 to Outfall)',
      fromNodeId: 'MH-24',
      toNodeId: 'OF-01',
      lengthM: 710,
      diameterMm: 2400,
      slopePct: 1.0,
      capacityM3s: 25.0,
      currentFlowM3s: 23.8,
      utilizationPct: 95,
      blockagePct: 0,
      status: 'near_capacity',
      coordinates: [
        [centerLng + 0.004, centerLat - 0.004],
        [centerLng + 0.008, centerLat - 0.012]
      ]
    }
  ];

  return { nodes, edges };
}

/**
 * Recalculates hydraulic state of the drainage network
 * Accounts for rainfall intensity, user blockage overrides, pump assist, and backflow
 */
export function calculateHydraulicNetworkState(
  baseNodes: DrainageNode[],
  baseEdges: DrainageEdge[],
  sim: SimulationState
): {
  nodes: DrainageNode[];
  edges: DrainageEdge[];
  systemLoadPct: number;
  totalBackflowM3s: number;
  overcapacityCount: number;
  surchargingCount: number;
  causalSummary: string;
} {
  const rainFactor = Math.max(0.1, sim.rainfallMmHr / 35);
  const timeFactor = 1 + (sim.timeOffsetMin / 180) * 0.8;
  const pumpAssistM3s = sim.pumpBoostActive ? sim.pumpCapacityM3s : 0;

  let totalFlow = 0;
  let totalCap = 0;
  let totalBackflow = 0;
  let overcapacityCount = 0;
  let surchargingCount = 0;

  // Process nodes
  const updatedNodes = baseNodes.map(node => {
    const nodeBlockage = sim.nodeBlockages[node.id] ?? sim.globalBlockagePct ?? 0;
    const effectiveBlockage = Math.min(100, Math.max(0, nodeBlockage));
    const effectiveCapacity = node.capacityM3s * (1 - effectiveBlockage / 100);

    // Dynamic runoff flow entering node
    let inflow = (node.capacityM3s * 0.45) * rainFactor * timeFactor;
    
    // Low elevations receive gravity drainage from upstream
    if (node.elevationM < 515) {
      inflow += 3.5 * rainFactor;
    }

    // Pump station suction relief
    if (node.type === 'pumping_station' || node.id === 'J-01') {
      inflow = Math.max(0.5, inflow - pumpAssistM3s * 0.4);
    }

    const utilization = effectiveCapacity > 0 ? (inflow / effectiveCapacity) * 100 : 999;
    const isOvercapacity = utilization > 100;
    const isSurcharging = utilization > 105;
    const backflow = isSurcharging ? Math.max(0, Number((inflow - effectiveCapacity).toFixed(1))) : 0;

    let status: DrainageNode['status'] = 'normal';
    if (utilization > 100) status = 'overcapacity';
    else if (utilization > 85) status = 'near_capacity';
    else if (utilization > 65) status = 'stressed';

    if (isOvercapacity) overcapacityCount++;
    if (isSurcharging) surchargingCount++;
    totalBackflow += backflow;
    totalFlow += inflow;
    totalCap += effectiveCapacity;

    return {
      ...node,
      capacityM3s: Number(effectiveCapacity.toFixed(1)),
      currentFlowM3s: Number(inflow.toFixed(1)),
      utilizationPct: Math.round(utilization),
      status,
      isSurcharging,
      backflowRateM3s: backflow,
      blockagePct: effectiveBlockage
    };
  });

  // Process edges (pipes)
  const updatedEdges = baseEdges.map(edge => {
    const edgeBlockage = sim.nodeBlockages[edge.id] ?? sim.globalBlockagePct ?? 0;
    const effectiveCap = edge.capacityM3s * (1 - edgeBlockage / 100);
    const flow = (edge.capacityM3s * 0.5) * rainFactor * timeFactor;
    const util = effectiveCap > 0 ? (flow / effectiveCap) * 100 : 999;

    let status: DrainageEdge['status'] = 'normal';
    if (util > 100) status = 'overcapacity';
    else if (util > 85) status = 'near_capacity';
    else if (util > 65) status = 'stressed';

    return {
      ...edge,
      capacityM3s: Number(effectiveCap.toFixed(1)),
      currentFlowM3s: Number(flow.toFixed(1)),
      utilizationPct: Math.round(util),
      blockagePct: edgeBlockage,
      status
    };
  });

  const systemLoad = totalCap > 0 ? Math.round((totalFlow / totalCap) * 100) : 100;

  // Formulate SIH26085 causal explanation
  let causal = 'System operating under nominal hydraulic capacity with gravity outflow.';
  if (totalBackflow > 0 || overcapacityCount > 0) {
    causal = `BLOCKAGE (${sim.globalBlockagePct}%) → REDUCED DRAIN CAPACITY → DRAIN OVERLOAD (${systemLoad}% load) → SURCHARGE (${surchargingCount} nodes) → BACKFLOW (${totalBackflow.toFixed(1)} m³/s) → STREET FLOODING`;
  }

  return {
    nodes: updatedNodes,
    edges: updatedEdges,
    systemLoadPct: systemLoad,
    totalBackflowM3s: Number(totalBackflow.toFixed(1)),
    overcapacityCount,
    surchargingCount,
    causalSummary: causal
  };
}

const defaultNet = generateDrainageNetwork(12.9716, 77.5946);
const defaultSim: SimulationState = {
  rainfallMmHr: 35,
  timeOffsetMin: 0,
  globalBlockagePct: 20,
  nodeBlockages: {},
  pumpBoostActive: true,
  pumpCapacityM3s: 22
};
const defaultCalculated = calculateHydraulicNetworkState(defaultNet.nodes, defaultNet.edges, defaultSim);

export const DEFAULT_DRAINAGE_GRAPH: {
  nodes: DrainageNode[];
  edges: DrainageEdge[];
  systemLoadPct: number;
  totalBackflowM3s: number;
  surchargingNodesCount: number;
} = {
  nodes: defaultCalculated.nodes,
  edges: defaultCalculated.edges,
  systemLoadPct: defaultCalculated.systemLoadPct,
  totalBackflowM3s: defaultCalculated.totalBackflowM3s,
  surchargingNodesCount: defaultCalculated.surchargingCount
};
