const fs = require('fs');
let code = fs.readFileSync('src/components/MapComponent.tsx', 'utf-8');

// Remove the overlay div
code = code.replace(/\{landslideGeojson && \([\s\S]*?<div className=\{`backdrop-blur px-3 py-2 rounded-md border text-xs font-medium shadow-lg transition-colors flex flex-col gap-1[\s\S]*?<\/div>\s*\)\}/, '');

// Also remove the Landslide Risk from the RISK ZONES legend
code = code.replace(/<div className="flex items-center gap-2"><div className="w-4 h-1 rounded-full bg-purple-500 border border-purple-400 border-dashed" \/> <span className=\{`text-xs font-medium \$\{theme === 'light' \? 'text-slate-700' : 'text-slate-300'\}`\}>Landslide Risk<\/span><\/div>/, '');

// Remove the Seismic Landslide Risk Zones Layer entirely
code = code.replace(/\{\/\* Seismic Landslide Risk Zones \*\/\}\s*\{landslideGeojson && \([\s\S]*?<\/Source>\s*\)\}/, '');

fs.writeFileSync('src/components/MapComponent.tsx', code);
