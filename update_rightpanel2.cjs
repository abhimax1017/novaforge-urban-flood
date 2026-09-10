const fs = require('fs');
let content = fs.readFileSync('src/components/RightPanel.tsx', 'utf-8');

const injection = `
      {['overview', 'sensors'].includes(activeTab || 'overview') && weather && (
        <WeatherPanel location={location!} theme={theme} weather={weather} loading={!!weatherLoading} isLive={!!weatherIsLive} />
      )}
      {activeTab === 'overview' && criticalZones && criticalZones.length > 0 && (
        <CriticalZonesSummary zones={criticalZones} theme={theme} />
      )}
      <div className="p-5 flex-1 flex flex-col">`;

content = content.replace(/<div className="p-5 flex-1 flex flex-col">/, injection);

fs.writeFileSync('src/components/RightPanel.tsx', content);
