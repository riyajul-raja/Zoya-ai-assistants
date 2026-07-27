const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarManager.tsx', 'utf8');

const oldSidebar = `        {/* Left Side: Navigation Drawer and User Profile */}
        <div className="w-full md:w-[240px] border-r border-white/10 shrink-0 bg-white/2 flex flex-col justify-between h-full overflow-hidden">
          <div className="p-5 space-y-6 flex flex-col flex-1 min-h-0">`;

const newSidebar = `        {/* Left Side: Navigation Drawer and User Profile */}
        <div className="w-full md:w-[240px] border-b md:border-b-0 md:border-r border-white/10 shrink-0 bg-white/2 flex flex-col justify-between max-h-[35vh] md:max-h-full md:h-full overflow-hidden hidden md:flex">
          <div className="p-5 space-y-6 flex flex-col flex-1 min-h-0">`;

code = code.replace(oldSidebar, newSidebar);

fs.writeFileSync('src/components/CalendarManager.tsx', code);
console.log("Patched Left Sidebar Mobile Wrapper");
