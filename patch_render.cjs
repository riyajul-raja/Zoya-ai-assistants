const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetRender = `{(() => {
                              const imageList = Array.isArray(msg.images) && msg.images.length > 0 ? msg.images : (msg.image ? [msg.image] : ((msg as any).imageUrl ? [(msg as any).imageUrl] : []));
                              if (!imageList || !Array.isArray(imageList) || imageList.length === 0) return null;
                              return (
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {imageList.map((imgSrc, idx) => {
                                    if (!imgSrc || typeof imgSrc !== 'string') return null;
                                    return (
                                      <img
                                        key={idx}
                                        src={imgSrc}
                                        alt={\`Attached \${idx + 1}\`}
                                        className="w-20 h-20 rounded-2xl object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                        referrerPolicy="no-referrer"
                                        onClick={() => setLightboxImage(imgSrc)}
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    );
                                  })}
                                </div>
                              );
                            })()}`;

const replacementRender = `{(() => {
                              try {
                                const imageList = Array.isArray(msg.images) && msg.images.length > 0 ? msg.images : (msg.image ? [msg.image] : ((msg as any).imageUrl ? [(msg as any).imageUrl] : []));
                                if (!imageList || !Array.isArray(imageList) || imageList.length === 0) return null;
                                
                                return (
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    {imageList.map((imgSrc, idx) => {
                                      if (!imgSrc || typeof imgSrc !== 'string') return null;
                                      return (
                                        <div key={idx} className="relative group">
                                          <img
                                            src={imgSrc}
                                            alt={\`Attached \${idx + 1}\`}
                                            className="w-20 h-20 rounded-2xl object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                            referrerPolicy="no-referrer"
                                            onClick={() => setLightboxImage(imgSrc)}
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement;
                                              target.style.display = 'none';
                                              if (target.nextElementSibling) {
                                                (target.nextElementSibling as HTMLElement).style.display = 'flex';
                                              }
                                            }}
                                          />
                                          <div className="hidden absolute inset-0 items-center justify-center bg-white/5 border border-white/10 rounded-2xl">
                                            <ImagePlus size={20} className="text-white/30" />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              } catch (err) {
                                console.error("Error rendering images for message", err);
                                return (
                                  <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-2">
                                    <ImagePlus size={20} className="text-white/30" />
                                  </div>
                                );
                              }
                            })()}`;

code = code.replace(targetRender, replacementRender);
fs.writeFileSync('src/App.tsx', code);
