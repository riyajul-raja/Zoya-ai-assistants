const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add state variable
const targetState = `  const [isSyncing, setIsSyncing] = useState(false);`;
const replacementState = `  const [isSyncing, setIsSyncing] = useState(false);\n  const [isUpdating, setIsUpdating] = useState(false);`;
code = code.replace(targetState, replacementState);

// 2. Update checkForUpdates
const targetCheck = `            localStorage.setItem('justUpdated', 'true');
            localStorage.setItem('appVersionHeader', etag);
            window.location.reload();`;
const replacementCheck = `            localStorage.setItem('justUpdated', 'true');
            localStorage.setItem('appVersionHeader', etag);
            setIsUpdating(true);
            setTimeout(() => {
              window.location.reload();
            }, 2500);`;
code = code.replace(targetCheck, replacementCheck);

// 3. Update Sync Button
const targetSync = `            onClick={() => {
              setIsSyncing(true);
              setTimeout(() => {
                window.location.reload();
              }, 500);
            }}`;
const replacementSync = `            onClick={() => {
              setIsSyncing(true);
              setIsUpdating(true);
              setTimeout(() => {
                window.location.reload();
              }, 2500);
            }}`;
code = code.replace(targetSync, replacementSync);

// 4. Render Overlay
const targetRender = `  return (
    <div className="fixed top-0 left-0 w-[100vw] h-[100dvh] m-0 p-0 overflow-hidden bg-[#050505] text-white flex flex-col items-center justify-between font-sans bg-[length:400%_400%]">`;
const replacementRender = `  return (
    <div className="fixed top-0 left-0 w-[100vw] h-[100dvh] m-0 p-0 overflow-hidden bg-[#050505] text-white flex flex-col items-center justify-between font-sans bg-[length:400%_400%]">
      {isUpdating && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="relative w-32 h-32 flex items-center justify-center rounded-full animate-pulse border-4 border-purple-500/50 shadow-[0_0_40px_rgba(168,85,247,0.4)]">
            <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-xl"></div>
            <span className="text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-fuchsia-300 drop-shadow-[0_0_15px_rgba(192,132,252,0.8)] z-10">Z</span>
          </div>
          <p className="mt-8 text-sm font-mono tracking-widest text-purple-200/70 animate-pulse">
            Updating Zoya. Please wait...
          </p>
        </div>
      )}`;
code = code.replace(targetRender, replacementRender);

fs.writeFileSync('src/App.tsx', code);
