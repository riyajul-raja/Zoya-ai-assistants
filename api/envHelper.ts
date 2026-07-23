
export const getGeminiKey = () => {
    let key = "";
    if (typeof process !== 'undefined' && process.env) {
        key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
    }
    return key;
};

export const getGeminiKeys = () => {
    const keys = [];
    if (typeof process !== 'undefined' && process.env) {
        const key1 = process.env.GEMINI_API_KEY_1 || process.env.VITE_GEMINI_API_KEY_1;
        const key2 = process.env.GEMINI_API_KEY_2 || process.env.VITE_GEMINI_API_KEY_2;
        const key3 = process.env.GEMINI_API_KEY_3 || process.env.VITE_GEMINI_API_KEY_3;
        const key4 = process.env.GEMINI_API_KEY_4 || process.env.VITE_GEMINI_API_KEY_4;
        const keyDef = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

        if (key1) keys.push(key1.trim());
        if (key2) keys.push(key2.trim());
        if (key3) keys.push(key3.trim());
        if (key4) keys.push(key4.trim());
        if (keyDef && !keys.includes(keyDef)) keys.push(keyDef.trim());
    }
    return keys;
};
