const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const regexHasImage = /const hasImage = !!\(msg\.image \|\| \(msg as any\)\.imageUrl\);/g;
code = code.replace(regexHasImage, "const hasImage = !!(msg.images?.length || msg.image || (msg as any).imageUrl);");

const oldImageRender = `                            {(msg.image || (msg as any).imageUrl) && (
                              <img 
                                src={msg.image || (msg as any).imageUrl} 
                                alt="Camera snap" 
                                className="max-w-[120px] max-h-[80px] rounded-lg mb-1 border border-white/20 object-cover shadow h-fit w-fit min-h-0"
                                referrerPolicy="no-referrer"
                              />
                            )}`;

const newImageRender = `                            {(() => {
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

code = code.replace(oldImageRender, newImageRender);

fs.writeFileSync('src/App.tsx', code);
