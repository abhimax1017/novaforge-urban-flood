/**
 * Hydrodynamic flood propagation and distance-based road inundation engine.
 * Calculates water progression along street networks as flood severity / depth increases.
 */

export interface FloodPropagationResult {
  floodedRoads: any; // GeoJSON FeatureCollection
  floodedPonds: any; // GeoJSON FeatureCollection
  reachDistanceMeters: number;
  reachDistanceKm: string;
  floodPercent: number;
  totalFloodedLengthMeters: number;
  activeRoadCount: number;
}

/**
 * Calculates continuous road flooding and distance reach based on flood depth (5 to 65+ cm).
 */
export function calculateFloodPropagation(
  roadsGeojson: any,
  pondsGeojson: any,
  centerLat: number,
  centerLng: number,
  depthCm: number
): FloodPropagationResult {
  // Ensure non-negative safe depth
  const safeDepth = Math.max(0, depthCm);

  // Normalize flood percentage from 0% (baseline 5cm) to 100% (65cm+)
  const floodPercent = Math.min(100, Math.max(0, Math.round(((safeDepth - 5) / 60) * 100)));

  // Center / low elevation accumulation epicenter
  const originLng = centerLng;
  const originLat = centerLat;

  // Maximum radial distance water has traveled along road network
  // At 0%: ~250 meters (0.0025 deg) - localized road drainage junction
  // At 100%: ~2,800 meters (0.026 deg) - full regional neighborhood submergence
  const minMeters = 250;
  const maxMeters = 2800;
  const reachDistanceMeters = Math.round(minMeters + (floodPercent / 100) * (maxMeters - minMeters));

  const minDeg = 0.0025;
  const maxDeg = 0.0260;
  const reachDistanceDeg = minDeg + (floodPercent / 100) * (maxDeg - minDeg);

  let totalFloodedLengthMeters = 0;
  const floodedRoadFeatures: any[] = [];

  const sourceFeatures = (roadsGeojson && roadsGeojson.features) ? roadsGeojson.features : [];

  for (let idx = 0; idx < sourceFeatures.length; idx++) {
    const feat = sourceFeatures[idx];
    if (!feat.geometry || !feat.geometry.coordinates) continue;

    const coords = feat.geometry.coordinates;
    const geomType = feat.geometry.type;

    if (geomType === 'LineString' && coords.length >= 2) {
      // Find minimum distance of any point on this road to the flood origin
      let minPtDist = Infinity;
      let maxPtDist = 0;
      for (const pt of coords) {
        const d = Math.hypot(pt[0] - originLng, pt[1] - originLat);
        if (d < minPtDist) minPtDist = d;
        if (d > maxPtDist) maxPtDist = d;
      }

      // If road is completely outside current reach, skip it
      if (minPtDist > reachDistanceDeg) {
        continue;
      }

      // If road is completely within reach, keep the whole clean smooth road
      let floodedCoords: number[][] = [];

      if (maxPtDist <= reachDistanceDeg) {
        floodedCoords = coords;
      } else {
        // Road crosses the flood front: truncate smoothly along its coordinates
        floodedCoords = clipRoadToRadius(coords, originLng, originLat, reachDistanceDeg);
      }

      if (floodedCoords.length >= 2) {
        let segLen = 0;
        for (let i = 0; i < floodedCoords.length - 1; i++) {
          segLen += getDistanceMeters(
            floodedCoords[i][1], floodedCoords[i][0],
            floodedCoords[i + 1][1], floodedCoords[i + 1][0]
          );
        }
        totalFloodedLengthMeters += segLen;

        const proximity = Math.max(0, Math.min(1, 1 - (minPtDist / reachDistanceDeg)));
        const roadDepth = Math.max(3, Math.round(depthCm * (0.35 + 0.65 * proximity)));

        floodedRoadFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: floodedCoords
          },
          properties: {
            ...feat.properties,
            id: feat.properties?.id ? `${feat.properties.id}-flooded` : `road-${idx}`,
            depth: roadDepth,
            proximity,
            reachDistanceMeters,
            floodPercent
          }
        });
      }
    }
  }

  // Handle ponds / retention basins at cul-de-sacs
  const floodedPondFeatures: any[] = [];
  const pondSourceFeatures = (pondsGeojson && pondsGeojson.features) ? pondsGeojson.features : [];

  for (const pondFeat of pondSourceFeatures) {
    if (!pondFeat.geometry || !pondFeat.geometry.coordinates) continue;

    const ring = pondFeat.geometry.coordinates[0];
    if (!ring || ring.length === 0) continue;

    let sumLng = 0;
    let sumLat = 0;
    for (const pt of ring) {
      sumLng += pt[0];
      sumLat += pt[1];
    }
    const pondCenterLng = sumLng / ring.length;
    const pondCenterLat = sumLat / ring.length;

    const pondDistFromOrigin = Math.hypot(pondCenterLng - originLng, pondCenterLat - originLat);

    // If flood reach distance has reached this pond:
    if (reachDistanceDeg >= pondDistFromOrigin * 0.9) {
      const overflowRatio = Math.min(1, Math.max(0.3, (reachDistanceDeg - pondDistFromOrigin * 0.9) / 0.005));

      const scaledRing = ring.map((pt: number[]) => {
        const dLng = pt[0] - pondCenterLng;
        const dLat = pt[1] - pondCenterLat;
        return [
          pondCenterLng + dLng * overflowRatio,
          pondCenterLat + dLat * overflowRatio
        ];
      });

      floodedPondFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [scaledRing]
        },
        properties: {
          ...pondFeat.properties,
          depth: Math.round(depthCm * (0.7 + 0.3 * overflowRatio)),
          floodPercent
        }
      });
    }
  }

  const reachDistanceKm = reachDistanceMeters >= 1000 
    ? `${(reachDistanceMeters / 1000).toFixed(2)} km` 
    : `${reachDistanceMeters} m`;

  return {
    floodedRoads: {
      type: 'FeatureCollection',
      features: floodedRoadFeatures
    },
    floodedPonds: {
      type: 'FeatureCollection',
      features: floodedPondFeatures
    },
    reachDistanceMeters,
    reachDistanceKm,
    floodPercent,
    totalFloodedLengthMeters: Math.round(totalFloodedLengthMeters),
    activeRoadCount: floodedRoadFeatures.length
  };
}

