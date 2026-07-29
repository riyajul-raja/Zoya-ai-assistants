const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const startStr = `                      <button className="flex items-center justify-between p-5 rounded-[20px] hyper-glass transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)] hover:bg-white/[0.05] hover:border-white/20 active:scale-[0.98] hover:-translate-y-0.5 cursor-pointer w-full group text-left">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center hyper-glass border-white/10 text-neutral-400 group-hover:text-white transition-colors shrink-0 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                            <Layers size={22} />`;
const endStr = `About Zoya</span>
                            <span className="text-[12px] text-neutral-400 tracking-wide">Version • Legal • Updates</span>
                          </div>
                        </div>
                        <ChevronRight size={22} className="text-neutral-500 group-hover:text-white transition-colors" />
                      </button>`;

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
    const stringToRemove = content.substring(startIdx, endIdx + endStr.length);
    content = content.replace(stringToRemove, '');
    fs.writeFileSync('src/App.tsx', content);
    console.log('Removed extra settings items.');
} else {
    console.log('Could not find the block to remove.');
}

