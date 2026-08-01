const fs = require('fs');
let content = fs.readFileSync('src/components/ChatSidebar.tsx', 'utf8');

content = content.replace('<Edit3 size={14} /> Rename', '<Edit3 size={14} /> Rename Chat');
content = content.replace('<Pin size={14} /> Pin', '<Pin size={14} /> Pin Chat');
content = content.replace('<PinOff size={14} /> Unpin', '<PinOff size={14} /> Unpin Chat');
content = content.replace('<Share size={14} /> Share', '<Share size={14} /> Share Chat');
content = content.replace('<Trash2 size={14} /> Delete', '<Trash2 size={14} /> Delete Chat');

// Also remove duplicate chat if we really want to strictly follow the current prompt list, but I will leave it as "Duplicate Chat" just in case.
content = content.replace('<Copy size={14} /> Duplicate', '<Copy size={14} /> Duplicate Chat');

// Increase width of the dropdown from w-36 to w-40 to fit the longer text
content = content.replace('className="absolute right-0 top-full mt-1 w-36 bg-neutral-900 border border-white/10 rounded-lg shadow-2xl py-1 z-50 overflow-hidden"', 'className="absolute right-0 top-full mt-1 w-40 bg-neutral-900 border border-white/10 rounded-lg shadow-2xl py-1 z-50 overflow-hidden"');

fs.writeFileSync('src/components/ChatSidebar.tsx', content);
