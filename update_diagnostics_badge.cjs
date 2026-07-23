const fs = require('fs');

let content = fs.readFileSync('src/components/DiagnosticsPanel.tsx', 'utf8');

const oldBadgeRegex = /<div className=\{`px-2 py-0\.5 rounded-full text-\[10px\] font-bold tracking-wider uppercase border \$\{[\s\S]*?\}`\}>\s*\{p\.isConfigured \? \(isOnline \? "Online" : "Offline"\) : "Unconfigured"\}\s*<\/div>/;

const newBadgeLogic = `<div className={\`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border \${
                        !p.isConfigured 
                          ? "bg-red-500/20 text-red-300 border-red-500/30" 
                          : p.status === "error"
                            ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      }\`}>
                        {!p.isConfigured ? "OFFLINE" : p.status === "error" ? "DEGRADED" : "ONLINE"}
                      </div>`;

content = content.replace(oldBadgeRegex, newBadgeLogic);

// Wait, we can also just use a cleaner replacement:
fs.writeFileSync('src/components/DiagnosticsPanel.tsx', content);
console.log("Updated DiagnosticsPanel.tsx");
