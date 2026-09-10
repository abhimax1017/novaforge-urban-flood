const fs = require('fs');
let content = fs.readFileSync('src/components/RightPanel.tsx', 'utf-8');

const injection = `
      {activeTab === 'impact' && (
        <ImpactTab prediction={prediction} theme={theme} />
      )}
      <div className="p-5 flex-1 flex flex-col">`;

content = content.replace(/<div className="p-5 flex-1 flex flex-col">/, injection);

fs.writeFileSync('src/components/RightPanel.tsx', content);
