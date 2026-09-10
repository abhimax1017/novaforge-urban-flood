/**
 * Realistic neighborhood road network generator.
 * Models a connected suburban/urban residential layout with curving streets,
 * branching avenues, junctions, and cul-de-sacs with turnaround bulbs,
 * matching hydrodynamic 2D flood simulation models (e.g. TUFLOW / HEC-RAS 2D).
 */

export function getRealisticNeighborhoodRoads(centerLat: number, centerLng: number) {
  const scale = 0.008; // ~850m radius footprint

  // Road centerlines
  const roads = [
    // 1. Central Arterial Avenue (winding East-West through neighborhood)
    {
      id: 'road-main-arterial',
      name: 'Riverdale Avenue',
      highway: 'secondary',
      coords: [
        [centerLng - scale * 1.8, centerLat + scale * 0.15],
        [centerLng - scale * 1.2, centerLat + scale * 0.25],
        [centerLng - scale * 0.6, centerLat + scale * 0.20],
        [centerLng, centerLat + scale * 0.18],
        [centerLng + scale * 0.7, centerLat + scale * 0.12],
        [centerLng + scale * 1.3, centerLat + scale * 0.05],
        [centerLng + scale * 1.9, centerLat - scale * 0.10],
      ]
    },
    // 2. North Residential Loop (curving above main avenue)
    {
      id: 'road-north-crescent',
      name: 'Oakridge Crescent',
      highway: 'residential',
      coords: [
        [centerLng - scale * 1.0, centerLat + scale * 0.22],
        [centerLng - scale * 0.8, centerLat + scale * 0.70],
        [centerLng - scale * 0.2, centerLat + scale * 0.85],
        [centerLng + scale * 0.5, centerLat + scale * 0.80],
        [centerLng + scale * 1.1, centerLat + scale * 0.55],
        [centerLng + scale * 1.3, centerLat + scale * 0.05],
      ]
    },
    // 3. South Residential Way (curving along housing rows below main avenue)
    {
      id: 'road-south-way',
      name: 'Brookside Way',
      highway: 'residential',
      coords: [
        [centerLng - scale * 1.6, centerLat - scale * 0.40],
        [centerLng - scale * 1.1, centerLat - scale * 0.50],
        [centerLng - scale * 0.4, centerLat - scale * 0.45],
        [centerLng + scale * 0.3, centerLat - scale * 0.55],
        [centerLng + scale * 1.0, centerLat - scale * 0.65],
        [centerLng + scale * 1.6, centerLat - scale * 0.70],
      ]
    },
    // 4. Central Cross Street (North-South connecting artery)
    {
      id: 'road-central-cross',
      name: 'Station Road',
      highway: 'tertiary',
      coords: [
        [centerLng - scale * 0.1, centerLat + scale * 0.95],
        [centerLng - scale * 0.05, centerLat + scale * 0.50],
        [centerLng, centerLat + scale * 0.18],
        [centerLng + scale * 0.05, centerLat - scale * 0.20],
        [centerLng + scale * 0.1, centerLat - scale * 0.75],
        [centerLng + scale * 0.15, centerLat - scale * 1.20],
      ]
    },
    // 5. East Cul-de-Sac (like the prominent water-filled turnaround bulb in reference image)
    {
      id: 'road-east-culdesac',
      name: 'Meadow Court',
      highway: 'residential',
      coords: [
        [centerLng + scale * 0.7, centerLat + scale * 0.12],
        [centerLng + scale * 1.2, centerLat - scale * 0.05],
        [centerLng + scale * 1.7, centerLat - scale * 0.12],
        [centerLng + scale * 2.1, centerLat - scale * 0.15],
      ]
    },
    // 6. West Housing Close
    {
      id: 'road-west-close',
      name: 'Willow Close',
      highway: 'residential',
      coords: [
        [centerLng - scale * 1.2, centerLat + scale * 0.25],
        [centerLng - scale * 1.5, centerLat + scale * 0.60],
        [centerLng - scale * 1.7, centerLat + scale * 0.85],
      ]
    },
    // 7. South-Central Connector Lane
    {
      id: 'road-south-connector',
      name: 'Green Lane',
      highway: 'residential',
      coords: [
        [centerLng - scale * 0.6, centerLat + scale * 0.20],
        [centerLng - scale * 0.55, centerLat - scale * 0.15],
        [centerLng - scale * 0.4, centerLat - scale * 0.45],
      ]
    },
    // 8. East-South Diagonal Link
    {
      id: 'road-east-link',
      name: 'Sycamore Drive',
      highway: 'residential',
      coords: [
        [centerLng + scale * 0.7, centerLat + scale * 0.12],
        [centerLng + scale * 0.65, centerLat - scale * 0.25],
        [centerLng + scale * 0.3, centerLat - scale * 0.55],
      ]
    },
    // 9. Far-West Access Road
    {
      id: 'road-far-west',
      name: 'Westbourne Terrace',
      highway: 'residential',
      coords: [
        [centerLng - scale * 1.8, centerLat + scale * 0.15],
        [centerLng - scale * 1.9, centerLat - scale * 0.20],
        [centerLng - scale * 1.6, centerLat - scale * 0.40],
      ]
    },
    // 10. Far-East Crescent
    {
      id: 'road-far-east',
      name: 'Highfield Crescent',
      highway: 'residential',
      coords: [
        [centerLng + scale * 1.3, centerLat + scale * 0.05],
        [centerLng + scale * 1.5, centerLat + scale * 0.35],
        [centerLng + scale * 1.8, centerLat + scale * 0.50],
      ]
    }
  ];

  const features = roads.map((r) => {
    const dist = Math.sqrt(
      Math.pow(r.coords[0][0] - centerLng, 2) + Math.pow(r.coords[0][1] - centerLat, 2)
    );
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: r.coords
      },
      properties: {
        id: r.id,
        name: r.name,
        highway: r.highway,
        dist,
        isDrainage: r.id === 'road-main-arterial' || r.id === 'road-central-cross'
      }
    };
  });

  // Cul-de-sac turnaround bulbs and intersection depression ponds (as shown in reference image)
  const ponds = [
    // Big turnaround pond on the right (like in image.png)
    {
      id: 'pond-east-bulb',
      center: [centerLng + scale * 2.12, centerLat - scale * 0.15],
      radius: scale * 0.18,
      name: 'Meadow Court Basin'
    },
    // Central intersection depression
    {
      id: 'pond-central-junction',
      center: [centerLng, centerLat + scale * 0.18],
      radius: scale * 0.12,
      name: 'Riverdale Junction Pool'
    },
    // North crescent low point
    {
      id: 'pond-north-junction',
      center: [centerLng - scale * 0.2, centerLat + scale * 0.85],
      radius: scale * 0.10,
      name: 'Oakridge Depression'
    },
    // South-West residential cul-de-sac
    {
      id: 'pond-southwest-pool',
      center: [centerLng - scale * 1.6, centerLat - scale * 0.40],
      radius: scale * 0.11,
      name: 'Brookside Cul-de-Sac'
    }
  ];

  const pondFeatures = ponds.map((p) => {
    // Generate circular polygon points for MapLibre
    const numPoints = 24;
    const ring: number[][] = [];
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI;
      const lng = p.center[0] + Math.cos(angle) * p.radius * 1.3;
      const lat = p.center[1] + Math.sin(angle) * p.radius;
      ring.push([lng, lat]);
    }

    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [ring]
      },
      properties: {
        id: p.id,
        name: p.name,
        isBasin: true
      }
    };
  });

  return {
    roads: { type: 'FeatureCollection', features },
    ponds: { type: 'FeatureCollection', features: pondFeatures }
  };
}
