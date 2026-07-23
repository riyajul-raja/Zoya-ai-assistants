export const getGeminiKey = () => {
    let key = "";
    if (typeof process !== 'undefined' && process.env) {
        key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
    }
    return key;
};
