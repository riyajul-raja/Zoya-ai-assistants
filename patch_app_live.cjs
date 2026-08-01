const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldCall = `        await session.start(requiredMic, isProfessionalMode, environmentContext);`;
const newCall = `        await session.start(requiredMic, isProfessionalMode, environmentContext, messagesRef.current);`;
code = code.replace(oldCall, newCall);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx");
