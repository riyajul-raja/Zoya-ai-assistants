const fs = require('fs');
let code = fs.readFileSync('src/services/geminiService.ts', 'utf8');

const oldCatch = `    try {
      const response = await chatSession.sendMessage({ message: messageInput });
      return response.text || "Ugh, fine. I have nothing to say.";
    } catch (error: any) {
      throw error;
    }
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }`;

const newCatch = `    try {
      const response = await chatSession.sendMessage({ message: messageInput });
      return response.text || "Ugh, fine. I have nothing to say.";
    } catch (error: any) {
      const errStr = String(error).toLowerCase();
      if (errStr.includes("429") || errStr.includes("resource_exhausted") || errStr.includes("quota")) {
        return "⏳ API Limit Reached: Zoya is taking a quick 20-second breather. Please try again in a moment!";
      }
      throw error;
    }
  } catch (error) {
    console.error("Gemini Error:", error);
    const errStr = String(error).toLowerCase();
    if (errStr.includes("429") || errStr.includes("resource_exhausted") || errStr.includes("quota")) {
      return "⏳ API Limit Reached: Zoya is taking a quick 20-second breather. Please try again in a moment!";
    }
    throw error;
  }`;

code = code.replace(oldCatch, newCatch);

fs.writeFileSync('src/services/geminiService.ts', code);
console.log("Patched getZoyaResponse with new error catch rules");
