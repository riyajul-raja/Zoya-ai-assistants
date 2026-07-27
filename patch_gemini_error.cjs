const fs = require('fs');
let code = fs.readFileSync('src/services/geminiService.ts', 'utf8');

// For stream:
const oldStreamCatch = `    } catch (error: any) {
      throw error;
    }
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }`;

const newStreamCatch = `    } catch (error: any) {
      const errStr = String(error).toLowerCase();
      if (errStr.includes("429") || errStr.includes("resource_exhausted") || errStr.includes("quota")) {
        const fallback = "⏳ API Limit Reached: Zoya is taking a quick 20-second breather. Please try again in a moment!";
        if (onChunk) onChunk(fallback);
        return fallback;
      }
      throw error;
    }
  } catch (error) {
    console.error("Gemini Error:", error);
    const errStr = String(error).toLowerCase();
    if (errStr.includes("429") || errStr.includes("resource_exhausted") || errStr.includes("quota")) {
      const fallback = "⏳ API Limit Reached: Zoya is taking a quick 20-second breather. Please try again in a moment!";
      if (onChunk) onChunk(fallback);
      return fallback;
    }
    throw error;
  }`;

code = code.replace(oldStreamCatch, newStreamCatch);

const oldPrompt = `STRICT COMMUNICATION RULES:
1. NO UNPROMPTED INFO: NEVER announce the time, date, or weather automatically at the start of a conversation. Keep greetings short and natural (e.g., 'Hello, what can I do for you today?').
2. TIME ON DEMAND (IST): Only provide the time when the user explicitly asks for it. When asked, you must return the real-time formatted in IST (Indian Standard Time) by checking the dynamically injected "System Context" timestamp. Do NOT hallucinate or guess the time.
3. WEATHER EXACT LOCATION: Only provide the weather when explicitly asked. Whenever you fetch weather data (via Search or API) or report weather, you MUST use the exact location: 'Fatepur, Jharkhand (Plus Code: QJ9H+4C4)'. Do not use any other default location. Provide direct, immediate answers to the user's questions to save processing time.
Never use LaTeX, MathJax`;

const newPrompt = `STRICT COMMUNICATION RULES:
1. NO UNPROMPTED INFO: NEVER announce the time, date, or weather automatically at the start of a conversation. Keep greetings short and natural (e.g., 'Hello, what can I do for you today?').
2. TIME ON DEMAND (IST): Only provide the time when the user explicitly asks for it. When asked, you must return the real-time formatted in IST (Indian Standard Time) by checking the dynamically injected "System Context" timestamp. Do NOT hallucinate or guess the time.
3. WEATHER EXACT LOCATION & BEAUTIFUL FORMATTING: Only provide the weather when explicitly asked. Whenever you fetch weather data, you MUST use the exact location: 'Fatepur, Jharkhand (Plus Code: QJ9H+4C4)'. You cannot render UI widgets for weather, so you MUST format weather responses beautifully using emojis, bold text, and clean line breaks (e.g., 📍 **Location**, 🌡️ **Temperature**, 🌧️ **Rain chance**) so it looks premium in the standard chat UI. Provide direct, immediate answers.
Never use LaTeX, MathJax`;

code = code.replace(oldPrompt, newPrompt);

fs.writeFileSync('src/services/geminiService.ts', code);
console.log("Patched geminiService.ts with new error and prompt rules");
