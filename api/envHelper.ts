export const getApiKey = () => {
    const apiKey = (
        process.env.GEMINI_API_KEY || 
        process.env.GEMINI_API_KEY_1 || 
        process.env.GEMINI_API_KEY_2 || 
        process.env.GEMINI_API_KEY_3 || 
        process.env.GEMINI_API_KEY_4 || 
        ""
    ).trim();
    
    if (!apiKey) throw new Error("API Key is missing in environment");
    return apiKey;
};
