const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const regexPreview = /\{selectedImageBase64 && \([\s\S]*?<\/button>\n\s*<\/div>\n\s*\)\}/g;

const newPreviewUI = `{selectedImages.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-2 p-2 border border-white/10 rounded-lg bg-black/20 w-fit max-w-full overflow-x-auto">
                  {selectedImages.map((base64, index) => (
                    <div key={index} className="relative shrink-0">
                      <img src={\`data:image/jpeg;base64,\${base64}\`} className="h-16 w-16 object-cover rounded-md border border-white/20" alt={\`Attached \${index + 1}\`} />
                      <button
                        type="button"
                        onClick={() => setSelectedImages((prev) => prev.filter((_, i) => i !== index))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:scale-110 transition-transform shadow-lg"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}`;

code = code.replace(regexPreview, newPreviewUI);

// Also I see setSelectedImageBase64(null) might be hiding elsewhere. Let's find it.
code = code.replace(/setSelectedImageBase64\(null\)/g, "setSelectedImages([])");

fs.writeFileSync('src/App.tsx', code);
