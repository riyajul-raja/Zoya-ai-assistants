export const getClientEnv = () => {
    let gemini = false;
    
    // Check standard import.meta.env in Vite
    try {
        // @ts-ignore
        if (import.meta && import.meta.env) {
            // @ts-ignore
            if (import.meta.env.VITE_GEMINI_API_KEY_1 || import.meta.env.GEMINI_API_KEY_1 || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY) gemini = true;
        }
    } catch(e) {}
    
    // Check process.env fallback if polyfilled
    try {
        if (typeof process !== 'undefined' && process.env) {
            if (process.env.GEMINI_API_KEY_1 || process.env.VITE_GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) gemini = true;
        }
    } catch(e) {}
    
    return { gemini };
};
