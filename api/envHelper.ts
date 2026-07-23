export const getGroqKey = () => {
    let key = "";
    if (typeof process !== 'undefined' && process.env) {
        key = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || "";
    }
    return key;
};

export const getHfKey = () => {
    let key = "";
    if (typeof process !== 'undefined' && process.env) {
        key = process.env.HUGGINGFACE_API_KEY || process.env.VITE_HUGGINGFACE_API_KEY || process.env.VITE_HUGGING_FACE_API_KEY || "";
    }
    return key;
};

export const getGeminiKey = () => {
    let key = "";
    if (typeof process !== 'undefined' && process.env) {
        key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
    }
    return key;
};