/**
 * Truncates a road polyline so that the portion within the radius is smoothly preserved.
 */
function clipRoadToRadius(
  coords: number[][],
  originLng: number,
  originLat: number,
  maxDistDeg: number
): number[][] {
  const result: number[][] = [];

  for (let i = 0; i < coords.length; i++) {
    const pt = coords[i];
    const dist = Math.hypot(pt[0] - originLng, pt[1] - originLat);

    if (dist <= maxDistDeg) {
      result.push(pt);
    } else {
      // If previous point was inside, interpolate intersection point
      if (result.length > 0 && i > 0) {
        const prev = coords[i - 1];
        const prevDist = Math.hypot(prev[0] - originLng, prev[1] - originLat);
        if (prevDist <= maxDistDeg && Math.abs(dist - prevDist) > 0.00001) {
          const t = (maxDistDeg - prevDist) / (dist - prevDist);
          const interpLng = prev[0] + (pt[0] - prev[0]) * t;
          const interpLat = prev[1] + (pt[1] - prev[1]) * t;
          result.push([interpLng, interpLat]);
        }
      }
      break;
    }
  }

  // If road starts outside and enters
  if (result.length < 2) {
    const reversed = [...coords].reverse();
    const revResult: number[][] = [];
    for (let i = 0; i < reversed.length; i++) {
      const pt = reversed[i];
      const dist = Math.hypot(pt[0] - originLng, pt[1] - originLat);
      if (dist <= maxDistDeg) {
        revResult.push(pt);
      } else {
        if (revResult.length > 0 && i > 0) {
          const prev = reversed[i - 1];
          const prevDist = Math.hypot(prev[0] - originLng, prev[1] - originLat);
          if (prevDist <= maxDistDeg && Math.abs(dist - prevDist) > 0.00001) {
            const t = (maxDistDeg - prevDist) / (dist - prevDist);
            revResult.push([prev[0] + (pt[0] - prev[0]) * t, prev[1] + (pt[1] - prev[1]) * t]);
          }
        }
        break;
      }
    }
    if (revResult.length >= 2) {
      return revResult.reverse();
    }
  }

  return result.length >= 2 ? result : coords.slice(0, 2);
}

/**
 * Calculates geodesic distance between two points in meters using Haversine formula.
 */
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
