const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldUI = `              {/* Compact Input Bar */}
              <div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-white/10 shrink-0">
                <textarea`;

const newUI = `              {/* Image Preview */}
              {selectedImageBase64 && (
                <div className="relative mt-2 p-2 border border-white/10 rounded-lg bg-black/20 w-fit">
                  <img src={\`data:image/jpeg;base64,\${selectedImageBase64}\`} className="h-16 w-16 object-cover rounded-md" alt="Attached" />
                  <button
                    type="button"
                    onClick={() => setSelectedImageBase64(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:scale-110 transition-transform shadow-lg"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}
              {/* Compact Input Bar */}
              <div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-white/10 shrink-0">
                <textarea`;

code = code.replace(oldUI, newUI);

const oldButtons = `                <div className="flex items-center gap-1 shrink-0">
                  <button`;

const newButtons = `                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-all duration-300 cursor-pointer"
                    title="Attach Image"
                  >
                    <ImagePlus size={13} />
                  </button>
                  <button`;

code = code.replace(oldButtons, newButtons);

const oldSubmitBtn = `                  <button 
                    type="submit"
                    disabled={!textInput.trim()}`;

const newSubmitBtn = `                  <button 
                    type="submit"
                    disabled={!textInput.trim() && !selectedImageBase64}`;
                    
code = code.replace(oldSubmitBtn, newSubmitBtn);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched UI");
