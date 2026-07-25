import fs from 'fs/promises';

const content = await fs.readFile('src/components/DiagnosticsPanel.tsx', 'utf-8');

const updated = content.replace(/import\("\.\.\/utils\/envHelper"\)\.then\(m => \{[\s\S]*?diagnosticsStore\.setAllConfigured\(!!clientEnv\.gemini\);\s*\}\);\s*\}\)\.catch\(e => console\.error\(e\)\);/g, `import("../utils/envHelper").then(m => m.getClientEnv()).then(clientEnv => {
      fetch("/api/config")
        .then(res => res.json())
        .then(config => {
          diagnosticsStore.setAllConfigured(!!(config.gemini || clientEnv.gemini));
        })
        .catch(err => {
          console.error("Failed to fetch diagnostics config:", err);
          diagnosticsStore.setAllConfigured(!!clientEnv.gemini);
        });
    }).catch(e => console.error(e));`);

await fs.writeFile('src/components/DiagnosticsPanel.tsx', updated);
