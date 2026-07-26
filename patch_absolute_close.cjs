const fs = require('fs');
let code = fs.readFileSync('src/components/GmailManager.tsx', 'utf8');

const oldButton = `        {/* Absolute Universal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
          title="Close Panel"
        >
          <X size={16} />
        </button>`;

code = code.replace(oldButton, '');

const overlayStart = `<div id="gmail-manager-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in pointer-events-auto">`;

const overlayStartWithButton = `<div id="gmail-manager-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in pointer-events-auto">
      {/* Absolute Universal Close Button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-[9999] p-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
        title="Close Panel"
      >
        <X size={18} />
      </button>`;

code = code.replace(overlayStart, overlayStartWithButton);
fs.writeFileSync('src/components/GmailManager.tsx', code);
console.log('Patched absolute close button');
