import React, { useEffect, useState, useMemo, useRef } from 'react';
import Map, { Source, Layer, NavigationControl, Marker, MapRef } from '@vis.gl/react-maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Location, PredictionData, SafetyRoute } from '../types';
import { DEMO_SENSORS } from '../data';
import { 
  Activity, 
  Droplets, 
  CloudRain, 
  Layers, 
  Map as MapIcon, 
  Maximize2, 
  Minimize2,
  BellRing,
  ShieldCheck,
  Home,
  Radio,
  Eye,
  EyeOff,
  Compass,
  Gauge,
  Navigation,
  Cloud,
  Sun,
  Building,
  Flame,
  Zap,
  Box,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useRealMapData } from '../hooks/useRealMapData';
import { useRealSafetyRoutes } from '../hooks/useRealSafetyRoutes';
import { getRealisticNeighborhoodRoads } from '../utils/neighborhoodRoads';
import { calculateFloodPropagation } from '../utils/floodSpreading';
import { RainCanvasOverlay, RainIntensity } from './RainCanvasOverlay';
import { getRainfallRisk } from '../utils/rainfallRisk';
import { CRITICAL_FACILITIES, evaluateInfrastructureThreats } from '../utils/criticalInfrastructure';
import { DEFAULT_DRAINAGE_GRAPH } from '../utils/drainageGraph';
import { CriticalFacility, DrainageGraph } from '../types';

/**
 * Generates a GeoJSON Polygon representing a circle given center and radius in meters.
 */
function createGeoJsonCircle(centerLng: number, centerLat: number, radiusMeters: number, points = 72) {
  const coords: [number, number][] = [];
  const km = Math.max(10, radiusMeters) / 1000;
  const latDelta = km / 111.32;
  const lngDelta = km / (111.32 * Math.cos((centerLat * Math.PI) / 180));

  for (let i = 0; i <= points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const lng = centerLng + lngDelta * Math.cos(theta);
    const lat = centerLat + latDelta * Math.sin(theta);
    coords.push([lng, lat]);
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [coords]
        },
        properties: {
          radiusMeters,
          radiusKm: (radiusMeters / 1000).toFixed(2)
        }
      }
    ]
  };
}

interface MapComponentProps {
  location: Location;
  timeOffsetMin: number;
  onLocationClick?: (lat: number, lng: number) => void;
  activeTab?: string;
  theme?: 'light' | 'dark';
  isRaining?: boolean;
  liveRainfallMm?: number;
  currentPrediction?: PredictionData;
  selectedRouteId?: string;
  isAlarmActive?: boolean;
  onSelectRoute?: (routeId: string) => void;
  drainageGraph?: DrainageGraph;
  criticalFacilities?: CriticalFacility[];
  viewMode?: 'surface' | 'underground' | 'both';
  onChangeViewMode?: (mode: 'surface' | 'underground' | 'both') => void;
}

