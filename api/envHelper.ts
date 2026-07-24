export const getGeminiKeys = () => {
    const keys: string[] = [];
    if (typeof process !== 'undefined' && process.env) {
        const key1 = process.env.GEMINI_API_KEY_1 || process.env.VITE_GEMINI_API_KEY_1;
        const key2 = process.env.GEMINI_API_KEY_2 || process.env.VITE_GEMINI_API_KEY_2;
        const key3 = process.env.GEMINI_API_KEY_3 || process.env.VITE_GEMINI_API_KEY_3;
        const key4 = process.env.GEMINI_API_KEY_4 || process.env.VITE_GEMINI_API_KEY_4;
        
        const isValidKey = (k: string | undefined) => {
            if (!k) return false;
            const t = k.trim();
            return t.startsWith("AQ.") || t.startsWith("AIza");
        };

        if (isValidKey(key1)) keys.push(key1!.trim());
        if (isValidKey(key2)) keys.push(key2!.trim());
        if (isValidKey(key3)) keys.push(key3!.trim());
        if (isValidKey(key4)) keys.push(key4!.trim());

        const keyDef = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
        if (isValidKey(keyDef) && !keys.includes(keyDef!.trim())) keys.push(keyDef!.trim());
    }
    return keys;
};
