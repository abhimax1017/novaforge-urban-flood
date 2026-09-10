const fs = require('fs');
let code = fs.readFileSync('src/components/MapComponent.tsx', 'utf-8');

const importReplacement = `import React, { useState, useMemo } from 'react';
import Map, { Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { TriangleAlert, CloudRain, ShieldAlert, Minimize2, Maximize2 } from 'lucide-react';`;

code = code.replace(/import React, \{ useMemo \} from 'react';\nimport Map, \{ Source, Layer \} from 'react-map-gl\/maplibre';\nimport 'maplibre-gl\/dist\/maplibre-gl\.css';\nimport \{ TriangleAlert, CloudRain, ShieldAlert \} from 'lucide-react';/, importReplacement);

// Add state for legend
code = code.replace(/export default function MapComponent\(\{.*?\}\) \{/, match => match + '\n  const [isLegendMinimized, setIsLegendMinimized] = useState(false);');

// Replace the legend div
const legendRegex = /<div className=\{`absolute bottom-6 right-12 backdrop-blur p-3 rounded-lg border shadow-md transition-colors z-10 pointer-events-none \$\{theme === 'light' \? 'bg-white\/95 border-slate-200' : 'bg-slate-900\/90 border-slate-700'\}`\}>[\s\S]*?<\/div>\n      <\/div>/;

const newLegend = `
      <div className={\`absolute bottom-6 right-12 backdrop-blur rounded-lg border shadow-md transition-colors z-10 \${theme === 'light' ? 'bg-white/95 border-slate-200' : 'bg-slate-900/90 border-slate-700'}\`}>
        {isLegendMinimized ? (
          <div 
            className="px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
            onClick={() => setIsLegendMinimized(false)}
          >
            <div className={\`text-[10px] font-bold tracking-wider \${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}\`}>RISK ZONES</div>
            <Maximize2 className={\`w-3.5 h-3.5 \${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}\`} />
          </div>
        ) : (
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className={\`text-[10px] font-bold tracking-wider \${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}\`}>RISK ZONES</div>
              <button 
                onClick={() => setIsLegendMinimized(true)}
                className={\`p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 \${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}\`}
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex flex-col gap-1.5 pointer-events-none">
              <div className="flex items-center gap-2"><div className="w-4 h-1 rounded-full bg-red-600" /> <span className={\`text-xs font-medium \${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}\`}>Critical Flood</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-1 rounded-full bg-orange-500" /> <span className={\`text-xs font-medium \${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}\`}>Severe Flood</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-1 rounded-full bg-yellow-400" /> <span className={\`text-xs font-medium \${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}\`}>Moderate Flood</span></div>
            </div>
          </div>
        )}
      </div>`;

code = code.replace(legendRegex, newLegend);

// Also remove the seismic comment
code = code.replace(/\{\/\* Seismic Landslide Risk Zones \*\/\}/g, '');

fs.writeFileSync('src/components/MapComponent.tsx', code);
