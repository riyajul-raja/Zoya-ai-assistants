import fs from 'fs/promises';

const content = `
export const getClientEnv = async () => {
    try {
        const res = await fetch('/api/config');
        if (res.ok) {
            const data = await res.json();
            return data;
        }
    } catch(e) {
        console.error("Failed to fetch client env", e);
    }
    return { gemini: true }; // default assumption
};
`;
await fs.writeFile('src/utils/envHelper.ts', content);

const appContent = await fs.readFile('src/App.tsx', 'utf-8');
const updatedApp = appContent.replace(/const env = getClientEnv\(\);/g, 'getClientEnv().then(env => {\n      diagnosticsStore.setConfigured("gemini-2.5-flash", env.gemini);\n    });');
await fs.writeFile('src/App.tsx', updatedApp);
