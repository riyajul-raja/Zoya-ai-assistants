const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `                  <button
                    type="button"
                    onClick={() => {
                      if (textInput.trim() || selectedImages.length > 0) {
                        handleTextSubmit({ preventDefault: () => {} } as React.FormEvent);
                      }
                    }}
                    disabled={!textInput.trim() && selectedImages.length === 0}
                    className="p-1.5 rounded-md bg-white text-black hover:bg-white/90 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Send message"
                  >
                    <Send size={13} className="ml-0.5" />
                  </button>
                </div>
              </div>`;

const replacement = `                  <button
                    type="button"
                    onClick={() => {
                      if (textInput.trim() || selectedImages.length > 0) {
                        handleTextSubmit({ preventDefault: () => {} } as React.FormEvent);
                      }
                    }}
                    disabled={!textInput.trim() && selectedImages.length === 0}
                    className="p-1.5 rounded-md bg-white text-black hover:bg-white/90 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Send message"
                  >
                    <Send size={13} className="ml-0.5" />
                  </button>
                </div>
              </div>
              )}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
