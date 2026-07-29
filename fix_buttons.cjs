const fs = require('fs');
let content = fs.readFileSync('src/components/ChatSidebar.tsx', 'utf8');

const oldBtn = `<button \n                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors cursor-pointer"`;
const newBtn = `<motion.button \n                          whileHover={{ backgroundColor: "rgba(255,255,255,0.06)" }}\n                          whileTap={{ scale: 0.97, backgroundColor: "rgba(255,255,255,0.1)" }}\n                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-white/90 transition-colors cursor-pointer"`;

content = content.replaceAll(oldBtn, newBtn);

const oldRedBtn = `<button \n                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"`;
const newRedBtn = `<motion.button \n                          whileHover={{ backgroundColor: "rgba(239,68,68,0.1)" }}\n                          whileTap={{ scale: 0.97, backgroundColor: "rgba(239,68,68,0.15)" }}\n                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-red-400 transition-colors cursor-pointer"`;

content = content.replaceAll(oldRedBtn, newRedBtn);

content = content.replace(
  `                          <Edit3 size={14} /> Rename Chat
                        </button>`,
  `                          <Edit3 size={16} /> Rename Chat
                        </motion.button>`
);

content = content.replace(
  `                          {chat.pinned ? <><PinOff size={14} /> Unpin Chat</> : <><Pin size={14} /> Pin Chat</>}
                        </button>`,
  `                          {chat.pinned ? <><PinOff size={16} /> Unpin Chat</> : <><Pin size={16} /> Pin Chat</>}
                        </motion.button>`
);

content = content.replace(
  `                          <Copy size={14} /> Duplicate Chat
                        </button>`,
  `                          <Copy size={16} /> Duplicate Chat
                        </motion.button>`
);

content = content.replace(
  `                          <Share size={14} /> Share Chat
                        </button>`,
  `                          <Share size={16} /> Share Chat
                        </motion.button>`
);

content = content.replace(
  `                          <Trash2 size={14} /> Delete Chat
                        </button>`,
  `                          <Trash2 size={16} /> Delete Chat
                        </motion.button>`
);

content = content.replaceAll(
  `<div className="h-px bg-white/10 my-1" />`,
  `<div className="h-px bg-white/5 my-1.5 mx-2" />`
);

fs.writeFileSync('src/components/ChatSidebar.tsx', content);
