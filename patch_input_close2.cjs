const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `                  <button 
                    type="submit"
                    disabled={!textInput.trim() && selectedImages.length === 0}
                    className={\`p-1.5 rounded-md disabled:opacity-50 transition-all duration-300 cursor-pointer \${
                      isGhostMode
                        ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:from-red-500/30 disabled:to-rose-600/30 text-white"
                        : "bg-red-600 hover:bg-red-500 disabled:bg-neutral-800 disabled:text-white/30 text-white"
                    }\`}
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>`;

const replacement = `                  <button 
                    type="submit"
                    disabled={!textInput.trim() && selectedImages.length === 0}
                    className={\`p-1.5 rounded-md disabled:opacity-50 transition-all duration-300 cursor-pointer \${
                      isGhostMode
                        ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:from-red-500/30 disabled:to-rose-600/30 text-white"
                        : "bg-red-600 hover:bg-red-500 disabled:bg-neutral-800 disabled:text-white/30 text-white"
                    }\`}
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>
              )}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
