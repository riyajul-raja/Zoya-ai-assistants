const fs = require('fs');
let code = fs.readFileSync('src/components/KeepManager.tsx', 'utf8');

const regexTop = /<div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 relative">[\s\S]*?\{\/\* 2\. COMPOSE NOTE button \(toggles form\) \*\/\}/m;
code = code.replace(regexTop, `<div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 relative">
            <>
              {/* 2. COMPOSE NOTE button (toggles form) */}`);

const regexBottom = /          <\/AnimatePresence>\s*<\/>\s*\)\}\s*<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\}/m;
code = code.replace(regexBottom, `          </AnimatePresence>
            </>
        </div>
      </div>
    </div>
  );
}`);

fs.writeFileSync('src/components/KeepManager.tsx', code);
console.log('Patched KeepManager structure');
