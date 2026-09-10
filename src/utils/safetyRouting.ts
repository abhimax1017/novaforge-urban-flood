import { Location, PredictionData, SafetyRoute, SocietyAlert } from '../types';

// Helper to generate realistic street-grid turns along city road blocks
function generateStreetGridWaypoints(
  start: [number, number], 
  end: [number, number], 
  intermediateBias: 'north-west' | 'east-north' | 'north' | 'west-south' | 'direct'
): [number, number][] {
  const [x1, y1] = start;
  const [x2, y2] = end;
  const dx = x2 - x1;
  const dy = y2 - y1;

  const points: [number, number][] = [[x1, y1]];
  
  if (intermediateBias === 'north-west') {
    points.push([x1, y1 + dy * 0.25]);
    points.push([x1 + dx * 0.35, y1 + dy * 0.25]);
    points.push([x1 + dx * 0.35, y1 + dy * 0.65]);
    points.push([x1 + dx * 0.75, y1 + dy * 0.65]);
    points.push([x1 + dx * 0.75, y1 + dy * 0.90]);
    points.push([x2, y1 + dy * 0.90]);
  } else if (intermediateBias === 'east-north') {
    points.push([x1 + dx * 0.40, y1]);
    points.push([x1 + dx * 0.40, y1 + dy * 0.45]);
    points.push([x1 + dx * 0.80, y1 + dy * 0.45]);
    points.push([x1 + dx * 0.80, y1 + dy * 0.85]);
    points.push([x2, y1 + dy * 0.85]);
  } else if (intermediateBias === 'north') {
    points.push([x1, y1 + dy * 0.35]);
    points.push([x1 + dx * 0.50, y1 + dy * 0.35]);
    points.push([x1 + dx * 0.50, y1 + dy * 0.75]);
    points.push([x2, y1 + dy * 0.75]);
  } else if (intermediateBias === 'west-south') {
    points.push([x1 + dx * 0.30, y1]);
    points.push([x1 + dx * 0.30, y1 + dy * 0.50]);
    points.push([x1 + dx * 0.70, y1 + dy * 0.50]);
    points.push([x1 + dx * 0.70, y1 + dy * 0.85]);
    points.push([x2, y1 + dy * 0.85]);
  } else {
    points.push([x1 + dx * 0.5, y1]);
    points.push([x1 + dx * 0.5, y1 + dy * 0.5]);
    points.push([x2, y1 + dy * 0.5]);
  }

  points.push([x2, y2]);
  return points;
}

