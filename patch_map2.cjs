const fs = require('fs');
let code = fs.readFileSync('src/components/MapComponent.tsx', 'utf-8');

code = code.replace(/\/\/ Landslide Risk Zones \(Seismic \+ Rainfall cross-reference\)[\s\S]*?const landslideGeojson = useMemo\(\(\) => \{[\s\S]*?\}\, \[location, currentPrediction\]\);/, '');

fs.writeFileSync('src/components/MapComponent.tsx', code);
