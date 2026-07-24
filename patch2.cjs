const fs = require('fs');
let code = fs.readFileSync('src/services/geminiService.ts', 'utf8');
code = code.replace(/const ai = new GoogleGenAI\(\{[^]*?responseStream = await ai\.models\.generateContentStream\(\{([^]*?)\}\);/g, `const url = \`https://generativelanguage.googleapis.com/v1beta/models/\${selectedModel || "gemini-2.5-flash"}:streamGenerateContent?alt=sse&key=\${key.trim()}\`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemInstruction }] },
                    contents: finalContents
                })
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const error: any = new Error(errData?.error?.message || response.statusText);
                error.status = response.status;
                throw error;
            }
            responseStream = response.body;`);
            
code = code.replace(/const ai = new GoogleGenAI\(\{[^]*?response = await ai\.models\.generateContent\(\{([^]*?)\}\);/g, `const url = \`https://generativelanguage.googleapis.com/v1beta/models/\${selectedModel || "gemini-2.5-flash"}:generateContent?key=\${key.trim()}\`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemInstruction }] },
                    contents: finalContents
                })
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                const error: any = new Error(errData?.error?.message || res.statusText);
                error.status = res.status;
                throw error;
            }
            const data = await res.json();
            response = { text: data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || "" };`);
fs.writeFileSync('src/services/geminiService.ts', code);
