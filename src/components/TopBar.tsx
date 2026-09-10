import React, { useState } from 'react';
import { Search, MapPin, Radio, ChevronDown, Loader2, Moon, Sun, Bell, BellOff, CloudRain, Cloud } from 'lucide-react';
import { Location } from '../types';
import { cn } from '../lib/utils';

interface TopBarProps {
  locations: Location[];
  selectedLocation: Location;
  setSelectedLocation: (loc: Location) => void;
  isLive: boolean;
  mapTheme: 'light' | 'dark';
  setMapTheme: (t: 'light' | 'dark') => void;
  notificationsEnabled?: boolean;
  requestPermission?: () => void;
  weather?: any;
}

export default function TopBar({ 
  locations, 
  selectedLocation, 
  setSelectedLocation, 
  isLive, 
  mapTheme, 
  setMapTheme,
  notificationsEnabled = false,
  requestPermission,
  weather
}: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowResults(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&countrycodes=in&format=json&limit=5`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result: any) => {
    setSelectedLocation({
      id: result.place_id.toString(),
      name: result.display_name.split(',')[0], // Extract main name
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon)
    });
    setShowResults(false);
    setSearchQuery('');
  };

  return (
    <div className={cn(
      "relative h-16 border-b flex items-center justify-between px-2 md:px-6 shrink-0 z-50 transition-colors",
      mapTheme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
    )}>
      
      <div className="flex items-center gap-2 md:gap-6">
        {/* City Selector */}
        <div className="relative group">
          <button className={cn(
            "flex items-center gap-2 px-3 md:px-4 py-2 rounded-md border transition-colors",
            mapTheme === 'light' ? "bg-slate-50 hover:bg-slate-100 border-slate-200" : "bg-slate-800 hover:bg-slate-700 border-slate-700"
          )}>
            <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
            <span className={cn(
              "font-medium text-xs md:text-sm truncate max-w-[100px] md:max-w-none",
              mapTheme === 'light' ? "text-slate-800" : "text-white"
            )}>{selectedLocation.name}</span>
            <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-slate-400 shrink-0" />
          </button>
          
          <div className={cn(
            "absolute top-full left-0 mt-1 w-48 border rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden",
            mapTheme === 'light' ? "bg-white border-slate-200" : "bg-slate-800 border-slate-700"
          )}>
            {locations.map(loc => (
              <button 
                key={loc.id}
                onClick={() => setSelectedLocation(loc)}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm transition-colors",
                  mapTheme === 'light' ? "text-slate-700 hover:bg-slate-50 hover:text-blue-600" : "text-slate-300 hover:bg-blue-600 hover:text-white"
                )}
              >
                {loc.name}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative w-36 sm:w-48 md:w-80 shrink-0">
          <form onSubmit={handleSearch}>
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 animate-spin" />
            ) : (
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            )}
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
              placeholder="Search any location in India..."
              className={cn(
                "w-full border rounded-md py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-colors",
                mapTheme === 'light' ? "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400" : "bg-slate-950 border-slate-800 text-slate-300 placeholder-slate-500"
              )}
            />
          </form>

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className={cn(
              "absolute top-full left-0 mt-2 w-full border rounded-md shadow-2xl z-50 overflow-hidden",
              mapTheme === 'light' ? "bg-white border-slate-200" : "bg-slate-800 border-slate-700"
            )}>
              <div className={cn(
                "flex justify-between items-center px-4 py-2 border-b",
                mapTheme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-900 border-slate-700"
              )}>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Results</span>
                <button onClick={() => setShowResults(false)} className="text-xs text-blue-500 hover:text-blue-400">Close</button>
              </div>
              <ul className="max-h-64 overflow-y-auto">
                {searchResults.map((result, idx) => (
                  <li key={idx}>
                    <button
                      onClick={() => selectSearchResult(result)}
                      className={cn(
                        "w-full text-left px-4 py-3 text-sm transition-colors border-b last:border-0",
                        mapTheme === 'light' 
                          ? "hover:bg-slate-50 border-slate-100" 
                          : "hover:bg-slate-700 border-slate-700/50"
                      )}
                    >
                      <div className={cn("font-medium truncate", mapTheme === 'light' ? "text-slate-800" : "text-white")}>{result.display_name.split(',')[0]}</div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">{result.display_name}</div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Live Weather Forecast Badge */}
      {weather?.current && (
        <div 
          className={cn(
            "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors",
            mapTheme === 'light' ? "bg-blue-50/80 border-blue-100 text-slate-800" : "bg-blue-950/30 border-blue-900/50 text-slate-200"
          )}
          title={`Forecast: ${weather.current.description} | Rain: ${weather.current.rainfall} mm/h`}
        >
          {weather.current.rainfall > 0 ? (
            <CloudRain className="w-4 h-4 text-blue-500 animate-pulse shrink-0" />
          ) : (
            <Cloud className="w-4 h-4 text-slate-400 shrink-0" />
          )}
          <span className="font-bold font-mono text-sm">
            {weather.current.temperature.toFixed(1)}°C
          </span>
          <span className="text-slate-500 dark:text-slate-400 font-medium truncate max-w-[110px]">
            {weather.current.description}
          </span>
          {weather.current.rainfall > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-blue-600 text-white">
              {weather.current.rainfall} mm/h
            </span>
          )}
        </div>
      )}

      {/* Status & Theme */}
      <div className="hidden sm:flex items-center gap-4 shrink-0">
        <button 
          onClick={() => {
            if (!notificationsEnabled && requestPermission) {
              requestPermission();
            }
          }}
          className={cn(
            "p-1.5 rounded-md border transition-colors flex items-center justify-center relative",
            mapTheme === 'light' ? "bg-white border-slate-200 hover:bg-slate-50 text-slate-600" : "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300"
          )}
          title={notificationsEnabled ? "Notifications Enabled" : "Enable Flood Alerts"}
        >
          {notificationsEnabled ? (
            <>
              <Bell className="w-4 h-4 text-blue-500" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            </>
          ) : (
            <BellOff className="w-4 h-4 text-slate-400" />
          )}
        </button>
        <button 
          onClick={() => setMapTheme(mapTheme === 'light' ? 'dark' : 'light')}
          className={cn(
            "p-1.5 rounded-md border transition-colors",
            mapTheme === 'light' ? "bg-white border-slate-200 hover:bg-slate-50 text-slate-600" : "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300"
          )}
          title="Toggle Map Theme"
        >
          {mapTheme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
        <div className={cn(
          "flex items-center gap-2 px-3 py-1 rounded-full border",
          mapTheme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-800 border-slate-700"
        )}>
          <Radio className={`w-3 h-3 ${isLive ? 'text-green-500 animate-pulse' : 'text-orange-500'}`} />
          <span className={cn(
            "text-[10px] font-bold tracking-wider uppercase",
            mapTheme === 'light' ? "text-slate-600" : "text-slate-300"
          )}>
            {isLive ? 'SYSTEM LIVE' : 'DEMO MODE'}
          </span>
        </div>
        <div className="text-xs text-slate-500">
          Updated: Just now
        </div>
      </div>
    </div>
  );
}
