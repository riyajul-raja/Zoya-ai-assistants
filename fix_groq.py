import re

with open('src/services/geminiService.ts', 'r') as f:
    content = f.read()

# Replace process.env.GROQ_API_KEY
content = content.replace(
    'const groqKey = process.env.GROQ_API_KEY;', 
    'const groqKey = import.meta.env.VITE_GROQ_API_KEY;'
)

content = content.replace(
    'const errorMsg = "Groq API key is missing or invalid.";',
    'const errorMsg = "VITE_GROQ_API_KEY is missing";\n      throw new Error(errorMsg);'
)

content = content.replace(
    'return "Groq API key is missing or invalid.";',
    'throw new Error("VITE_GROQ_API_KEY is missing");'
)

# And fix the catch block in getZoyaResponse
content = content.replace(
    'return "Groq API Limit Reached or Error. Zoya is resting.";',
    'throw error;'
)


with open('src/services/geminiService.ts', 'w') as f:
    f.write(content)

print("Success")
