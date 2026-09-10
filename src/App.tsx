import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from './lib/utils';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import MapComponent from './components/MapComponent';
import RightPanel from './components/RightPanel';
import TimelineSlider from './components/TimelineSlider';
import WeatherPanel from './components/WeatherPanel';
import AIAssistant from './components/AIAssistant';
import { CriticalZonesSummary } from './components/CriticalZonesSummary';
import { RoutingPanel } from './components/RoutingPanel';
import { DrainagePanel } from './components/DrainagePanel';
import { SensorFusionPanel } from './components/SensorFusionPanel';
import { ImpactTab } from './components/ImpactTab';
import { SocietyAlertSystem } from './components/SocietyAlertSystem';
import { SocietyAlarmBanner } from './components/SocietyAlarmBanner';
import { LOCATIONS, DEMO_PREDICTIONS, DEMO_ROADS } from './data';
import { Location, PredictionData, RoadRisk } from './types';
import { useWeatherNotifications } from './hooks/useWeatherNotifications';
import { useLiveWeather } from './hooks/useLiveWeather';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedLocation, setSelectedLocation] = useState<Location>(LOCATIONS[0]);
  const [timeOffsetMin, setTimeOffsetMin] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedRoad, setSelectedRoad] = useState<RoadRisk | null>(null);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [mapTheme, setMapTheme] = useState<'light'|'dark'>('light');
  const [selectedRouteId, setSelectedRouteId] = useState('route-ridge');
  const [isSocietyAlertOpen, setIsSocietyAlertOpen] = useState(false);

  // Initialize background weather polling and notifications
  const { notificationsEnabled, requestPermission } = useWeatherNotifications(selectedLocation);
  
  // Initialize live weather data for map rendering
  const { weather, loading: weatherLoading, isLive: weatherIsLive, lastUpdated: weatherLastUpdated } = useLiveWeather(selectedLocation);
  const isRaining = weather?.current?.rainfall > 0;

  // Derive current prediction from timeOffset with smooth linear interpolation
  const currentPrediction = React.useMemo(() => {
    const stops = DEMO_PREDICTIONS;
    if (timeOffsetMin <= stops[0].timeOffsetMin) return stops[0];
    if (timeOffsetMin >= stops[stops.length - 1].timeOffsetMin) return stops[stops.length - 1];

    for (let i = 0; i < stops.length - 1; i++) {
      const s1 = stops[i];
      const s2 = stops[i + 1];
      if (timeOffsetMin >= s1.timeOffsetMin && timeOffsetMin <= s2.timeOffsetMin) {
        const ratio = (timeOffsetMin - s1.timeOffsetMin) / (s2.timeOffsetMin - s1.timeOffsetMin);
        return {
          timeOffsetMin,
          floodedAreaKm2: Number((s1.floodedAreaKm2 + (s2.floodedAreaKm2 - s1.floodedAreaKm2) * ratio).toFixed(2)),
          maxDepthCm: Math.round(s1.maxDepthCm + (s2.maxDepthCm - s1.maxDepthCm) * ratio),
          rainfallIntensityMm: Math.round(s1.rainfallIntensityMm + (s2.rainfallIntensityMm - s1.rainfallIntensityMm) * ratio)
        };
      }
    }
    return stops[0];
  }, [timeOffsetMin]);

  // Handle playback
  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setTimeOffsetMin(prev => {
          if (prev >= 180) {
            setIsPlaying(false);
            return 180;
          }
          return prev + 15; // increment by 15 mins for smooth playback
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Mock selecting a road based on current location
  useEffect(() => {
    const riskLevel = timeOffsetMin > 120 ? 'critical' : timeOffsetMin > 60 ? 'high' : 'moderate';
    const dynamicRoad: RoadRisk = {
      ...DEMO_ROADS[0],
      id: selectedLocation.id,
      name: `${selectedLocation.name.split(',')[0]} Main St`,
      risk: riskLevel as any,
      depthCm: currentPrediction.maxDepthCm,
      timeToFloodMin: Math.max(0, 180 - timeOffsetMin),
    };
    setSelectedRoad(dynamicRoad);
  }, [timeOffsetMin, selectedLocation, currentPrediction]);

  const criticalZones = React.useMemo(() => {
    // Only show critical zones when prediction is somewhat advanced
    if (timeOffsetMin < 60) return [];

    const baseName = selectedLocation.name.split(',')[0];
    const zones = [
      { name: `${baseName} Main St`, time: Math.max(0, 120 - timeOffsetMin), depth: currentPrediction.maxDepthCm },
      { name: `${baseName} Underpass`, time: Math.max(0, 90 - timeOffsetMin), depth: Math.round(currentPrediction.maxDepthCm * 1.3) },
    ];
    
    if (timeOffsetMin >= 120) {
      zones.push({ name: `${baseName} Market Square`, time: Math.max(0, 150 - timeOffsetMin), depth: Math.round(currentPrediction.maxDepthCm * 0.8) });
      zones.push({ name: `Lower ${baseName} Riverside`, time: 0, depth: Math.round(currentPrediction.maxDepthCm * 1.5) });
    }

    return zones;
  }, [timeOffsetMin, selectedLocation, currentPrediction]);

  const handleMapClick = async (lat: number, lng: number) => {
    // Instantly update the location to show "Locating..."
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
          name: data.display_name.split(',')[0], // Use first part of the address
          lat,
          lng
        });
      } else {
        setSelectedLocation(prev => ({ ...prev, name: "Selected Location" }));
      }
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      setSelectedLocation(prev => ({ ...prev, name: "Selected Location" }));
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-screen w-screen overflow-hidden font-sans transition-colors duration-300",
      mapTheme === 'light' ? "bg-slate-50 text-slate-800" : "bg-slate-950 text-slate-200"
    )}>
      <TopBar 
        locations={LOCATIONS} 
        selectedLocation={selectedLocation} 
        setSelectedLocation={setSelectedLocation} 
        isLive={true}
        mapTheme={mapTheme}
        setMapTheme={setMapTheme}
        notificationsEnabled={notificationsEnabled}
        requestPermission={requestPermission}
      />

      {/* Society Flood Warning & Emergency Siren Banner */}
      <SocietyAlarmBanner
        location={selectedLocation}
        prediction={currentPrediction}
        theme={mapTheme}
        onOpenAlertModal={() => setIsSocietyAlertOpen(true)}
        onOpenRoutingTab={() => setActiveTab('routing')}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          theme={mapTheme} 
          onTriggerAlarm={() => setIsSocietyAlertOpen(true)}
        />
        
        <div className="flex-1 relative flex flex-col p-4 z-10">
          <div className="flex-1 relative">
            <MapComponent 
              location={selectedLocation} 
              timeOffsetMin={timeOffsetMin} 
              onLocationClick={handleMapClick}
              activeTab={activeTab}
              theme={mapTheme}
              isRaining={isRaining}
              currentPrediction={currentPrediction}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
              isAlarmActive={isSocietyAlertOpen}
            />
            {/* Multi-Route Safe Evacuation Hub */}
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

            {/* Coupled DEM / Drainage Panel */}
            {activeTab === 'drainage' && (
               <DrainagePanel theme={mapTheme} prediction={currentPrediction} />
            )}

            {/* Comprehensive IoT Sensor Fusion & Telemetry Hub */}
            {activeTab === 'sensors' && (
               <SensorFusionPanel 
                 theme={mapTheme} 
                 location={selectedLocation} 
                 prediction={currentPrediction} 
                 onClose={() => setActiveTab('overview')}
                 onSelectSensor={(sensor) => {
                   // Center or focus on sensor if needed
                   console.log('Selected sensor:', sensor.id);
                 }}
               />
            )}

            {isAIOpen ? (
              <AIAssistant onClose={() => setIsAIOpen(false)} theme={mapTheme} location={selectedLocation} prediction={currentPrediction} />
            ) : (
              <button 
                onClick={() => setIsAIOpen(true)}
                className="absolute bottom-24 right-8 w-12 h-12 bg-blue-600 rounded-full shadow-lg shadow-blue-900/20 flex items-center justify-center hover:bg-blue-500 transition-colors z-30 border border-blue-400 group"
              >
                <Sparkles className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>

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
        />
      </div>

      {/* Society Risk Alert & Audio Siren Modal Dialog */}
      <SocietyAlertSystem
        isOpen={isSocietyAlertOpen}
        onClose={() => setIsSocietyAlertOpen(false)}
        location={selectedLocation}
        prediction={currentPrediction}
        theme={mapTheme}
        onSelectRoute={(id) => {
          setSelectedRouteId(id);
          setActiveTab('routing');
        }}
      />
    </div>
  );
}
