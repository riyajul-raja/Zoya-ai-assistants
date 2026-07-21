import re

with open('src/services/geminiService.ts', 'r') as f:
    content = f.read()

content = content.replace(
    '      const errorMsg = "VITE_GROQ_API_KEY is missing";\n      throw new Error(errorMsg);\n      if (onChunk) onChunk(errorMsg);\n      return errorMsg;',
    '      throw new Error("VITE_GROQ_API_KEY is missing");'
)

with open('src/services/geminiService.ts', 'w') as f:
    f.write(content)
