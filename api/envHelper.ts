export const getGeminiKeys = () => {
    const keys: string[] = [];
    
    // Statically reference Vite env variables so the bundler can replace them
    const viteKey1 = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY_1 : undefined;
    const viteKey2 = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY_2 : undefined;
    const viteKey3 = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY_3 : undefined;
    const viteKey4 = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY_4 : undefined;
    const viteKeyDef = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : undefined;

    // Statically reference Node env variables
    const nodeKey1 = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY_1 : undefined;
    const nodeKey2 = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY_2 : undefined;
    const nodeKey3 = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY_3 : undefined;
    const nodeKey4 = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY_4 : undefined;
    const nodeKeyDef = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : undefined;
    
    const key1 = viteKey1 || nodeKey1;
    const key2 = viteKey2 || nodeKey2;
    const key3 = viteKey3 || nodeKey3;
    const key4 = viteKey4 || nodeKey4;
    const keyDef = viteKeyDef || nodeKeyDef;
    
    const isValidKey = (k: string | undefined) => {
        if (!k) return false;
        const t = k.trim();
        return t.length > 0 && !t.startsWith("ya29.");
    };

    if (isValidKey(key1)) keys.push(key1!.trim());
    if (isValidKey(key2)) keys.push(key2!.trim());
    if (isValidKey(key3)) keys.push(key3!.trim());
    if (isValidKey(key4)) keys.push(key4!.trim());
    
    if (isValidKey(keyDef) && !keys.includes(keyDef!.trim())) keys.push(keyDef!.trim());

    if (keys.length === 0) {
        throw new Error("STOP: API Key is completely empty in the code! Please check your environment variables.");
    }
    return keys;
};