export function getSafetyRoutesForLocation(location: Location, prediction: PredictionData): SafetyRoute[] {
  const baseLat = location.lat;
  const baseLng = location.lng;
  const depth = prediction?.maxDepthCm || 20;
  const timeOffset = prediction?.timeOffsetMin || 0;

  // Destination coords for higher ground shelters / interchanges
  const ridgeDestLng = baseLng - 0.022;
  const ridgeDestLat = baseLat + 0.028;

  const flyoverDestLng = baseLng + 0.025;
  const flyoverDestLat = baseLat + 0.022;

  const shelterDestLng = baseLng + 0.015;
  const shelterDestLat = baseLat + 0.032;

  const perimeterDestLng = baseLng - 0.028;
  const perimeterDestLat = baseLat - 0.018;

  const blockedDestLng = baseLng + 0.018;
  const blockedDestLat = baseLat + 0.018;

  const locShort = location.name.split(',')[0].trim();

  return [
    {
      id: 'route-ridge',
      name: `${locShort} Elevated Ridge Highway`,
      tag: 'primary',
      safetyRating: '100% Safe (Grade A+)',
      safetyScore: 99,
      isRecommended: true,
      distanceKm: 3.4,
      etaMin: 9,
      elevationGainM: 24,
      clearanceHeightM: 1.8,
      destinationName: `${locShort} High Ridge Interchange`,
      destCoords: [ridgeDestLng, ridgeDestLat],
      waypoints: generateStreetGridWaypoints([baseLng, baseLat], [ridgeDestLng, ridgeDestLat], 'north-west'),
      description: 'Follows continuous natural ridge crest. 0% flood pooling predicted across 3-hour storm horizon.',
      avoidedHazards: [
        'Bypasses Submerged Underpass (-1.4m depression)',
        'Avoids open drain overflow at Sector Market',
        'Completely elevated above storm runoff catchment'
      ],
      turnSteps: [
        `Exit community gate via North Elevated Avenue`,
        `Take Ridge Road ascending +18m gradient at Km 1.1`,
        `Proceed unobstructed along the watershed divide to High Ridge Interchange`
      ]
    },
    {
      id: 'route-flyover',
      name: `${locShort} Express Flyover Bypass`,
      tag: 'bypass',
      safetyRating: '95% Safe (Grade A)',
      safetyScore: 94,
      isRecommended: false,
      distanceKm: 2.8,
      etaMin: 7,
      elevationGainM: 16,
      clearanceHeightM: 1.2,
      destinationName: `${locShort} Northern Elevated Ring`,
      destCoords: [flyoverDestLng, flyoverDestLat],
      waypoints: generateStreetGridWaypoints([baseLng, baseLat], [flyoverDestLng, flyoverDestLat], 'east-north'),
      description: 'Grade-separated elevated viaduct avoiding ground-level intersections and street-level ponding.',
      avoidedHazards: [
        'Elevated 5.5m above ground flash-flood level',
        'Avoids 4 ground traffic signal choke points',
        'Equipped with active drainage scuppers'
      ],
      turnSteps: [
        `Merge onto East Flyover Ramp immediately after Community Roundabout`,
        `Maintain steady speed on upper viaduct corridor for 2.2 km`,
        `Disembark onto Northern Ring Road high ground junction`
      ]
    },
    {
      id: 'route-shelter',
      name: `${locShort} Community Shelter & Relief Corridor`,
      tag: 'shelter',
      safetyRating: '100% Safe (Pedestrian & Family Evacuation)',
      safetyScore: 98,
      isRecommended: false,
      distanceKm: 1.6,
      etaMin: 18, // Walking / emergency shuttle
      elevationGainM: 29,
      clearanceHeightM: 2.2,
      destinationName: `${locShort} Municipal Civic Center & Relief Shelter`,
      destCoords: [shelterDestLng, shelterDestLat],
      waypoints: generateStreetGridWaypoints([baseLng, baseLat], [shelterDestLng, shelterDestLat], 'north'),
      description: 'Designated disaster assembly corridor equipped with emergency flood barriers, solar lighting, and medical triage.',
      avoidedHazards: [
        'Dedicated protected walkway above curb line',
        'No open manholes or submerged transformers on path',
        'Emergency volunteer station at Km 0.8'
      ],
      shelterCapacity: 2400,
      turnSteps: [
        `Follow green illuminated muster signs along Main Colony Road`,
        `Cross footbridge over drainage channel into Civic Park`,
        `Enter Municipal Stadium Emergency Shelter (Command Desk Gate 2)`
      ]
    },
    {
      id: 'route-perimeter',
      name: `${locShort} Outer Perimeter Drainage-Free Arterial`,
      tag: 'perimeter',
      safetyRating: '90% Safe (Grade B+)',
      safetyScore: 89,
      isRecommended: false,
      distanceKm: 4.2,
      etaMin: 12,
      elevationGainM: 14,
      clearanceHeightM: 0.8,
      destinationName: `${locShort} Outer Bypass Circle`,
      destCoords: [perimeterDestLng, perimeterDestLat],
      waypoints: generateStreetGridWaypoints([baseLng, baseLat], [perimeterDestLng, perimeterDestLat], 'west-south'),
      description: 'Secondary wide arterial on outer perimeter designed for heavy vehicles, buses, and commercial transport.',
      avoidedHazards: [
        'Bypasses narrow residential bottlenecks',
        'Direct connection to intercity national highway'
      ],
      turnSteps: [
        `Turn West onto Outer Ring Service Corridor`,
        `Follow drainage culvert diversion berm for 3 km`,
        `Connect to intercity elevated expressway`
      ]
    },
    {
      id: 'route-standard-blocked',
      name: `Direct Central Boulevard (IMPASSABLE)`,
      tag: 'standard_blocked',
      safetyRating: 'DANGER - 0% Safe',
      safetyScore: 8,
      isRecommended: false,
      distanceKm: 2.1,
      etaMin: 25,
      elevationGainM: -8, // Depression
      clearanceHeightM: -0.6,
      destinationName: `${locShort} Central Junction (FLOODED)`,
      destCoords: [blockedDestLng, blockedDestLat],
      waypoints: generateStreetGridWaypoints([baseLng, baseLat], [blockedDestLng, blockedDestLat], 'direct'),
      description: `CRITICAL HAZARD: Traverses lowest topographical depression with projected ${depth}cm standing water and submerged open drains.`,
      avoidedHazards: [
        'STALLED VEHICLE RISK: Depth exceeds air intake threshold (25cm)',
        'ELECTRICAL SHOCK HAZARD: Substation overflow at low point',
        'FORCE OF CURRENT: Moving storm runoff exceeding 1.2 m/s'
      ],
      turnSteps: [
        `DO NOT ENTER: Road blocked by emergency hazard warning`,
        `Submerged underpass impassable for standard passenger vehicles`
      ]
    }
  ];
}

