import re

with open('src/services/geminiService.ts', 'r') as f:
    content = f.read()

content = content.replace(
    'const groqKey = import.meta.env.VITE_GROQ_API_KEY;',
    'const groqKey = import.meta.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;'
)

content = content.replace(
    'const hfKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;',
    'const hfKey = import.meta.env.VITE_HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_KEY;'
)

with open('src/services/geminiService.ts', 'w') as f:
    f.write(content)

print("Success")
