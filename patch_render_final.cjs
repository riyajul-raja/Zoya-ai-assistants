const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /\{Array\.isArray\(msg\.images\).*?:\s*null\}/s;

const replacementRender = `{Array.isArray(msg.images) && msg.images.length > 0 ? (
                              <div className="flex flex-wrap gap-2 mb-2">
                                {msg.images.map((img, i) => (
                                  typeof img === 'string' ? (
                                    <img
                                      key={i}
                                      src={img}
                                      alt={\`Attached \${i + 1}\`}
                                      className="w-20 h-20 rounded-2xl object-cover cursor-pointer hover:opacity-80 transition-opacity shadow-md"
                                      referrerPolicy="no-referrer"
                                      onClick={() => setLightboxImage(img)}
                                    />
                                  ) : null
                                ))}
                              </div>
                            ) : (typeof msg.image === 'string' || typeof (msg as any).imageUrl === 'string') ? (
                              <div className="flex flex-wrap gap-2 mb-2">
                                <img
                                  src={typeof msg.image === 'string' ? msg.image : (msg as any).imageUrl}
                                  alt="Attached"
                                  className="w-20 h-20 rounded-2xl object-cover cursor-pointer hover:opacity-80 transition-opacity shadow-md"
                                  referrerPolicy="no-referrer"
                                  onClick={() => setLightboxImage(typeof msg.image === 'string' ? msg.image : (msg as any).imageUrl)}
                                />
                              </div>
                            ) : null}`;

code = code.replace(regex, replacementRender);
fs.writeFileSync('src/App.tsx', code);
