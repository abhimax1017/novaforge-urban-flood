const fs = require('fs');
const content = fs.readFileSync('src/components/RightPanel.tsx', 'utf-8');

const updated = content.replace(
  /interface RightPanelProps {[\s\S]*?}/,
  `interface RightPanelProps {
  prediction: PredictionData;
  selectedRoad: RoadRisk | null;
  theme: 'light' | 'dark';
  weather?: any;
  weatherLoading?: boolean;
  weatherIsLive?: boolean;
  criticalZones?: { name: string; time: number; depth: number }[];
  activeTab?: string;
  location?: any;
}`
).replace(
  /export default function RightPanel\(\{ prediction, selectedRoad, theme \}: RightPanelProps\) {/,
  `import WeatherPanel from './WeatherPanel';\nimport { CriticalZonesSummary } from './CriticalZonesSummary';\n\nexport default function RightPanel({ prediction, selectedRoad, theme, weather, weatherLoading, weatherIsLive, criticalZones, activeTab, location }: RightPanelProps) {`
);

fs.writeFileSync('src/components/RightPanel.tsx', updated);
