const fs = require('fs');
let code = fs.readFileSync('src/components/TimelineSlider.tsx', 'utf-8');

code = code.replace(
  /import \{ Play, Pause \} from 'lucide-react';/,
  `import { Play, Pause, Minimize2, Maximize2 } from 'lucide-react';\nimport { useState } from 'react';`
);

const isMinimizedCode = `
  const [isMinimized, setIsMinimized] = useState(false);

  if (isMinimized) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className={cn(
          "mx-auto backdrop-blur-md rounded-full p-2 pr-4 flex items-center gap-3 shadow-2xl transition-colors border cursor-pointer hover:scale-105",
          theme === 'light' ? "bg-white/90 border-slate-200" : "bg-slate-900/80 border-slate-700/50"
        )}
        style={{ width: 'fit-content' }}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
          className="w-10 h-10 flex-shrink-0 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/30"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
        </button>
        <div className="flex flex-col justify-center">
           <div className={cn("text-[9px] font-bold uppercase", theme === 'light' ? 'text-slate-500' : 'text-slate-400')}>Timeline</div>
           <div className={cn("text-sm font-bold font-mono tracking-tight", timeOffsetMin > 120 ? (theme === 'light' ? "text-red-600" : "text-red-400") : timeOffsetMin > 60 ? (theme === 'light' ? "text-orange-600" : "text-orange-400") : (theme === 'light' ? "text-blue-600" : "text-blue-400"))}>
             {timeOffsetMin === 0 ? 'LIVE' : \`+\${timeOffsetMin} MIN\`}
           </div>
        </div>
        <Maximize2 className={cn("w-4 h-4 ml-2 opacity-50", theme === 'light' ? "text-slate-500" : "text-slate-400")} />
      </div>
    );
  }
`;

code = code.replace(/export default function TimelineSlider\([^)]+\) \{/, match => match + isMinimizedCode);

// Add the Minimize button to the full version
code = code.replace(
  /        <\/div>\n      <\/div>\n    <\/div>\n  \);\n\}/,
  `        </div>\n      </div>\n      <button onClick={() => setIsMinimized(true)} className={cn("ml-2 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors", theme === 'light' ? "text-slate-400" : "text-slate-500")}>\n        <Minimize2 className="w-4 h-4" />\n      </button>\n    </div>\n  );\n}`
);

fs.writeFileSync('src/components/TimelineSlider.tsx', code);
