const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarManager.tsx', 'utf8');

// Remove loadFallbackEvents entirely
const fallbackStart = code.indexOf('const loadFallbackEvents = () => {');
const saveFallbackEnd = code.indexOf('// Initialize Auth & Load');
if (fallbackStart !== -1 && saveFallbackEnd !== -1) {
  code = code.substring(0, fallbackStart) + code.substring(saveFallbackEnd);
}

// Replace calls to loadFallbackEvents with setEvents([])
code = code.replace(/loadFallbackEvents\(\);/g, 'setEvents([]);');
code = code.replace(/loadFallbackEvents/g, 'setEvents([])');

fs.writeFileSync('src/components/CalendarManager.tsx', code);
console.log('Removed fallback events');
