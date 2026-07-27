const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldModal = `{showPermissionModal && (
              <PermissionModal 
                onClose={() => setShowPermissionModal(false)} 
              />
            )}`;

const newModal = `{showPermissionModal && (
              <PermissionModal 
                onClose={() => setShowPermissionModal(false)} 
              />
            )}
            
            {lightboxImage && (
              <div 
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all"
                onClick={() => setLightboxImage(null)}
              >
                <div className="relative w-full h-full p-6 md:p-12 flex flex-col items-center justify-center">
                  <button 
                    className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50 backdrop-blur-md"
                    onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
                  >
                    <X size={24} />
                  </button>
                  <img src={lightboxImage} className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl border border-white/10" alt="Lightbox" />
                </div>
              </div>
            )}`;

code = code.replace(oldModal, newModal);

fs.writeFileSync('src/App.tsx', code);