export function getSocietyAlertForLocation(location: Location, prediction: PredictionData): SocietyAlert {
  const depth = prediction?.maxDepthCm || 10;
  const rainfall = prediction?.rainfallIntensityMm || 15;
  const timeOffset = prediction?.timeOffsetMin || 0;
  const locShort = location.name.split(',')[0].trim();

  let alertLevel: SocietyAlert['alertLevel'] = 'NORMAL';
  let riskScore = 20;

  if (depth >= 40 || rainfall >= 45 || timeOffset >= 120) {
    alertLevel = 'CRITICAL_ALARM';
    riskScore = 96;
  } else if (depth >= 20 || rainfall >= 25 || timeOffset >= 60) {
    alertLevel = 'WARNING';
    riskScore = 78;
  } else if (depth >= 10 || rainfall >= 15) {
    alertLevel = 'ADVISORY';
    riskScore = 52;
  }

  const households = 1250 + Math.floor((Math.abs(location.lat * location.lng * 100) % 950));

  return {
    societyName: `${locShort} Residents Welfare & Community Society`,
    colonySector: `Sector 4, ${locShort} Disaster Management Zone`,
    alertLevel,
    riskScore,
    estimatedInundationTimeMin: Math.max(10, 150 - timeOffset),
    projectedDepthCm: depth,
    sirenSounding: alertLevel === 'CRITICAL_ALARM',
    evacuationRecommended: alertLevel === 'CRITICAL_ALARM' || alertLevel === 'WARNING',
    householdsCovered: households,
    safeShelterName: `${locShort} Municipal Civic Center & Emergency Shelter`,
    shelterDistance: '1.6 km (Route 3)',
    urgentInstructions: [
      `Move ground-floor assets and electronic appliances above 1 meter.`,
      `Relocate vehicles from basement parking to Elevated Ridge Highway (Route 1).`,
      `Switch off main ground-floor electrical circuit breakers to prevent electrocution.`,
      `Follow designated green safety routes to ${locShort} Civic Center if evacuation siren sounds.`,
      `Check on senior citizens, children, and pet animals in Ground Floor flats.`
    ],
    emergencyContacts: [
      { role: 'Society Control Room', phone: '+91 98765 43210' },
      { role: 'Disaster Relief Hotline', phone: '1077 (Toll-Free)' },
      { role: 'Fire & Rescue Emergency', phone: '101' },
      { role: 'Community Ambulance Desk', phone: '108' }
    ]
  };
}
