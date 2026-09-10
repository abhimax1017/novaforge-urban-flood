import { useEffect, useState } from 'react';
import { Location } from '../types';

const getFallbackWeather = () => {
  const now = new Date();
  const times = [
    new Date(now.getTime() + 3600000).toISOString(),
    new Date(now.getTime() + 7200000).toISOString(),
    new Date(now.getTime() + 10800000).toISOString(),
  ];
  return {
    current: {
      temperature: 26.5,
      humidity: 78,
      windSpeed: 12.0,
      rainfall: 0,
      description: 'Scattered Clouds',
    },
    forecast: {
      times,
      precipitation: [0, 0, 0],
      precipProb: [0, 0, 0],
    },
    alert: null
  };
};

export function useLiveWeather(location: Location) {
  const [weather, setWeather] = useState<any>(getFallbackWeather());
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(new Date());

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
          // Keep existing weather or ensure fallback is populated
          setWeather((prev: any) => prev || getFallbackWeather());
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchWeather();
    
    const interval = setInterval(fetchWeather, 5 * 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [location.lat, location.lng]);

  return { weather, loading, isLive, lastUpdated };
}
