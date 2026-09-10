import { useState, useEffect } from 'react';
import { Location } from '../types';
import { getRealisticNeighborhoodRoads } from '../utils/neighborhoodRoads';

export function useRealMapData(location: Location) {
  const [roadsGeojson, setRoadsGeojson] = useState<any>(null);
  const [routeGeojson, setRouteGeojson] = useState<any>(null);
  const [drainageNodesGeojson, setDrainageNodesGeojson] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      
      const fallbackData = getRealisticNeighborhoodRoads(location.lat, location.lng);
      setRoadsGeojson(fallbackData.roads);

      let overpassData = null;
      try {
        const query = `[out:json];(way["highway"~"primary|secondary|tertiary|residential|unclassified|service|living_street"](around:2000,${location.lat},${location.lng});way["waterway"](around:2000,${location.lat},${location.lng}););out geom;`;
        
        const endpoints = [
          'https://overpass-api.de/api/interpreter',
          'https://lz4.overpass-api.de/api/interpreter',
          'https://overpass.kumi.systems/api/interpreter'
        ];

        // Fetch from all endpoints simultaneously and take the first successful response
        overpassData = await Promise.any(
          endpoints.map(async (endpoint) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s max per request
            
            try {
              const res = await fetch(endpoint, {
                method: 'POST',
                body: query,
                signal: controller.signal
              });
              clearTimeout(timeoutId);
              
              if (!res.ok) throw new Error(`HTTP error ${res.status} from ${endpoint}`);
              const data = await res.json();
              if (!data || !data.elements) throw new Error(`Invalid data from ${endpoint}`);
              return data;
            } catch (err) {
              clearTimeout(timeoutId);
              throw err;
            }
          })
        );

        if (isMounted && overpassData && overpassData.elements && overpassData.elements.length > 0) {
          const features = overpassData.elements.map((el: any) => {
            if (el.type === 'way' && el.geometry) {
              const dist = Math.sqrt(
                Math.pow(el.geometry[0].lon - location.lng, 2) + 
                Math.pow(el.geometry[0].lat - location.lat, 2)
              );
              
              const highway = el.tags?.highway || '';
              const waterway = el.tags?.waterway || '';
              const isDrainage = !!waterway || ['primary', 'secondary'].includes(highway);

              return {
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: el.geometry.map((g: any) => [g.lon, g.lat])
                },
                properties: {
                  id: el.id,
                  highway,
                  waterway,
                  isDrainage,
                  dist
                }
              };
            }
            return null;
          }).filter(Boolean);

          setRoadsGeojson({ type: 'FeatureCollection', features });

          // Extract unique coordinates from drainage ways to act as mathematically computed nodes (manholes/inlets)
          const nodeMap = new Map();
          features.forEach((f: any) => {
            if (f.properties.isDrainage) {
              // Create nodes every few coordinates to simulate manholes
              f.geometry.coordinates.forEach((coord: any, idx: number) => {
                if (idx % 3 === 0) {
                  const key = `${coord[0]},${coord[1]}`;
                  if (!nodeMap.has(key)) {
                    // pseudo-randomize base capacity vulnerability based on coordinate string
                    const vulnSeed = (Math.abs(coord[0] * coord[1]) * 1000000) % 100;
                    nodeMap.set(key, {
                      type: 'Feature',
                      geometry: {
                        type: 'Point',
                        coordinates: [coord[0], coord[1]]
                      },
                      properties: {
                        vulnerability: vulnSeed
                      }
                    });
                  }
                }
              });
            }
          });
          setDrainageNodesGeojson({ type: 'FeatureCollection', features: Array.from(nodeMap.values()) });

        } else {
          throw new Error('No data from any Overpass endpoint');
        }
      } catch (e) {
        console.warn("Overpass API error:", e);
        if (isMounted) {
          setRoadsGeojson(fallbackData.roads);
          setDrainageNodesGeojson({ 
            type: 'FeatureCollection', 
            features: fallbackData.roads.features.filter((f: any) => f.properties?.isDrainage) 
          });
        }
      }

      try {
         const destLng = location.lng + 0.02;
         const destLat = location.lat + 0.02;

         // 1. Standard Route (Direct)
         const standardRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${location.lng},${location.lat};${destLng},${destLat}?geometries=geojson`);
         const standardData = await standardRes.json();
         
         // 2. Safe Route (Diverted via intermediate point to avoid central flood zones)
         const midLng = location.lng - 0.01;
         const midLat = location.lat + 0.025;
         const safeRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${location.lng},${location.lat};${midLng},${midLat};${destLng},${destLat}?geometries=geojson`);
         const safeData = await safeRes.json();

         let features = [];
         
         if (standardData.routes && standardData.routes.length > 0) {
           features.push({
             type: 'Feature',
             geometry: standardData.routes[0].geometry,
             properties: { type: 'standard', distance: standardData.routes[0].distance, duration: standardData.routes[0].duration }
           });
         }
         
         if (safeData.routes && safeData.routes.length > 0) {
           features.push({
             type: 'Feature',
             geometry: safeData.routes[0].geometry,
             properties: { type: 'safe', distance: safeData.routes[0].distance, duration: safeData.routes[0].duration }
           });
         }

         if (isMounted && features.length > 0) {
           setRouteGeojson({
             type: 'FeatureCollection',
             features
           });
         } else {
           throw new Error('No routes');
         }
      } catch (e) {
        console.warn("OSRM API error, using fallback line:", e);
        if (isMounted) {
           const destLng = location.lng + 0.02;
           const destLat = location.lat + 0.02;
           setRouteGeojson({
             type: 'FeatureCollection',
             features: [{
               type: 'Feature',
               geometry: {
                 type: 'LineString',
                 coordinates: [[location.lng, location.lat], [destLng, destLat]]
               },
               properties: {}
             }]
           });
        }
      }
      
      if (isMounted) setLoading(false);
    };
    
    fetchData();
    return () => { isMounted = false; };
  }, [location]);

  return { roadsGeojson, routeGeojson, drainageNodesGeojson, loading };
}
