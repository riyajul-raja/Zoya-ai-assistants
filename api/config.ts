import { getGeminiKey } from "./envHelper";

export default async function handler(req: any, res: any) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const config = {
            gemini: !!getGeminiKey()
        };
        
        res.status(200).json(config);
    } catch (error) {
        console.error("Config fetch error:", error);
        res.status(500).json({ error: "Failed to fetch configuration" });
    }
}
