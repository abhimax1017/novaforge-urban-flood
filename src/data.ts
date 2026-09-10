import { Location, PredictionData, SensorData, RoadRisk } from './types';

export const LOCATIONS: Location[] = [
  { id: 'hyd', name: 'Hyderabad', lat: 17.4399, lng: 78.4983 },
  { id: 'mum', name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { id: 'blr', name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { id: 'del', name: 'Delhi', lat: 28.7041, lng: 77.1025 },
  { id: 'che', name: 'Chennai', lat: 13.0827, lng: 80.2707 },
];

export const DEMO_PREDICTIONS: PredictionData[] = [
  { timeOffsetMin: 0, floodedAreaKm2: 0.2, maxDepthCm: 5, rainfallIntensityMm: 12 },
  { timeOffsetMin: 30, floodedAreaKm2: 0.8, maxDepthCm: 15, rainfallIntensityMm: 24 },
  { timeOffsetMin: 60, floodedAreaKm2: 1.5, maxDepthCm: 28, rainfallIntensityMm: 42 },
  { timeOffsetMin: 90, floodedAreaKm2: 2.8, maxDepthCm: 42, rainfallIntensityMm: 72 },
  { timeOffsetMin: 120, floodedAreaKm2: 4.1, maxDepthCm: 55, rainfallIntensityMm: 108 },
  { timeOffsetMin: 180, floodedAreaKm2: 5.3, maxDepthCm: 65, rainfallIntensityMm: 58 },
];

export const DEMO_SENSORS: SensorData[] = [
  { id: 'WL-042', type: 'water_level', lat: 17.445, lng: 78.500, value: 31, unit: 'cm', status: 'warning', trend: 'rising', lastUpdated: new Date().toISOString() },
  { id: 'DF-104', type: 'drain_flow', lat: 17.442, lng: 78.495, value: 132, unit: '%', status: 'online', trend: 'rising', lastUpdated: new Date().toISOString() },
  { id: 'RG-001', type: 'rain_gauge', lat: 17.450, lng: 78.505, value: 28, unit: 'mm/hr', status: 'online', trend: 'stable', lastUpdated: new Date().toISOString() },
  { id: 'WL-019', type: 'water_level', lat: 17.430, lng: 78.490, value: 5, unit: 'cm', status: 'online', trend: 'stable', lastUpdated: new Date().toISOString() },
  { id: 'DF-088', type: 'drain_flow', lat: 17.435, lng: 78.485, value: 0, unit: '%', status: 'offline', trend: 'stable', lastUpdated: new Date().toISOString() },
];

export const DEMO_ROADS: RoadRisk[] = [
  {
    id: 'R-101',
    name: 'Madhapur Main Road',
    risk: 'high',
    depthCm: 38,
    timeToFloodMin: 31,
    probability: 87,
    confidence: 91,
    cause: ['Heavy rainfall', 'Low elevation', 'Drainage overload (D-104)']
  },
  {
    id: 'R-102',
    name: 'Jubilee Hills Road No. 36',
    risk: 'moderate',
    depthCm: 15,
    timeToFloodMin: 55,
    probability: 65,
    confidence: 85,
    cause: ['Surface runoff concentration']
  },
  {
    id: 'R-103',
    name: 'KBR Park Junction',
    risk: 'critical',
    depthCm: 55,
    timeToFloodMin: 12,
    probability: 95,
    confidence: 88,
    cause: ['Downstream bottleneck detected', 'Backflow risk from M-143']
  }
];
