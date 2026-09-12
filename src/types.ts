export interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  rainfall: number;
  rainfallIntensity: number;
  description: string;
}

export type SensorType = 
  | 'water_level' 
  | 'drain_flow' 
  | 'rain_gauge' 
  | 'soil_moisture' 
  | 'weather_station' 
  | 'cctv_camera' 
  | 'pump_telemetry';

export interface SensorData {
  id: string;
  name?: string;
  type: SensorType;
  lat: number;
  lng: number;
  value: number;
  unit: string;
  status: 'online' | 'warning' | 'offline';
  trend: 'rising' | 'falling' | 'stable';
  lastUpdated: string;
  batteryPct?: number;
  signalDbm?: number;
}

export interface PredictionData {
  timeOffsetMin: number;
  floodedAreaKm2: number;
  maxDepthCm: number;
  rainfallIntensityMm: number;
}

export interface RoadRisk {
  id: string;
  name: string;
  risk: 'safe' | 'moderate' | 'high' | 'severe' | 'critical';
  depthCm: number;
  timeToFloodMin: number | null;
  probability: number;
  confidence: number;
  drainUtilizationPct?: number;
  rainfallIntensityMm?: number;
  cause: string[];
  drainNodeId?: string;
  elevationM?: number;
  coords?: [number, number][];
}

export type DrainageNodeType = 'manhole' | 'stormwater_inlet' | 'junction' | 'outfall' | 'pumping_station';

export interface DrainageNode {
  id: string;
  name: string;
  type: DrainageNodeType;
  lat: number;
  lng: number;
  elevationM: number;
  depthM: number;
  capacityM3s: number;
  currentFlowM3s: number;
  utilizationPct: number;
  status: 'normal' | 'stressed' | 'near_capacity' | 'overcapacity';
  isSurcharging: boolean;
  backflowRateM3s: number;
  blockagePct: number;
  connectedEdgeIds: string[];
  nearestRoadId?: string;
}

export interface DrainageEdge {
  id: string;
  name: string;
  fromNodeId: string;
  toNodeId: string;
  lengthM: number;
  diameterMm: number;
  slopePct: number;
  capacityM3s: number;
  currentFlowM3s: number;
  utilizationPct: number;
  blockagePct: number;
  status: 'normal' | 'stressed' | 'near_capacity' | 'overcapacity';
  coordinates: [number, number][];
}

export interface DrainageGraph {
  nodes: DrainageNode[];
  edges: DrainageEdge[];
  systemLoadPct: number;
  totalBackflowM3s: number;
  surchargingNodesCount: number;
}

export interface DEMPoint {
  id: string;
  lat: number;
  lng: number;
  elevationM: number;
  type: 'sink' | 'ridge' | 'valley' | 'plain';
  slopePct: number;
  runoffCoefficient: number;
  flowDirectionDeg: number;
  catchmentId: string;
}

export interface CriticalFacility {
  id: string;
  name: string;
  type: 'hospital' | 'fire_station' | 'police' | 'school' | 'shelter' | 'power_station' | 'transit_hub';
  lat: number;
  lng: number;
  elevationM: number;
  thresholdDepthCm: number;
  currentDepthCm: number;
  isThreatened: boolean;
  accessRoad: string;
}

export interface WhatIfConfig {
  rainfallMmHr: number;
  drainBlockagePct: number;
  drainCapacityMultiplier?: number;
  pumpCapacityM3s: number;
  forecastDurationMin?: number;
  tideLevelM?: number;
  soilSaturationPct?: number;
  greenInfraEfficiencyPct?: number;
}

export interface SafetyRoute {
  id: string;
  name: string;
  tag: 'primary' | 'bypass' | 'shelter' | 'perimeter' | 'standard_blocked';
  safetyRating: string;
  safetyScore: number; // 0 to 100
  isRecommended: boolean;
  distanceKm: number;
  etaMin: number;
  elevationGainM: number;
  clearanceHeightM: number;
  destinationName: string;
  destCoords: [number, number]; // [lng, lat]
  waypoints: [number, number][]; // [[lng, lat]]
  description: string;
  avoidedHazards: string[];
  shelterCapacity?: number;
  turnSteps: string[];
  vehicleSuitability?: {
    ambulance: boolean;
    fireTruck: boolean;
    police: boolean;
    transit: boolean;
    general: boolean;
  };
}

export interface SocietyAlert {
  societyName: string;
  colonySector: string;
  alertLevel: 'NORMAL' | 'ADVISORY' | 'WARNING' | 'CRITICAL_ALARM';
  riskScore: number; // 0 to 100
  estimatedInundationTimeMin: number;
  projectedDepthCm: number;
  sirenSounding: boolean;
  evacuationRecommended: boolean;
  householdsCovered: number;
  safeShelterName: string;
  shelterDistance: string;
  urgentInstructions: string[];
  emergencyContacts: { role: string; phone: string }[];
}

export interface NowcastSummaryItem {
  location: string;
  forecast_minutes: number;
  flood_probability: number;
  water_depth_cm: number;
  drain_utilization: number;
  confidence: number;
  time_to_flood_min: number;
  rainfall_intensity: number;
  status: 'SAFE' | 'ADVISORY' | 'WARNING' | 'CRITICAL';
}