export default function MapComponent({ 
  location, 
  timeOffsetMin, 
  onLocationClick, 
  activeTab = 'overview', 
  theme = 'light', 
  isRaining = false, 
  liveRainfallMm = 0,
  currentPrediction,
  selectedRouteId = 'route-ridge',
  isAlarmActive = false,
  onSelectRoute,
  drainageGraph = DEFAULT_DRAINAGE_GRAPH,
  criticalFacilities = CRITICAL_FACILITIES,
  viewMode = 'both',
  onChangeViewMode
}: MapComponentProps) {
  // Default pitch 0 (orthogonal top-down) matching hydrodynamic flood simulation aerial view
  const [viewState, setViewState] = useState({
    longitude: location.lng,
    latitude: location.lat,
    zoom: 15.2,
    pitch: 0,
    bearing: 0,
  });

  const [mapMode, setMapMode] = useState<'normal' | 'satellite'>('satellite');
  const [is3DMode, setIs3DMode] = useState(activeTab === '3d-map');
  const [digitalTwinPerspective, setDigitalTwinPerspective] = useState<'ground' | 'underground' | 'combined'>('combined');
  const [showFloodLayer, setShowFloodLayer] = useState(true);
  const [showSensors, setShowSensors] = useState(true);
  const [showFacilities, setShowFacilities] = useState(true);
  const [rainMode, setRainMode] = useState<'auto' | 'off' | 'light' | 'heavy'>('auto');
  const [routesDisplayMode, setRoutesDisplayMode] = useState<'when_flooded' | 'always' | 'hidden'>('when_flooded');
  const [isLegendMinimized, setIsLegendMinimized] = useState(false);
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);

  // Sync 3D tab or camera state
  useEffect(() => {
    if (activeTab === '3d-map' || is3DMode) {
      if (digitalTwinPerspective === 'underground') {
        setViewState(prev => ({ ...prev, pitch: 62, bearing: 35, zoom: 15 }));
      } else if (digitalTwinPerspective === 'ground') {
        setViewState(prev => ({ ...prev, pitch: 42, bearing: 15, zoom: 14.8 }));
      } else {
        setViewState(prev => ({ ...prev, pitch: 52, bearing: 22, zoom: 14.5 }));
      }
    } else {
      setViewState(prev => ({
        ...prev,
        pitch: 0,
        bearing: 0,
        zoom: 14
      }));
    }
  }, [activeTab, is3DMode, digitalTwinPerspective]);

  // Evaluate infrastructure threats based on current flood depth
  const infrastructureThreats = useMemo(() => {
    return evaluateInfrastructureThreats(currentPrediction?.maxDepthCm ?? 15);
  }, [currentPrediction?.maxDepthCm]);

  // Convert hydraulic drainage graph edges to GeoJSON LineStrings with hydraulic status
  const hydraulicEdgesGeoJson = useMemo(() => {
    const nodeMap: Record<string, (typeof drainageGraph.nodes)[0]> = {};
    drainageGraph.nodes.forEach(n => {
      nodeMap[n.id] = n;
    });

    const features = drainageGraph.edges.map(e => {
      const fromNode = nodeMap[e.fromNodeId];
      const toNode = nodeMap[e.toNodeId];
      if (!fromNode || !toNode) return null;

      return {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [fromNode.lng, fromNode.lat],
            [toNode.lng, toNode.lat]
          ]
        },
        properties: {
          id: e.id,
          diameterMm: e.diameterMm,
          status: e.status,
          utilizationPct: e.utilizationPct,
          currentFlowM3s: e.currentFlowM3s,
          capacityM3s: e.capacityM3s
        }
      };
    }).filter(Boolean);

    return {
      type: 'FeatureCollection' as const,
      features
    };
  }, [drainageGraph]);

  // Center when location prop changes
  useEffect(() => {
    setViewState(prev => ({
      ...prev,
      longitude: location.lng,
      latitude: location.lat,
    }));
  }, [location.lat, location.lng]);

  const { roadsGeojson, drainageNodesGeojson } = useRealMapData(location);

  // Real OSRM road-following geometries for all 5 safety corridors
  const safetyRoutes = useRealSafetyRoutes(
    location,
    currentPrediction || { maxDepthCm: 20, timeOffsetMin, floodedAreaKm2: 1.5, rainfallIntensityMm: 25 }
  );

  const mapRef = useRef<MapRef>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const predictionRef = useRef(currentPrediction);
  
  useEffect(() => {
    predictionRef.current = currentPrediction;
  }, [currentPrediction]);

  // Animation pulse for water flow and route direction
  useEffect(() => {
    let animationFrame: number;
    const animate = () => {
      const time = Date.now();
      const pulseVal = 0.7 + Math.sin(time / 450) * 0.3;
      
      const depth = predictionRef.current?.maxDepthCm ?? 5;
      const floodRatio = Math.min(1, Math.max(0, (depth - 5) / 60)); // 0.0 at 0% (5cm), 1.0 at high (65cm)
      
      // Dynamic water current speed scaling from 0% onwards to high:
      // At 0% (baseline runoff): 135ms per frame (gentle, steady natural street flow)
      // At 100% (high): 42ms per frame (rapid surging torrential flood current)
      const flowSpeedMs = Math.round(135 - floodRatio * 93);
      
      const map = mapRef.current?.getMap();
      if (map && map.getStyle()) {
        if (map.getLayer('route-layer-safe-outline')) {
          map.setPaintProperty('route-layer-safe-outline', 'line-opacity', pulseVal);
        }
        if (map.getLayer('route-layer-safe')) {
          map.setPaintProperty('route-layer-safe', 'line-opacity', 0.85 + Math.sin(time / 300) * 0.15);
        }

        // Clean pulse for flood water circle radius boundary and glow
        if (map.getLayer('flood-circle-perimeter')) {
          map.setPaintProperty('flood-circle-perimeter', 'line-opacity', 0.65 + Math.sin(time / 450) * 0.35);
        }
        if (map.getLayer('flood-circle-glow')) {
          map.setPaintProperty('flood-circle-glow', 'fill-opacity', 0.12 + Math.sin(time / 600) * 0.08);
        }
      }

      if (markerRef.current) {
        markerRef.current.style.opacity = pulseVal.toString();
      }

      animationFrame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  // Multi-Safety Routes GeoJSON features (now using real street-snapped coordinates)
  const routesFeaturesCollection = useMemo(() => {
    const features = safetyRoutes.map(route => {
      const isSelected = route.id === selectedRouteId;
      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: route.waypoints
        },
        properties: {
          id: route.id,
          name: route.name,
          tag: route.tag,
          isSelected,
          isBlocked: route.tag === 'standard_blocked',
          color: route.tag === 'standard_blocked' 
            ? '#ef4444' 
            : route.tag === 'primary' 
              ? '#10b981' 
              : route.tag === 'bypass'
                ? '#06b6d4'
                : route.tag === 'shelter'
                  ? '#f59e0b'
                  : '#8b5cf6'
        }
      };
    });
    return { type: 'FeatureCollection', features };
  }, [safetyRoutes, selectedRouteId]);

  // Realistic neighborhood roads & cul-de-sac turnaround ponds (matching 2D hydrodynamic simulation in reference image)
  const neighborhoodData = useMemo(() => {
    return getRealisticNeighborhoodRoads(location.lat, location.lng);
  }, [location.lat, location.lng]);

  // Hydrodynamic propagation engine: as flood increases, the reach distance radius physically increases
  const floodPropagation = useMemo(() => {
    const depth = currentPrediction?.maxDepthCm ?? 5;
    const sourceRoads = (roadsGeojson && roadsGeojson.features && roadsGeojson.features.length > 0)
      ? roadsGeojson
      : neighborhoodData.roads;
    return calculateFloodPropagation(
      sourceRoads,
      neighborhoodData.ponds,
      location.lat,
      location.lng,
      depth
    );
  }, [roadsGeojson, neighborhoodData, location.lat, location.lng, currentPrediction?.maxDepthCm]);

  // Primary circular flood water inundation zone in radius
  const floodCircleGeojson = useMemo(() => {
    return createGeoJsonCircle(location.lng, location.lat, floodPropagation.reachDistanceMeters, 72);
  }, [location.lng, location.lat, floodPropagation.reachDistanceMeters]);

  // Inner core deep water accumulation zone in radius
  const floodCoreCircleGeojson = useMemo(() => {
    const coreRadius = Math.round(floodPropagation.reachDistanceMeters * 0.45);
    return createGeoJsonCircle(location.lng, location.lat, coreRadius, 72);
  }, [location.lng, location.lat, floodPropagation.reachDistanceMeters]);

  // Longitude on the perimeter to display radius badge
  const perimeterMarkerLng = useMemo(() => {
    const km = floodPropagation.reachDistanceMeters / 1000;
    const lngDelta = km / (111.32 * Math.cos((location.lat * Math.PI) / 180));
    return location.lng + lngDelta;
  }, [location.lng, location.lat, floodPropagation.reachDistanceMeters]);

  // Real drainage pipelines
  const drainageGeojson = useMemo(() => {
    const source = roadsGeojson && roadsGeojson.features.length > 0 ? roadsGeojson : neighborhoodData.roads;
    const drains = source.features.filter((f: any) => f.properties?.isDrainage);
    return { type: 'FeatureCollection', features: drains };
  }, [roadsGeojson, neighborhoodData]);

  // Dynamic sensors centered around the active location
  const dynamicSensors = useMemo(() => {
    return DEMO_SENSORS.map((s, idx) => {
      const dLat = (idx === 0 ? 0.005 : idx === 1 ? 0.002 : idx === 2 ? 0.009 : idx === 3 ? -0.008 : -0.004);
      const dLng = (idx === 0 ? 0.003 : idx === 1 ? -0.004 : idx === 2 ? 0.006 : idx === 3 ? -0.007 : -0.011);
      const depth = currentPrediction?.maxDepthCm ?? 5;
      
      let val = s.value;
      if (s.type === 'water_level') {
        val = Math.max(2, Math.round(depth * (idx === 0 ? 1.08 : 0.42)));
      } else if (s.type === 'rain_gauge') {
        val = currentPrediction?.rainfallIntensityMm ?? s.value;
      }

      return {
        ...s,
        lat: location.lat + dLat,
        lng: location.lng + dLng,
        value: val
      };
    });
  }, [location.lat, location.lng, currentPrediction?.maxDepthCm, currentPrediction?.rainfallIntensityMm]);

  const activeSafetyRoute = safetyRoutes.find(r => r.id === selectedRouteId) || safetyRoutes[0];
  const ridgeRoute = safetyRoutes.find(r => r.tag === 'primary');
  const flyoverRoute = safetyRoutes.find(r => r.tag === 'bypass');
  const shelterRoute = safetyRoutes.find(r => r.tag === 'shelter');

  const esriSatelliteStyle = {
    version: 8,
    sources: {
      'esri-satellite': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256,
        attribution: 'Esri, Maxar, Earthstar Geographics'
      }
    },
    layers: [
      {
        id: 'satellite-layer',
        type: 'raster',
        source: 'esri-satellite',
        minzoom: 0,
        maxzoom: 22
      }
    ]
  };

  const currentMapStyle = mapMode === 'satellite' 
    ? (esriSatelliteStyle as any) 
    : theme === 'light' 
      ? "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json" 
      : "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

  const currentDepth = currentPrediction?.maxDepthCm ?? 5;
  const floodPercentage = Math.min(100, Math.max(0, Math.round(((currentDepth - 5) / 60) * 100)));

  const getDepthSeverity = (depth: number, percent: number) => {
    if (depth < 12) return { label: `Calm Surface Flow (${percent}%)`, color: 'emerald', bg: 'bg-emerald-500', text: 'text-emerald-400' };
    if (depth < 25) return { label: `Moderate Road Runoff (${percent}%)`, color: 'amber', bg: 'bg-amber-500', text: 'text-amber-400' };
    if (depth < 45) return { label: `Heavy Waterlogging (${percent}%)`, color: 'orange', bg: 'bg-orange-500', text: 'text-orange-400' };
    return { label: `Critical Flood Surge (${percent}%)`, color: 'red', bg: 'bg-red-500', text: 'text-red-400' };
  };

  const severity = getDepthSeverity(currentDepth, floodPercentage);
  const currentRainfallMm = currentPrediction?.rainfallIntensityMm ?? 0;
  const rainRisk = getRainfallRisk(currentRainfallMm);

  // Computed rain state (strictly according to live weather forecast in auto mode)
  const effectiveRainIntensity: RainIntensity = useMemo(() => {
    if (rainMode !== 'auto') return rainMode;
    
    // In AUTO mode: strictly obey live weather forecast!
    // ONLY show rain drops if it is ACTUALLY raining at this location in real time:
    if (isRaining || liveRainfallMm > 0) {
      const mm = liveRainfallMm > 0 ? liveRainfallMm : 5;
      if (mm > 35) return 'storm';
      if (mm > 5) return 'heavy';
      return 'light';
    }
    
    // If not raining at this location according to live weather forecast: rain is OFF!
    return 'off';
  }, [rainMode, isRaining, liveRainfallMm]);

  // Determine if flood has started (timeOffset > 0 or water depth > 10cm)
  const isFloodActive = (timeOffsetMin > 0) || (currentDepth > 10) || ((currentPrediction?.maxDepthCm ?? 0) > 10);
  
  // Route visibility: either user chose always, or when flood starts (auto)
  const shouldShowRoutes = 
    activeTab === 'routing' ||
    routesDisplayMode === 'always' ||
    (routesDisplayMode === 'when_flooded' && isFloodActive && activeTab !== 'drainage' && activeTab !== 'analytics');

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden shadow-2xl border border-slate-700/50 bg-slate-900 select-none">
      
      {/* Top Map Controls Header */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 flex items-center gap-2 max-w-[95vw] overflow-x-auto">
        {/* Base Map Mode */}
        <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-2 shrink-0">
          <button 
            onClick={() => setMapMode('normal')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors",
              mapMode === 'normal' 
                ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white" 
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50"
            )}
            title="Standard street cartography"
          >
            <MapIcon className="w-3.5 h-3.5" />
            Street
          </button>
          <button 
            onClick={() => setMapMode('satellite')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors",
              mapMode === 'satellite' 
                ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white" 
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50"
            )}
            title="Satellite photogrammetry"
          >
            <Layers className="w-3.5 h-3.5" />
            Satellite
          </button>
        </div>

        {/* 2D Flat vs 3D Tilt View Toggle */}
        <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-2 shrink-0">
          <button 
            onClick={() => setIs3DMode(false)}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors",
              !is3DMode 
                ? "bg-blue-600 text-white shadow-sm" 
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50"
            )}
            title="Flat top-down view (routes hug ground streets)"
          >
            <Compass className="w-3.5 h-3.5" />
            2D Ground
          </button>
          <button 
            onClick={() => setIs3DMode(true)}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors",
              is3DMode 
                ? "bg-blue-600 text-white shadow-sm" 
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50"
            )}
            title="3D perspective tilt view"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            3D Tilt
          </button>
        </div>

        {/* Flood Layer Visibility Toggle */}
        <button 
          onClick={() => setShowFloodLayer(!showFloodLayer)}
          className={cn(
            "px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0",
            showFloodLayer 
              ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30" 
              : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
          title="Toggle water flood inundation display"
        >
          <Droplets className="w-3.5 h-3.5" />
          Flood Water
        </button>

        {/* Rain Option Toggle */}
        <button 
          onClick={() => {
            setRainMode(prev => {
              if (prev === 'auto') return 'heavy';
              if (prev === 'heavy') return 'light';
              if (prev === 'light') return 'off';
              return 'auto';
            });
          }}
          className={cn(
            "px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0",
            effectiveRainIntensity !== 'off'
              ? "bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/40" 
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent"
          )}
          title={`Rain mode: ${rainMode === 'auto' ? 'Live Weather Forecast' : 'Manual Override'} (${effectiveRainIntensity === 'off' ? 'No rain at place' : effectiveRainIntensity})`}
        >
          {effectiveRainIntensity !== 'off' ? (
            <CloudRain className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
          ) : (
            <Cloud className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span>
            {rainMode === 'auto' 
              ? (effectiveRainIntensity !== 'off' ? `Rain: Live (${effectiveRainIntensity})` : 'Rain: Live (Dry)') 
              : `Rain: Forced (${rainMode})`
            }
          </span>
        </button>

        {/* Route Visibility Mode Toggle (Option to show when flood starts vs always) */}
        <button 
          onClick={() => {
            setRoutesDisplayMode(prev => {
              if (prev === 'when_flooded') return 'always';
              if (prev === 'always') return 'hidden';
              return 'when_flooded';
            });
          }}
          className={cn(
            "px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0",
            shouldShowRoutes
              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30" 
              : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
          title="Routes option: 'when_flooded' activates routes once flood starts; 'always' keeps them on; 'hidden' turns them off"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>
            Routes: {routesDisplayMode === 'when_flooded' 
              ? (isFloodActive ? 'Active (Flood)' : 'On Flood Start') 
              : routesDisplayMode === 'always' 
                ? 'Always Visible' 
                : 'Hidden'}
          </span>
          {routesDisplayMode === 'when_flooded' && !isFloodActive && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 font-mono">
              standby
            </span>
          )}
        </button>

        {/* Sensors Visibility Toggle */}
        <button 
          onClick={() => setShowSensors(!showSensors)}
          className={cn(
            "px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0",
            showSensors 
              ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30" 
              : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
          title="Toggle telemetry sensors and road depth markers"
        >
          <Radio className="w-3.5 h-3.5" />
          Sensors ({dynamicSensors.length})
        </button>
      </div>

      {/* Rain canvas overlay layer */}
      <RainCanvasOverlay intensity={effectiveRainIntensity} theme={theme} />

      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onClick={(evt) => {
          if (onLocationClick) {
            onLocationClick(evt.lngLat.lat, evt.lngLat.lng);
          }
        }}
        mapStyle={currentMapStyle}
        cursor="crosshair"
      >
        <NavigationControl position="top-right" />

        {/* ================================================================= */}
        {/* 1. FLOOD WATER INUNDATION RADIUS CIRCLE                           */}
        {/* ================================================================= */}
        {showFloodLayer && (
          <>
            {/* Primary Flood Water Radius Inundation Circle */}
            <Source id="flood-circle-source" type="geojson" data={floodCircleGeojson as any}>
              {/* Outer water ambient spread glow */}
              <Layer
                id="flood-circle-glow"
                type="fill"
                paint={{
                  'fill-color': currentDepth >= 45 ? '#0284c7' : '#38bdf8',
                  'fill-opacity': 0.16
                }}
              />
              {/* Flood water body fill within radius */}
              <Layer
                id="flood-circle-fill"
                type="fill"
                paint={{
                  'fill-color': currentDepth >= 45 ? '#0369a1' : '#0ea5e9',
                  'fill-opacity': Math.min(0.65, Math.max(0.25, 0.22 + (currentDepth / 70) * 0.38)),
                  'fill-outline-color': '#7dd3fc'
                }}
              />
              {/* Radius circle perimeter boundary line */}
              <Layer
                id="flood-circle-perimeter"
                type="line"
                paint={{
                  'line-color': currentDepth >= 45 ? '#0284c7' : '#38bdf8',
                  'line-width': 2.5,
                  'line-opacity': 0.85,
                  'line-dasharray': [4, 2]
                }}
              />
            </Source>

            {/* Inner Core Deeper Submergence Zone */}
            <Source id="flood-core-circle-source" type="geojson" data={floodCoreCircleGeojson as any}>
              <Layer
                id="flood-core-circle-fill"
                type="fill"
                paint={{
                  'fill-color': currentDepth >= 45 ? '#0c4a6e' : '#0284c7',
                  'fill-opacity': 0.30
                }}
              />
              <Layer
                id="flood-core-circle-border"
                type="line"
                paint={{
                  'line-color': '#93c5fd',
                  'line-width': 1.5,
                  'line-opacity': 0.65,
                  'line-dasharray': [2, 2]
                }}
              />
            </Source>

            {/* Center Flood Origin / Epicenter Marker */}
            <Marker longitude={location.lng} latitude={location.lat} anchor="center">
              <div className="relative flex items-center justify-center pointer-events-none">
                <div className="absolute w-8 h-8 rounded-full bg-cyan-400/30 animate-ping" />
                <div className="w-3.5 h-3.5 rounded-full bg-cyan-500 border-2 border-white shadow-md shadow-cyan-900/40" />
              </div>
            </Marker>

            {/* Radius Perimeter Badge on Circle Edge */}
            <Marker longitude={perimeterMarkerLng} latitude={location.lat} anchor="left">
              <div className="ml-2 px-2 py-0.5 rounded-md bg-slate-900/90 text-cyan-300 border border-cyan-500/50 text-[10px] font-mono font-bold shadow-xl flex items-center gap-1.5 backdrop-blur-md">
                <Compass className="w-3 h-3 text-cyan-400 animate-pulse" />
                <span>Radius: {floodPropagation.reachDistanceKm}</span>
              </div>
            </Marker>
          </>
        )}

        {/* ================================================================= */}
        {/* 2. MULTI-SAFETY EVACUATION CORRIDORS (Snapped to Street Asphalt)  */}
        {/* ================================================================= */}
        {shouldShowRoutes && (
          <>
            <Source id="multi-safety-routes-data" type="geojson" data={routesFeaturesCollection as any}>
              {/* Inactive safety corridors */}
              <Layer
                id="route-layer-inactive"
                type="line"
                filter={['all', ['!=', ['get', 'isSelected'], true], ['!=', ['get', 'isBlocked'], true]]}
                layout={{
                  'line-join': 'round',
                  'line-cap': 'round'
                }}
                paint={{
                  'line-color': ['get', 'color'],
                  'line-width': 4,
                  'line-opacity': 0.55
                }}
              />
              {/* Blocked direct route with red warning dashes */}
              <Layer
                id="route-layer-blocked"
                type="line"
                filter={['==', ['get', 'isBlocked'], true]}
                layout={{
                  'line-join': 'round',
                  'line-cap': 'round'
                }}
                paint={{
                  'line-color': '#ef4444',
                  'line-width': 4.5,
                  'line-dasharray': [2, 2],
                  'line-opacity': 0.9
                }}
              />
              {/* Selected safe route high-contrast ground casing */}
              <Layer
                id="route-layer-safe-outline"
                type="line"
                filter={['==', ['get', 'isSelected'], true]}
                layout={{
                  'line-join': 'round',
                  'line-cap': 'round'
                }}
                paint={{
                  'line-color': theme === 'light' ? '#ffffff' : '#0f172a',
                  'line-width': 9,
                  'line-opacity': 1
                }}
              />
              {/* Selected safe route core colored road line */}
              <Layer
                id="route-layer-safe"
                type="line"
                filter={['==', ['get', 'isSelected'], true]}
                layout={{
                  'line-join': 'round',
                  'line-cap': 'round'
                }}
                paint={{
                  'line-color': ['get', 'color'],
                  'line-width': 5.5,
                  'line-opacity': 1
                }}
              />
            </Source>

            {/* Destination Markers for Safety Routes */}
            {ridgeRoute && (
              <Marker longitude={ridgeRoute.destCoords[0]} latitude={ridgeRoute.destCoords[1]} anchor="bottom">
                <div 
                  onClick={() => onSelectRoute && onSelectRoute(ridgeRoute.id)}
                  className={cn(
                    "cursor-pointer px-2.5 py-1 rounded-full shadow-xl border-2 flex items-center gap-1.5 whitespace-nowrap transition-transform hover:scale-105",
                    selectedRouteId === ridgeRoute.id 
                      ? "bg-emerald-600 text-white border-white ring-2 ring-emerald-400 font-black scale-105" 
                      : "bg-emerald-950/90 text-emerald-300 border-emerald-500 font-bold"
                  )}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="text-[10px] tracking-wide">RIDGE INTERCHANGE (+24m Safe)</span>
                </div>
              </Marker>
            )}

            {shelterRoute && (
              <Marker longitude={shelterRoute.destCoords[0]} latitude={shelterRoute.destCoords[1]} anchor="bottom">
                <div 
                  onClick={() => onSelectRoute && onSelectRoute(shelterRoute.id)}
                  className={cn(
                    "cursor-pointer px-2.5 py-1 rounded-full shadow-xl border-2 flex items-center gap-1.5 whitespace-nowrap transition-transform hover:scale-105",
                    selectedRouteId === shelterRoute.id 
                      ? "bg-amber-600 text-white border-white ring-2 ring-amber-400 font-black scale-105" 
                      : "bg-amber-950/90 text-amber-300 border-amber-500 font-bold"
                  )}
                >
                  <Home className="w-3.5 h-3.5 text-amber-300" />
                  <span className="text-[10px] tracking-wide">CIVIC RELIEF SHELTER (Cap: 2,400)</span>
                </div>
              </Marker>
            )}

            {flyoverRoute && (
              <Marker longitude={flyoverRoute.destCoords[0]} latitude={flyoverRoute.destCoords[1]} anchor="bottom">
                <div 
                  onClick={() => onSelectRoute && onSelectRoute(flyoverRoute.id)}
                  className={cn(
                    "cursor-pointer px-2.5 py-1 rounded-full shadow-xl border-2 flex items-center gap-1.5 whitespace-nowrap transition-transform hover:scale-105",
                    selectedRouteId === flyoverRoute.id 
                      ? "bg-cyan-600 text-white border-white ring-2 ring-cyan-400 font-black scale-105" 
                      : "bg-cyan-950/90 text-cyan-300 border-cyan-500 font-bold"
                  )}
                >
                  <span className="text-[10px] tracking-wide">NORTHERN FLYOVER (+16m)</span>
                </div>
              </Marker>
            )}
          </>
        )}

        {/* ================================================================= */}
        {/* 3. LIVE SENSOR STATIONS AND FLOODED ROAD DEPTH MARKERS            */}
        {/* ================================================================= */}
        {showSensors && (
          <>
            {/* Water Level Sensors & Telemetry */}
            {dynamicSensors.map((sensor) => {
              const isSelected = selectedSensorId === sensor.id;
              const isWaterSensor = sensor.type === 'water_level';

              return (
                <Marker key={sensor.id} longitude={sensor.lng} latitude={sensor.lat} anchor="bottom">
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSensorId(isSelected ? null : sensor.id);
                    }}
                    className="flex flex-col items-center cursor-pointer group"
                  >
                    <div className={cn(
                      "px-2 py-1 rounded-lg shadow-lg border text-[9px] font-bold flex items-center gap-1 transition-transform group-hover:scale-110",
                      isWaterSensor 
                        ? "bg-blue-900/90 text-blue-200 border-blue-400" 
                        : "bg-slate-900/90 text-slate-200 border-slate-600"
                    )}>
                      {isWaterSensor ? (
                        <Droplets className="w-3 h-3 text-cyan-400" />
                      ) : sensor.type === 'rain_gauge' ? (
                        <CloudRain className="w-3 h-3 text-blue-400" />
                      ) : (
                        <Activity className="w-3 h-3 text-amber-400" />
                      )}
                      <span>{sensor.id}: {sensor.value} {sensor.unit}</span>
                    </div>

                    {isSelected && (
                      <div className="mt-1 p-2 bg-slate-900 text-white rounded-lg shadow-2xl border border-slate-700 text-[10px] flex flex-col gap-0.5 z-40 min-w-[140px]">
                        <span className="font-bold text-cyan-400 uppercase">{sensor.type.replace('_', ' ')}</span>
                        <span>Value: <strong>{sensor.value} {sensor.unit}</strong></span>
                        <span>Trend: <strong className="capitalize">{sensor.trend}</strong></span>
                        <span>Status: <strong className="capitalize text-emerald-400">{sensor.status}</strong></span>
                      </div>
                    )}
                  </div>
                </Marker>
              );
            })}
          </>
        )}

        {/* ================================================================= */}
        {/* 5. SOCIETY SIREN / COMMUNITY MONITORING HUB MARKER                */}
        {/* ================================================================= */}
        <Marker longitude={location.lng} latitude={location.lat} anchor="center">
          <div className="relative flex items-center justify-center">
            {isAlarmActive && (
              <>
                <span className="absolute w-14 h-14 rounded-full bg-red-500/40 animate-ping" />
                <span className="absolute w-24 h-24 rounded-full border-2 border-red-500/60 animate-pulse" />
              </>
            )}
            <div className={cn(
              "p-2 rounded-full shadow-2xl border-2 transition-transform z-20 cursor-pointer",
              isAlarmActive 
                ? "bg-red-600 text-white border-white animate-bounce scale-110" 
                : "bg-blue-600 text-white border-white/80 hover:scale-110"
            )}>
              {isAlarmActive ? <BellRing className="w-4 h-4" /> : <Radio className="w-4 h-4" />}
            </div>
          </div>
        </Marker>

        {/* ================================================================= */}
        {/* 6. CRITICAL INFRASTRUCTURE ALERT MARKERS (SIH26085 §16)           */}
        {/* ================================================================= */}
        {showFacilities && infrastructureThreats.map(threat => {
          const isThreatened = threat.status === 'inundated' || threat.status === 'threatened';
          const isHospital = threat.facility.type === 'hospital';
          const isFire = threat.facility.type === 'fire_station';
          const isPower = threat.facility.type === 'power_station';

          return (
            <Marker 
              key={threat.facility.id} 
              longitude={threat.facility.lng} 
              latitude={threat.facility.lat} 
              anchor="bottom"
            >
              <div className="relative flex flex-col items-center group cursor-pointer">
                {isThreatened && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping" />
                )}
                <div className={cn(
                  "p-1.5 rounded-lg shadow-lg border text-white transition-all transform hover:scale-125 flex items-center justify-center",
                  isThreatened 
                    ? "bg-rose-600 border-rose-400 ring-2 ring-rose-500/50 animate-bounce" 
                    : "bg-slate-800 border-slate-600 hover:border-white"
                )}>
                  {isHospital && <Building className="w-3.5 h-3.5 text-rose-300" />}
                  {isFire && <Flame className="w-3.5 h-3.5 text-amber-300" />}
                  {isPower && <Zap className="w-3.5 h-3.5 text-yellow-300" />}
                  {!isHospital && !isFire && !isPower && <Building className="w-3.5 h-3.5 text-cyan-300" />}
                </div>

                {/* Facility Name Tag */}
                <div className={cn(
                  "mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold border whitespace-nowrap shadow-md pointer-events-none transition-opacity",
                  isThreatened 
                    ? "bg-rose-950/90 text-rose-200 border-rose-700 opacity-100" 
                    : "bg-slate-900/80 text-slate-300 border-slate-700 opacity-80 group-hover:opacity-100"
                )}>
                  {threat.facility.name}
                  {isThreatened && (
                    <span className="ml-1 text-rose-400">({threat.status.toUpperCase()})</span>
                  )}
                </div>
              </div>
            </Marker>
          );
        })}

        {/* ================================================================= */}
        {/* 7. DRAINAGE DIRECTED GRAPH CONDUITS & MANHOLES (SIH26085 §6)      */}
        {/* ================================================================= */}
        {(activeTab === 'drainage' || viewMode === 'underground' || viewMode === 'both' || digitalTwinPerspective === 'underground') && (
          <>
            <Source id="hydraulic-edges-data" type="geojson" data={hydraulicEdgesGeoJson as any}>
              <Layer
                id="hydraulic-edges-layer"
                type="line"
                paint={{
                  'line-color': [
                    'match',
                    ['get', 'status'],
                    'overcapacity', '#ef4444',
                    'near_capacity', '#f97316',
                    'stressed', '#eab308',
                    '#10b981'
                  ],
                  'line-width': digitalTwinPerspective === 'underground' ? 6 : 4,
                  'line-opacity': 0.9
                }}
              />
            </Source>

            {/* Surcharging Manhole Pulsing Beacons */}
            {drainageGraph.nodes.filter(n => n.isSurcharging || n.utilizationPct > 100).map(n => (
              <Marker key={n.id} longitude={n.lng} latitude={n.lat} anchor="center">
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-8 h-8 rounded-full bg-rose-500/40 animate-ping" />
                  <div className="w-4 h-4 rounded-full bg-rose-600 border-2 border-white shadow-lg flex items-center justify-center text-[8px] font-black text-white">
                    !
                  </div>
                  <div className="absolute top-5 bg-rose-950/90 text-rose-200 text-[8px] font-mono px-1 rounded border border-rose-800 whitespace-nowrap">
                    Backflow +{n.backflowRateM3s}m³/s
                  </div>
                </div>
              </Marker>
            ))}
          </>
        )}

      </Map>

      {/* 3D Digital Twin Perspective Floating HUD (SIH26085 §9) */}
      {(activeTab === '3d-map' || is3DMode) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 backdrop-blur-md bg-slate-900/90 border border-slate-700 p-1 rounded-xl shadow-2xl flex items-center gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase px-2 flex items-center gap-1">
            <Box className="w-3.5 h-3.5 text-cyan-400" />
            3D Twin:
          </span>
          <button
            onClick={() => setDigitalTwinPerspective('ground')}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
              digitalTwinPerspective === 'ground' 
                ? "bg-cyan-500 text-slate-950 shadow-sm" 
                : "text-slate-400 hover:text-white"
            )}
          >
            Ground View
          </button>
          <button
            onClick={() => setDigitalTwinPerspective('underground')}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
              digitalTwinPerspective === 'underground' 
                ? "bg-purple-500 text-slate-950 shadow-sm" 
                : "text-slate-400 hover:text-white"
            )}
          >
            Underground Pipes
          </button>
          <button
            onClick={() => setDigitalTwinPerspective('combined')}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
              digitalTwinPerspective === 'combined' 
                ? "bg-emerald-500 text-slate-950 shadow-sm" 
                : "text-slate-400 hover:text-white"
            )}
          >
            Combined 1D/2D
          </button>
        </div>
      )}
      
      {/* ================================================================= */}
      {/* 6. DEDICATED LIVE WATER FLOOD DEPTH HUD & MAP LEGEND              */}
      {/* ================================================================= */}
      <div className={cn(
        "absolute bottom-6 right-12 backdrop-blur-md rounded-xl border shadow-2xl transition-colors z-20",
        theme === 'light' ? "bg-white/95 border-slate-200" : "bg-slate-900/95 border-slate-700"
      )}>
        {isLegendMinimized ? (
          <div 
            className="px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            onClick={() => setIsLegendMinimized(false)}
          >
            <Droplets className="w-4 h-4 text-cyan-500 animate-pulse" />
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              WATER RADIUS: {floodPropagation.reachDistanceKm} • DEPTH: {currentDepth} cm ({floodPercentage}%)
            </div>
            <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
          </div>
        ) : (
          <div className="p-3.5 flex flex-col gap-2.5 w-64">
            <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <div className="p-1 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <Compass className="w-3.5 h-3.5" />
                </div>
                <div className="text-[11px] font-extrabold tracking-wider uppercase text-slate-800 dark:text-slate-200">
                  FLOOD WATER RADIUS
                </div>
              </div>
              <button 
                onClick={() => setIsLegendMinimized(true)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                title="Minimize gauge HUD"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Depth Metric Banner */}
            <div className="flex items-baseline justify-between bg-slate-100 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
              <div className="flex flex-col">
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase">Flood Radius</span>
                <span className="text-2xl font-black text-cyan-600 dark:text-cyan-300">
                  {floodPropagation.reachDistanceKm}
                </span>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase">Water Depth</span>
                <span className="text-xs font-black font-mono text-slate-800 dark:text-slate-200">
                  {currentDepth} cm
                </span>
                <span className="text-[10px] font-medium text-slate-400">
                  {floodPercentage}% scale
                </span>
              </div>
            </div>

            {/* Dynamic Distance Progress Bar */}
            <div className="flex flex-col gap-1 bg-cyan-500/5 dark:bg-cyan-950/30 p-2 rounded-lg border border-cyan-500/20">
              <div className="flex items-center justify-between text-[9px] font-bold text-cyan-700 dark:text-cyan-300">
                <span className="flex items-center gap-1">
                  <Compass className="w-3 h-3 text-cyan-500" />
                  CIRCLE RADIUS EXTENT
                </span>
                <span className="font-mono">{floodPropagation.reachDistanceKm}</span>
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                <div 
                  className="h-full bg-cyan-500 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(4, floodPercentage))}%` }}
                />
              </div>
              <div className="flex justify-between text-[8px] text-slate-400">
                <span>Origin (250m)</span>
                <span>Max Reach (2.8km)</span>
              </div>
            </div>

            {/* Depth Color Scale Bar */}
            <div className="flex flex-col gap-1">
              <div className="h-2 w-full rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-800">
                <div className="h-full bg-emerald-500 w-[20%]" title="0-15cm: Passable" />
                <div className="h-full bg-amber-400 w-[25%]" title="15-30cm: Ankle-High" />
                <div className="h-full bg-orange-500 w-[25%]" title="30-50cm: Stall Risk" />
                <div className="h-full bg-red-600 w-[30%]" title="50cm+: Submergence" />
              </div>
              <div className="flex justify-between text-[8px] font-bold text-slate-400">
                <span>0 cm</span>
                <span>15 cm</span>
                <span>30 cm</span>
                <span>50 cm+</span>
              </div>
            </div>

            {/* Severity Status Tag & 1-Hour Rainfall Risk */}
            <div className="flex flex-col gap-1.5 pt-0.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold">
                <span className={cn("w-2 h-2 rounded-full", severity.bg)} />
                <span className={severity.text}>{severity.label}</span>
              </div>
              
              <div className="flex items-center justify-between text-[10px] font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                <span className="text-slate-500 dark:text-slate-400 text-[9px] uppercase tracking-wider">
                  Rain 1h Risk
                </span>
                <span className="flex items-center gap-1">
                  <span>{rainRisk.emoji}</span>
                  <span className={cn("font-black", rainRisk.badgeText)}>{rainRisk.level}</span>
                  <span className="text-[9px] text-slate-400 font-mono">({rainRisk.rangeText})</span>
                </span>
              </div>
            </div>

            {/* Inundation Metrics */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800 text-[10px]">
              <div>
                <span className="text-slate-400 block text-[9px]">Flood Radius</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {Math.round(floodPropagation.reachDistanceMeters).toLocaleString()} m
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Rainfall (1 hr)</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <span>{rainRisk.rainfallCm.toFixed(1)} cm</span>
                  <span className="text-[9px] font-normal text-slate-400">({currentRainfallMm} mm/h)</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
