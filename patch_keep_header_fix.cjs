const fs = require('fs');
let code = fs.readFileSync('src/components/KeepManager.tsx', 'utf8');

const oldStr = `            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
            title="Close Panel"
          >
            <X size={16} />
          </button>
        </div>`;

const newStr = `            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
            title="Close Panel"
          >
            <X size={16} />
          </button>
          </div>
        </div>`;

code = code.replace(oldStr, newStr);
fs.writeFileSync('src/components/KeepManager.tsx', code);
console.log("Fixed KeepManager header div");
