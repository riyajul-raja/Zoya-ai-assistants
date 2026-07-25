import fs from 'fs/promises';

const content = await fs.readFile('src/services/geminiService.ts', 'utf-8');
const noResponse = content.replace(/export async function getZoyaResponse\([\s\S]*?\} catch \(error: any\) \{[\s\S]*?throw error;\n  \}\n\}\n/g, '');
await fs.writeFile('src/services/geminiService.ts', noResponse);
