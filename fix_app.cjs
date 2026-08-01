const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace('      {/* Cinematic Background Gradients */}', '      {!showChat && (<>\n      {/* Cinematic Background Gradients */}');
content = content.replace('      {/* Integrated Chat History & Input Panel */}', '      </>)}\n\n      {/* Integrated Chat History & Input Panel */}');

content = content.replace('      {/* Controls */}\n      <footer', '      {/* Controls */}\n      {!showChat && (\n      <footer');
content = content.replace('      </footer>\n      {/* Hidden video element for 3D Globe Picture-in-Picture */}', '      </footer>\n      )}\n      {/* Hidden video element for 3D Globe Picture-in-Picture */}');

fs.writeFileSync('src/App.tsx', content);
