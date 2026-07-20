const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetRender = `) : msg.image || (msg as any).imageUrl ? (
                              <div className="flex flex-wrap gap-2 mb-2">
                                <div className="relative group">
                                  <img
                                    src={msg.image || (msg as any).imageUrl}
                                    alt="Attached"
                                    className="w-20 h-20 rounded-2xl object-cover cursor-pointer hover:opacity-80 transition-opacity shadow-md"
                                    referrerPolicy="no-referrer"
                                    onClick={() => setLightboxImage(msg.image || (msg as any).imageUrl)}
                                  />
                                </div>
                              </div>
                            ) : null}`;

const replacementRender = `) : (typeof msg.image === 'string' || typeof (msg as any).imageUrl === 'string') ? (
                              <div className="flex flex-wrap gap-2 mb-2">
                                <div className="relative group">
                                  <img
                                    src={typeof msg.image === 'string' ? msg.image : (msg as any).imageUrl}
                                    alt="Attached"
                                    className="w-20 h-20 rounded-2xl object-cover cursor-pointer hover:opacity-80 transition-opacity shadow-md"
                                    referrerPolicy="no-referrer"
                                    onClick={() => setLightboxImage(typeof msg.image === 'string' ? msg.image : (msg as any).imageUrl)}
                                  />
                                </div>
                              </div>
                            ) : null}`;

code = code.replace(targetRender, replacementRender);
fs.writeFileSync('src/App.tsx', code);
