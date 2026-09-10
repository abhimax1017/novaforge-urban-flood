import { useEffect, useState } from 'react';
import { Location } from '../types';

export function useLiveWeather(location: Location) {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchWeather = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/weather/live-alert?lat=${location.lat}&lon=${location.lng}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setWeather(data);
            setIsLive(true);
            setLastUpdated(new Date());
          }
        } else {
          throw new Error('API unavailable');
        }
      } catch (err) {
        if (isMounted) {
          setIsLive(false);
          // Keep existing weather data if we have it, so it becomes "stale"
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    // Clear weather and lastUpdated when location actually changes
    setWeather(null);
    setLastUpdated(null);
    fetchWeather();
    
    const interval = setInterval(fetchWeather, 5 * 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [location]);

  return { weather, loading, isLive, lastUpdated };
}
