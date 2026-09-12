import { CriticalFacility } from '../types';

export function getCriticalInfrastructure(centerLat: number, centerLng: number): CriticalFacility[] {
  return [
    {
      id: 'FAC-HOSP-01',
      name: 'City Apex Memorial Hospital',
      type: 'hospital',
      lat: centerLat + 0.005,
      lng: centerLng + 0.006,
      elevationM: 528.3,
      thresholdDepthCm: 15,
      currentDepthCm: 4,
      isThreatened: false,
      accessRoad: 'Hospital Link Road'
    },
    {
      id: 'FAC-FIRE-01',
      name: 'Central Fire & Rescue Station #4',
      type: 'fire_station',
      lat: centerLat + 0.002,
      lng: centerLng - 0.006,
      elevationM: 523.5,
      thresholdDepthCm: 20,
      currentDepthCm: 8,
      isThreatened: false,
      accessRoad: 'Civic West Way'
    },
    {
      id: 'FAC-POLICE-01',
      name: 'District Police Headquarters',
      type: 'police',
      lat: centerLat - 0.001,
      lng: centerLng + 0.003,
      elevationM: 521.0,
      thresholdDepthCm: 25,
      currentDepthCm: 12,
      isThreatened: false,
      accessRoad: 'Central Avenue'
    },
    {
      id: 'FAC-SHELTER-01',
      name: 'Civic Multi-Purpose Flood Relief Shelter',
      type: 'shelter',
      lat: centerLat + 0.009,
      lng: centerLng - 0.002,
      elevationM: 542.0,
      thresholdDepthCm: 35,
      currentDepthCm: 0,
      isThreatened: false,
      accessRoad: 'Highland Ridge Corridor'
    },
    {
      id: 'FAC-POWER-01',
      name: 'Valley 132kV Power Grid Substation',
      type: 'power_station',
      lat: centerLat - 0.005,
      lng: centerLng - 0.002,
      elevationM: 513.8, // Low elevation!
      thresholdDepthCm: 25,
      currentDepthCm: 34,
      isThreatened: true,
      accessRoad: 'Underpass Trough Service Road'
    },
    {
      id: 'FAC-TRANSIT-01',
      name: 'Metro Interchange & Bus Terminus',
      type: 'transit_hub',
      lat: centerLat - 0.003,
      lng: centerLng + 0.005,
      elevationM: 515.6,
      thresholdDepthCm: 20,
      currentDepthCm: 28,
      isThreatened: true,
      accessRoad: 'MG Road Concourse'
    },
    {
      id: 'FAC-SCHOOL-01',
      name: 'Model Senior Secondary School',
      type: 'school',
      lat: centerLat + 0.004,
      lng: centerLng - 0.004,
      elevationM: 530.1,
      thresholdDepthCm: 15,
      currentDepthCm: 2,
      isThreatened: false,
      accessRoad: 'Market School Lane'
    }
  ];
}

export function evaluateFacilityThreats(facilities: CriticalFacility[], currentFloodDepthCm: number): {
  updatedFacilities: CriticalFacility[];
  threatAlerts: { facilityName: string; depthCm: number; message: string; severity: 'warning' | 'critical' }[];
} {
  const threatAlerts: { facilityName: string; depthCm: number; message: string; severity: 'warning' | 'critical' }[] = [];

  const updatedFacilities = facilities.map(f => {
    // Relative depth based on elevation gradient
    const elevDelta = 530 - f.elevationM;
    const localDepthCm = Math.max(0, Math.round(currentFloodDepthCm * 0.7 + elevDelta * 1.5));
    const isThreatened = localDepthCm >= f.thresholdDepthCm;

    if (isThreatened) {
      threatAlerts.push({
        facilityName: f.name,
        depthCm: localDepthCm,
        message: `Entrance flooded to ${localDepthCm}cm (Threshold: ${f.thresholdDepthCm}cm). Evacuation or barrier deployment required via ${f.accessRoad}.`,
        severity: localDepthCm >= f.thresholdDepthCm * 1.5 ? 'critical' : 'warning'
      });
    }

    return {
      ...f,
      currentDepthCm: localDepthCm,
      isThreatened
    };
  });

  return { updatedFacilities, threatAlerts };
}

export const CRITICAL_FACILITIES: CriticalFacility[] = getCriticalInfrastructure(12.9716, 77.5946);

export function evaluateInfrastructureThreats(currentFloodDepthCm: number) {
  const { updatedFacilities } = evaluateFacilityThreats(CRITICAL_FACILITIES, currentFloodDepthCm);
  return updatedFacilities.map(f => ({
    facility: f,
    status: f.currentDepthCm >= f.thresholdDepthCm * 1.5 ? 'inundated' : f.isThreatened ? 'threatened' : 'accessible',
    depthCm: f.currentDepthCm
  }));
}
