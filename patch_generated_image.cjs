const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `                            ) : null}
                            {msg.sender === "zoya" && msg.isHighThinking && (`;
const replacement = `                            ) : null}
                            {msg.generatedImageUrl && (
                              <div className="relative group mt-2 mb-2 w-full max-w-sm">
                                <img
                                  src={msg.generatedImageUrl}
                                  alt={msg.generatedImagePrompt || "Generated image"}
                                  className="w-full h-auto rounded-2xl object-cover cursor-pointer shadow-lg border border-white/10"
                                  referrerPolicy="no-referrer"
                                  onClick={() => setLightboxImage(msg.generatedImageUrl!)}
                                />
                                <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadImage(msg.generatedImageUrl!, msg.generatedImagePrompt || "zoya_image");
                                    }}
                                    className="p-2 rounded-xl bg-black/50 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 hover:text-cyan-300 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] cursor-pointer"
                                    title="Download Image"
                                  >
                                    <Download size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRegenerateImage(msg.id, msg.generatedImagePrompt || "");
                                    }}
                                    className="p-2 rounded-xl bg-black/50 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 hover:text-purple-400 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] cursor-pointer"
                                    title="Regenerate Image"
                                  >
                                    <RefreshCw size={14} />
                                  </button>
                                </div>
                              </div>
                            )}
                            {msg.sender === "zoya" && msg.isHighThinking && (`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
