import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Sliders, ShieldCheck } from 'lucide-react';
import { cn } from './lib/utils';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import MapComponent from './components/MapComponent';
import RightPanel from './components/RightPanel';
import TimelineSlider from './components/TimelineSlider';
import WeatherPanel from './components/WeatherPanel';
import AIAssistant from './components/AIAssistant';
import { RoutingPanel } from './components/RoutingPanel';
import { DrainagePanel } from './components/DrainagePanel';
import RadarRainfallPanel from './components/RadarRainfallPanel';
import DEMTerrainPanel from './components/DEMTerrainPanel';
import PipelineFlowBar from './components/PipelineFlowBar';
import WhatIfSimulatorModal from './components/WhatIfSimulatorModal';
import SystemValidationModal from './components/SystemValidationModal';
import { SensorFusionPanel } from './components/SensorFusionPanel';
import { SocietyAlertSystem } from './components/SocietyAlertSystem';
import { SocietyAlarmBanner } from './components/SocietyAlarmBanner';
import { LOCATIONS, DEMO_PREDICTIONS } from './data';
import { Location, PredictionData, RoadRisk, WhatIfConfig } from './types';
import { useWeatherNotifications } from './hooks/useWeatherNotifications';
import { useLiveWeather } from './hooks/useLiveWeather';
import { computeCoupledNowcast } from './utils/nowcastEngine';
import { generateDrainageNetwork, calculateHydraulicNetworkState, SimulationState } from './utils/drainageGraph';
import { generateUrbanDEM, calculateSurfaceWaterAccumulation } from './utils/terrainDEM';
import { CRITICAL_FACILITIES } from './utils/criticalInfrastructure';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedLocation, setSelectedLocation] = useState<Location>(LOCATIONS[0]);
  const [timeOffsetMin, setTimeOffsetMin] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedRoad, setSelectedRoad] = useState<RoadRisk | null>(null);
  const [isAIOpen, setIsAIOpen] = useState<boolean>(false);
  const [mapTheme, setMapTheme] = useState<'light'|'dark'>('dark');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('route-ridge');
  const [isSocietyAlertOpen, setIsSocietyAlertOpen] = useState<boolean>(false);
  const [isWhatIfOpen, setIsWhatIfOpen] = useState<boolean>(false);
  const [isValidationOpen, setIsValidationOpen] = useState<boolean>(false);
  const [drainageViewMode, setDrainageViewMode] = useState<'surface' | 'underground' | 'both'>('both');
  const [pumpsActive, setPumpsActive] = useState<boolean>(true);

  // What-If Simulation State
  const [whatIfConfig, setWhatIfConfig] = useState<WhatIfConfig>({
    rainfallMmHr: 35,
    drainBlockagePct: 35,
    tideLevelM: 0.8,
    pumpCapacityM3s: 22,
    soilSaturationPct: 82,
    greenInfraEfficiencyPct: 30
  });

  // Background weather polling
  const { notificationsEnabled, requestPermission } = useWeatherNotifications(selectedLocation);
  const { weather, loading: weatherLoading, isLive: weatherIsLive } = useLiveWeather(selectedLocation);
  
  // Real condition check
  const isRaining = Number(weather?.current?.rainfall ?? 0) > 0 || 
                    weather?.current?.description === 'Rain' || 
                    weather?.current?.description === 'Heavy Rain';

  // Compute Coupled Urban Hydrodynamic State using rainfall, DEM, and drainage graph
  const coupledState = useMemo(() => {
    return computeCoupledNowcast(
      selectedLocation.lat,
      selectedLocation.lng,
      timeOffsetMin,
      whatIfConfig
    );
  }, [selectedLocation.lat, selectedLocation.lng, timeOffsetMin, whatIfConfig]);

  // Current Prediction object synchronized with coupled model
  const currentPrediction: PredictionData = useMemo(() => {
    return {
      timeOffsetMin,
      floodedAreaKm2: coupledState.floodedAreaKm2,
      maxDepthCm: coupledState.maxDepthCm,
      rainfallIntensityMm: coupledState.rainfallIntensityMm
    };
  }, [timeOffsetMin, coupledState]);

  // Dynamic Drainage Graph computation
  const drainageNetwork = useMemo(() => {
    const { nodes, edges } = generateDrainageNetwork(selectedLocation.lat, selectedLocation.lng);
    const simState: SimulationState = {
      rainfallMmHr: whatIfConfig.rainfallMmHr,
      timeOffsetMin,
      globalBlockagePct: whatIfConfig.drainBlockagePct,
      nodeBlockages: {},
      pumpBoostActive: pumpsActive,
      pumpCapacityM3s: pumpsActive ? whatIfConfig.pumpCapacityM3s : 0
    };
    return calculateHydraulicNetworkState(nodes, edges, simState);
  }, [selectedLocation.lat, selectedLocation.lng, whatIfConfig, timeOffsetMin, pumpsActive]);

  // DEM Terrain Model Data
  const demModel = useMemo(() => {
    return generateUrbanDEM(selectedLocation.lat, selectedLocation.lng);
  }, [selectedLocation.lat, selectedLocation.lng]);

  // Handle Playback timeline
  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setTimeOffsetMin(prev => {
          if (prev >= 180) {
            setIsPlaying(false);
            return 180;
          }
          return prev + 15;
        });
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Select road when coupled state updates or user changes time/location
  useEffect(() => {
    if (coupledState.roads.length > 0) {
      setSelectedRoad(coupledState.roads[0]);
    }
  }, [coupledState]);

  const criticalZones = useMemo(() => {
    if (coupledState.maxDepthCm < 15) return [];
    return [
      { name: 'Metro Underpass Surcharge', time: coupledState.timeToFloodMin, depth: coupledState.maxDepthCm },
      { name: 'MG Road Basin Junction', time: Math.max(0, coupledState.timeToFloodMin - 10), depth: Math.round(coupledState.maxDepthCm * 0.9) },
      { name: 'South Canal Overcapacity Outfall', time: Math.max(0, coupledState.timeToFloodMin + 15), depth: Math.round(coupledState.maxDepthCm * 1.2) },
    ];
  }, [coupledState]);

  const handleMapClick = async (lat: number, lng: number) => {
    setSelectedLocation({
      id: `${lat},${lng}`,
      name: "Locating...",
      lat,
      lng
    });

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await response.json();
      if (data && data.display_name) {
        setSelectedLocation({
          id: data.place_id ? data.place_id.toString() : `${lat},${lng}`,
          name: data.display_name.split(',')[0],
          lat,
          lng
        });
      } else {
        setSelectedLocation(prev => ({ ...prev, name: "Selected Urban Basin" }));
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      setSelectedLocation(prev => ({ ...prev, name: "Selected Urban Basin" }));
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-screen w-screen overflow-hidden font-sans transition-colors duration-300",
      mapTheme === 'light' ? "bg-slate-50 text-slate-800" : "bg-slate-950 text-slate-200"
    )}>
      {/* Top Bar with location, live weather and settings */}
      <TopBar 
        locations={LOCATIONS} 
        selectedLocation={selectedLocation} 
        setSelectedLocation={setSelectedLocation} 
        isLive={true}
        mapTheme={mapTheme}
        setMapTheme={setMapTheme}
        notificationsEnabled={notificationsEnabled}
        requestPermission={requestPermission}
        weather={weather}
      />

      {/* SIH26085 Coupled Pipeline Visual Bar */}
      <PipelineFlowBar
        activeTab={activeTab}
        onSelectStep={(step) => setActiveTab(step)}
        onOpenValidation={() => setIsValidationOpen(true)}
      />

      {/* Society Warning Banner */}
      <SocietyAlarmBanner
        location={selectedLocation}
        prediction={currentPrediction}
        theme={mapTheme}
        onOpenAlertModal={() => setIsSocietyAlertOpen(true)}
        onOpenRoutingTab={() => setActiveTab('routing')}
        coupledState={coupledState}
        facilities={CRITICAL_FACILITIES}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar with all problem statement views */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          theme={mapTheme} 
          onTriggerAlarm={() => setIsSocietyAlertOpen(true)}
          onOpenWhatIf={() => setIsWhatIfOpen(true)}
          onOpenValidation={() => setIsValidationOpen(true)}
        />
        
        <div className="flex-1 relative flex flex-col p-3 sm:p-4 z-10">
          <div className="flex-1 relative">
            <MapComponent 
              location={selectedLocation} 
              timeOffsetMin={timeOffsetMin} 
              onLocationClick={handleMapClick}
              activeTab={activeTab}
              theme={mapTheme}
              isRaining={isRaining}
              liveRainfallMm={coupledState.rainfallIntensityMm}
              currentPrediction={currentPrediction}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
              isAlarmActive={isSocietyAlertOpen}
              drainageGraph={{
                nodes: drainageNetwork.nodes,
                edges: drainageNetwork.edges,
                systemLoadPct: drainageNetwork.systemLoadPct,
                totalBackflowM3s: drainageNetwork.totalBackflowM3s,
                surchargingNodesCount: drainageNetwork.surchargingCount
              }}
              criticalFacilities={CRITICAL_FACILITIES}
              viewMode={drainageViewMode}
              onChangeViewMode={setDrainageViewMode}
            />

            {/* Radar Panel */}
            {activeTab === 'radar' && (
              <RadarRainfallPanel
                theme={mapTheme}
                currentRainfallMmHr={coupledState.rainfallIntensityMm}
                timeOffsetMin={timeOffsetMin}
                onClose={() => setActiveTab('overview')}
              />
            )}

            {/* DEM Terrain Panel */}
            {activeTab === 'dem' && (
              <DEMTerrainPanel
                theme={mapTheme}
                points={demModel.points}
                catchments={demModel.catchments}
                lowPoint={demModel.lowPoint}
                highPoint={demModel.highPoint}
                rainfallMmHr={coupledState.rainfallIntensityMm}
              />
            )}

            {/* Enhanced Drainage Graph Panel */}
            {activeTab === 'drainage' && (
              <DrainagePanel 
                theme={mapTheme}
                nodes={drainageNetwork.nodes}
                edges={drainageNetwork.edges}
                systemLoadPct={drainageNetwork.systemLoadPct}
                totalBackflowM3s={drainageNetwork.totalBackflowM3s}
                surchargingCount={drainageNetwork.surchargingCount}
                causalChain={coupledState.causalChain}
                globalBlockagePct={whatIfConfig.drainBlockagePct}
                onUpdateBlockage={(pct) => {
                  setWhatIfConfig(prev => ({ ...prev, drainBlockagePct: pct }));
                }}
                viewMode={drainageViewMode}
                onChangeViewMode={setDrainageViewMode}
                onTogglePumps={() => setPumpsActive(prev => !prev)}
                pumpsActive={pumpsActive}
              />
            )}

            {/* Safe Evacuation Routing Hub */}
            {activeTab === 'routing' && (
               <RoutingPanel 
                 theme={mapTheme} 
                 location={selectedLocation}
                 prediction={currentPrediction}
                 selectedRouteId={selectedRouteId}
                 onSelectRoute={setSelectedRouteId}
                 onTriggerAlarm={() => setIsSocietyAlertOpen(true)}
               />
            )}

            {/* Live Weather Meteorological Forecast */}
            {activeTab === 'weather' && (
              <div className="absolute top-4 left-4 z-30 w-96 max-w-[92vw] shadow-2xl rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900">
                <div className="flex justify-between items-center px-4 py-2 bg-slate-950 text-white text-xs font-bold border-b border-slate-800">
                  <span className="tracking-wider uppercase">Live Meteorological Nowcast</span>
                  <button 
                    onClick={() => setActiveTab('overview')}
                    className="text-slate-400 hover:text-white px-2 py-0.5 rounded text-xs transition-colors"
                  >
                    ✕ Close
                  </button>
                </div>
                <div className="max-h-[80vh] overflow-y-auto">
                  <WeatherPanel 
                    location={selectedLocation} 
                    theme={mapTheme} 
                    weather={weather} 
                    loading={weatherLoading} 
                    isLive={weatherIsLive} 
                  />
                </div>
              </div>
            )}

            {/* Comprehensive IoT Sensor Fusion Hub */}
            {activeTab === 'sensors' && (
               <SensorFusionPanel 
                 theme={mapTheme} 
                 location={selectedLocation} 
                 prediction={currentPrediction} 
                 onClose={() => setActiveTab('overview')}
                 onSelectSensor={(sensor) => {
                   console.log('Selected sensor telemetry:', sensor.id);
                 }}
               />
            )}

            {/* AI Assistant modal button */}
            {isAIOpen ? (
              <AIAssistant onClose={() => setIsAIOpen(false)} theme={mapTheme} location={selectedLocation} prediction={currentPrediction} />
            ) : (
              <button 
                onClick={() => setIsAIOpen(true)}
                className="absolute bottom-24 right-8 w-12 h-12 bg-cyan-600 rounded-full shadow-lg shadow-cyan-900/30 flex items-center justify-center hover:bg-cyan-500 transition-colors z-30 border border-cyan-400 group"
                title="AI Hydraulic Assistant"
              >
                <Sparkles className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>

          {/* 0–3 Hour Nowcasting Timeline Slider */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[800px] max-w-[90%] z-20 pointer-events-none">
            <div className="pointer-events-auto w-full">
              <TimelineSlider 
                timeOffsetMin={timeOffsetMin}
                setTimeOffsetMin={setTimeOffsetMin}
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
                theme={mapTheme}
              />
            </div>
          </div>
        </div>

        {/* Right Intelligence Panel */}
        <RightPanel 
          prediction={currentPrediction} 
          selectedRoad={selectedRoad} 
          theme={mapTheme} 
          weather={weather} 
          weatherLoading={weatherLoading} 
          weatherIsLive={weatherIsLive} 
          criticalZones={criticalZones} 
          activeTab={activeTab} 
          location={selectedLocation} 
          onOpenAlertModal={() => setIsSocietyAlertOpen(true)}
          onOpenRouting={() => setActiveTab('routing')}
          onOpenWhatIfModal={() => setIsWhatIfOpen(true)}
          onOpenValidationModal={() => setIsValidationOpen(true)}
          timeToFloodMin={coupledState.timeToFloodMin}
          confidenceScore={coupledState.confidenceScore}
          drainUtilizationPct={coupledState.drainUtilizationPct}
          fusedExplanations={coupledState.fusedExplanations}
        />
      </div>

      {/* Society Siren & Warning System */}
      <SocietyAlertSystem
        isOpen={isSocietyAlertOpen}
        onClose={() => setIsSocietyAlertOpen(false)}
        location={selectedLocation}
        prediction={currentPrediction}
        theme={mapTheme}
        coupledState={coupledState}
        facilities={CRITICAL_FACILITIES}
        onSelectRoute={(id) => {
          setSelectedRouteId(id);
          setActiveTab('routing');
        }}
      />

      {/* "What-If" Scenario Simulator Modal (SIH26085 §15) */}
      <WhatIfSimulatorModal
        isOpen={isWhatIfOpen}
        onClose={() => setIsWhatIfOpen(false)}
        config={whatIfConfig}
        onApplyConfig={(cfg) => setWhatIfConfig(cfg)}
        onResetConfig={() => setWhatIfConfig({
          rainfallMmHr: 35,
          drainBlockagePct: 35,
          tideLevelM: 0.8,
          pumpCapacityM3s: 22,
          soilSaturationPct: 82,
          greenInfraEfficiencyPct: 30
        })}
        currentResult={{
          maxDepthCm: coupledState.maxDepthCm,
          floodedAreaKm2: coupledState.floodedAreaKm2,
          drainLoadPct: coupledState.drainUtilizationPct,
          timeToFloodMin: coupledState.timeToFloodMin,
          roadsAtRiskCount: coupledState.roads.filter(r => r.risk === 'critical' || r.risk === 'high').length
        }}
      />

      {/* SIH 2026 Problem Statement Validation Suite Modal (SIH26085 §21) */}
      <SystemValidationModal
        isOpen={isValidationOpen}
        onClose={() => setIsValidationOpen(false)}
      />
    </div>
  );
}
