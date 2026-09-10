export type RainfallRiskLevel = 'Safe' | 'Watch' | 'Warning' | 'High Risk' | 'Critical';

export interface RainfallRiskInfo {
  level: RainfallRiskLevel;
  emoji: string;
  rangeText: string;
  rainfallCm: number;
  rainfallMm: number;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  description: string;
  actionGuidance: string;
}

export interface RainfallTableRow {
  range: string;
  minCm: number;
  maxCm: number;
  level: RainfallRiskLevel;
  emoji: string;
  color: string;
  borderActive: string;
  bgLightActive: string;
  bgDarkActive: string;
  action: string;
}

export const RAINFALL_RISK_MATRIX: RainfallTableRow[] = [
  {
    range: '0–1.5 cm',
    minCm: 0,
    maxCm: 1.5,
    level: 'Safe',
    emoji: '🟢',
    color: 'text-emerald-600 dark:text-emerald-400',
    borderActive: 'border-emerald-500 dark:border-emerald-500',
    bgLightActive: 'bg-emerald-50/90 text-emerald-950',
    bgDarkActive: 'bg-emerald-950/60 text-emerald-100',
    action: 'Normal conditions. Safe for travel.'
  },
  {
    range: '1.5–3 cm',
    minCm: 1.5,
    maxCm: 3.0,
    level: 'Watch',
    emoji: '🟡',
    color: 'text-yellow-600 dark:text-yellow-400',
    borderActive: 'border-yellow-500 dark:border-yellow-500',
    bgLightActive: 'bg-yellow-50/90 text-yellow-950',
    bgDarkActive: 'bg-yellow-950/60 text-yellow-100',
    action: 'Minor puddling in dips. Monitor alerts.'
  },
  {
    range: '3–5 cm',
    minCm: 3.0,
    maxCm: 5.0,
    level: 'Warning',
    emoji: '🟠',
    color: 'text-orange-600 dark:text-orange-400',
    borderActive: 'border-orange-500 dark:border-orange-500',
    bgLightActive: 'bg-orange-50/90 text-orange-950',
    bgDarkActive: 'bg-orange-950/60 text-orange-100',
    action: 'Drain surcharge. Avoid underpasses.'
  },
  {
    range: '5–10 cm',
    minCm: 5.0,
    maxCm: 10.0,
    level: 'High Risk',
    emoji: '🔴',
    color: 'text-red-600 dark:text-red-400',
    borderActive: 'border-red-500 dark:border-red-500',
    bgLightActive: 'bg-red-50/90 text-red-950',
    bgDarkActive: 'bg-red-950/60 text-red-100',
    action: 'Rapid street submergence. Halt transit.'
  },
  {
    range: '>10 cm',
    minCm: 10.0,
    maxCm: Infinity,
    level: 'Critical',
    emoji: '🚨',
    color: 'text-rose-600 dark:text-rose-400',
    borderActive: 'border-rose-500 dark:border-rose-500',
    bgLightActive: 'bg-rose-50/90 text-rose-950',
    bgDarkActive: 'bg-rose-950/60 text-rose-100',
    action: 'Extreme deluge! Immediate high-ground evacuation.'
  }
];

export function getRainfallRisk(rainfallIntensityMm: number): RainfallRiskInfo {
  // Convert mm/hr to cm in 1 hour (1 cm = 10 mm)
  const rainfallCm = Math.max(0, rainfallIntensityMm / 10);

  if (rainfallCm <= 1.5) {
    return {
      level: 'Safe',
      emoji: '🟢',
      rangeText: '0–1.5 cm',
      rainfallCm,
      rainfallMm: rainfallIntensityMm,
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      badgeText: 'text-emerald-700 dark:text-emerald-300',
      badgeBorder: 'border-emerald-300 dark:border-emerald-700',
      dotColor: 'bg-emerald-500',
      description: 'Normal rainfall. Low localized runoff; municipal drains flow freely.',
      actionGuidance: 'Safe for normal travel and vehicular transit.'
    };
  } else if (rainfallCm <= 3.0) {
    return {
      level: 'Watch',
      emoji: '🟡',
      rangeText: '1.5–3 cm',
      rainfallCm,
      rainfallMm: rainfallIntensityMm,
      badgeBg: 'bg-yellow-50 dark:bg-yellow-950/40',
      badgeText: 'text-yellow-700 dark:text-yellow-300',
      badgeBorder: 'border-yellow-300 dark:border-yellow-700',
      dotColor: 'bg-yellow-500',
      description: 'Moderate downpour. Minor puddling in low-lying depressions.',
      actionGuidance: 'Monitor local weather alerts; drive cautiously on low-lying stretches.'
    };
  } else if (rainfallCm <= 5.0) {
    return {
      level: 'Warning',
      emoji: '🟠',
      rangeText: '3–5 cm',
      rainfallCm,
      rainfallMm: rainfallIntensityMm,
      badgeBg: 'bg-orange-50 dark:bg-orange-950/40',
      badgeText: 'text-orange-700 dark:text-orange-300',
      badgeBorder: 'border-orange-300 dark:border-orange-700',
      dotColor: 'bg-orange-500',
      description: 'Heavy precipitation. Stormwater drain surcharges and road ponding expected.',
      actionGuidance: 'Avoid underpasses; move sensitive ground equipment to elevated spaces.'
    };
  } else if (rainfallCm <= 10.0) {
    return {
      level: 'High Risk',
      emoji: '🔴',
      rangeText: '5–10 cm',
      rainfallCm,
      rainfallMm: rainfallIntensityMm,
      badgeBg: 'bg-red-50 dark:bg-red-950/40',
      badgeText: 'text-red-700 dark:text-red-300',
      badgeBorder: 'border-red-300 dark:border-red-700',
      dotColor: 'bg-red-500',
      description: 'Very heavy cloudburst. Flash flooding, sewer backflow, and deep street submergence.',
      actionGuidance: 'Halt non-essential transit; avoid flooded arterial corridors.'
    };
  } else {
    return {
      level: 'Critical',
      emoji: '🚨',
      rangeText: '>10 cm',
      rainfallCm,
      rainfallMm: rainfallIntensityMm,
      badgeBg: 'bg-rose-100 dark:bg-rose-950/60',
      badgeText: 'text-rose-800 dark:text-rose-200',
      badgeBorder: 'border-rose-400 dark:border-rose-600',
      dotColor: 'bg-rose-600 animate-pulse',
      description: 'Extreme torrential deluge. Severe catastrophic flash inundation.',
      actionGuidance: 'Immediate evacuation alert; take shelter on upper floors or designated centers.'
    };
  }
}
