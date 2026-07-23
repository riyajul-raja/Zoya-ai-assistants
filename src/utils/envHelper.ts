export const getClientEnv = () => {
    let gemini = false;
    let groq = false;
    let hf = false;
    
    // Check standard import.meta.env in Vite
    try {
        // @ts-ignore
        if (import.meta && import.meta.env) {
            // @ts-ignore
            if (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY) gemini = true;
            // @ts-ignore
            if (import.meta.env.VITE_GROQ_API_KEY || import.meta.env.GROQ_API_KEY) groq = true;
            // @ts-ignore
            if (import.meta.env.VITE_HUGGINGFACE_API_KEY || import.meta.env.VITE_HUGGING_FACE_API_KEY || import.meta.env.HUGGINGFACE_API_KEY) hf = true;
        }
    } catch(e) {}
    
    // Check process.env fallback if polyfilled
    try {
        if (typeof process !== 'undefined' && process.env) {
            if (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) gemini = true;
            if (process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY) groq = true;
            if (process.env.HUGGINGFACE_API_KEY || process.env.VITE_HUGGINGFACE_API_KEY || process.env.VITE_HUGGING_FACE_API_KEY) hf = true;
        }
    } catch(e) {}
    
    return { gemini, groq, hf };
};
