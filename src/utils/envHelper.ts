
export const getClientEnv = async () => {
    try {
        const res = await fetch('/api/config');
        if (res.ok) {
            const data = await res.json();
            return data;
        }
    } catch(e) {
        console.error("Failed to fetch client env", e);
    }
    return { gemini: true }; // default assumption
};
