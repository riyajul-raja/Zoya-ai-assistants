const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const regexHasImage = /const hasImage = !!\(msg\.images\?\.length \|\| msg\.image \|\| \(msg as any\)\.imageUrl\);/g;
code = code.replace(regexHasImage, "const hasImage = !!((Array.isArray(msg.images) && msg.images.length > 0) || msg.image || (msg as any).imageUrl);");

const oldImageRender = `{(() => {
                              const imageList = msg.images || (msg.image ? [msg.image] : ((msg as any).imageUrl ? [(msg as any).imageUrl] : []));
                              if (imageList.length === 0) return null;
                              return (
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {imageList.map((imgSrc, idx) => (
                                    <img
                                      key={idx}
                                      src={imgSrc}
                                      alt={\`Attached \${idx + 1}\`}
                                      className="w-20 h-20 rounded-2xl object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                      referrerPolicy="no-referrer"
                                      onClick={() => setLightboxImage(imgSrc)}
                                    />
                                  ))}
                                </div>
                              );
                            })()}`;

const newImageRender = `{(() => {
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

code = code.replace(oldImageRender, newImageRender);

fs.writeFileSync('src/App.tsx', code);
