import { useState, useEffect, useRef } from 'react';
import { Location, PredictionData, SafetyRoute } from '../types';
import { getSafetyRoutesForLocation } from '../utils/safetyRouting';

// In-memory cache for fetched OSRM geometries to prevent duplicate requests
const routeGeometryCache = new Map<string, [number, number][]>();

export function useRealSafetyRoutes(location: Location, prediction: PredictionData) {
  const baseRoutes = getSafetyRoutesForLocation(location, prediction);
  const [routes, setRoutes] = useState<SafetyRoute[]>(baseRoutes);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    const initialRoutes = getSafetyRoutesForLocation(location, prediction);
    
    // Immediately apply cached geometries if available
    const hydratedRoutes = initialRoutes.map(route => {
      const cacheKey = `${location.lat.toFixed(4)},${location.lng.toFixed(4)}->${route.id}`;
      if (routeGeometryCache.has(cacheKey)) {
        return {
          ...route,
          waypoints: routeGeometryCache.get(cacheKey)!
        };
      }
      return route;
    });

    setRoutes(hydratedRoutes);

    // Fetch real road-following geometries from OSRM for all routes in parallel
    const fetchRealRoadRoutes = async () => {
      const baseLng = location.lng;
      const baseLat = location.lat;

      const updatedRoutes = await Promise.all(
        initialRoutes.map(async (route) => {
          const cacheKey = `${location.lat.toFixed(4)},${location.lng.toFixed(4)}->${route.id}`;
          if (routeGeometryCache.has(cacheKey)) {
            return {
              ...route,
              waypoints: routeGeometryCache.get(cacheKey)!
            };
          }

          try {
            const destLng = route.destCoords[0];
            const destLat = route.destCoords[1];

            // Define intermediate waypoint to ensure route adheres to designated corridor (ridge, flyover, shelter, perimeter)
            let waypointsParam = `${baseLng},${baseLat};${destLng},${destLat}`;
            
            if (route.tag === 'primary') {
              const midLng = baseLng - 0.01;
              const midLat = baseLat + 0.015;
              waypointsParam = `${baseLng},${baseLat};${midLng},${midLat};${destLng},${destLat}`;
            } else if (route.tag === 'bypass') {
              const midLng = baseLng + 0.012;
              const midLat = baseLat + 0.01;
              waypointsParam = `${baseLng},${baseLat};${midLng},${midLat};${destLng},${destLat}`;
            } else if (route.tag === 'shelter') {
              const midLng = baseLng + 0.007;
              const midLat = baseLat + 0.015;
              waypointsParam = `${baseLng},${baseLat};${midLng},${midLat};${destLng},${destLat}`;
            } else if (route.tag === 'perimeter') {
              const midLng = baseLng - 0.015;
              const midLat = baseLat - 0.009;
              waypointsParam = `${baseLng},${baseLat};${midLng},${midLat};${destLng},${destLat}`;
            }

            const url = `https://router.project-osrm.org/route/v1/driving/${waypointsParam}?overview=full&geometries=geojson`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.ok) {
              const data = await res.json();
              if (data.routes && data.routes.length > 0 && data.routes[0].geometry?.coordinates) {
                const roadCoords = data.routes[0].geometry.coordinates as [number, number][];
                routeGeometryCache.set(cacheKey, roadCoords);
                return {
                  ...route,
                  waypoints: roadCoords,
                  distanceKm: Number((data.routes[0].distance / 1000).toFixed(1)),
                  etaMin: Math.max(3, Math.round(data.routes[0].duration / 60))
                };
              }
            }
          } catch (e) {
            // Silently fallback to synthetic street-grid waypoints
          }

          return route;
        })
      );

      if (isMountedRef.current) {
        setRoutes(updatedRoutes);
      }
    };

    fetchRealRoadRoutes();

    return () => {
      isMountedRef.current = false;
    };
  }, [location.lat, location.lng, location.id, prediction?.maxDepthCm]);

  return routes;
}
