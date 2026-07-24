const fs = require('fs');
let code = fs.readFileSync('src/services/geminiService.ts', 'utf8');

code = code.replace(/for await \\(const chunk of responseStream\\) \\{\\s*const content = chunk\\.text \\|\\| "";\\s*if \\(content\\) \\{\\s*accumulatedText \\+= content;\\s*if \\(onChunk\\) onChunk\\(accumulatedText\\);\\s*\\}\\s*\\}/, `
    if (responseStream) {
        const decoder = new TextDecoder("utf-8");
        const reader = responseStream.getReader();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\\n");
            buffer = lines.pop() || "";
            
            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const dataStr = line.slice(6);
                    if (dataStr === "[DONE]") continue;
                    try {
                        const dataObj = JSON.parse(dataStr);
                        const content = dataObj.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || "";
                        if (content) {
                            accumulatedText += content;
                            if (onChunk) onChunk(accumulatedText);
                        }
                    } catch (e) {
                        console.error("Error parsing stream chunk", e);
                    }
                }
            }
        }
    }
`);

fs.writeFileSync('src/services/geminiService.ts', code);
