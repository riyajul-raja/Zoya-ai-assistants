const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-all duration-300 cursor-pointer"
                    title="Attach Image"
                  >
                    <ImagePlus size={13} />
                  </button>`;

const replacement = `                  <button
                    type="button"
                    onClick={() => setIsPlusMenuOpen(true)}
                    className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-all duration-300 cursor-pointer"
                    title="Media Options"
                  >
                    <Plus size={13} />
                  </button>`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
