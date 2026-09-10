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

export interface SensorData {
  id: string;
  type: 'water_level' | 'drain_flow' | 'rain_gauge';
  lat: number;
  lng: number;
  value: number;
  unit: string;
  status: 'online' | 'warning' | 'offline';
  trend: 'rising' | 'falling' | 'stable';
  lastUpdated: string;
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
  cause: string[];
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

