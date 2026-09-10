import { useEffect, useRef, useState } from 'react';
import { Location } from '../types';

export function useWeatherNotifications(location: Location) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const lastAlertTimeRef = useRef<number>(0);

  // Check if permissions are already granted on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return false;
    }

    if (Notification.permission === 'granted') {
      setNotificationsEnabled(true);
      return true;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
      return true;
    }
    
    return false;
  };

  useEffect(() => {
    if (!notificationsEnabled) return;

    const checkWeatherAlerts = async () => {
      try {
        const res = await fetch(`/api/weather/live-alert?lat=${location.lat}&lon=${location.lng}`);
        if (!res.ok) return;

        const data = await res.json();
        
        // If there is an alert from the backend
        if (data.alert) {
          const now = Date.now();
          // Prevent spamming notifications (only send once every 30 minutes per location)
          if (now - lastAlertTimeRef.current > 30 * 60 * 1000) {
            new Notification(`Flood Alert: ${data.alert.level}`, {
              body: data.alert.message,
              icon: '/favicon.ico', // Optional icon
              tag: 'flood-alert'
            });
            lastAlertTimeRef.current = now;
          }
        }
      } catch (err) {
        console.error('Failed to poll weather for notifications:', err);
      }
    };

    // Initial check
    checkWeatherAlerts();

    // Poll every 5 minutes (300000 ms)
    const intervalId = setInterval(checkWeatherAlerts, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [location, notificationsEnabled]);

  return { notificationsEnabled, requestPermission };
}
