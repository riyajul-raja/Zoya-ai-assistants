with open('vite.config.ts', 'r') as f:
    content = f.read()

target = """    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
      'process.env.GROQ_API_KEY': JSON.stringify(env.GROQ_API_KEY || process.env.GROQ_API_KEY),
      'process.env.HUGGINGFACE_API_KEY': JSON.stringify(env.HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_KEY),
      'import.meta.env.VITE_GROQ_API_KEY': JSON.stringify(env.VITE_GROQ_API_KEY || process.env.VITE_GROQ_API_KEY),
      'import.meta.env.VITE_HUGGINGFACE_API_KEY': JSON.stringify(env.VITE_HUGGINGFACE_API_KEY || process.env.VITE_HUGGINGFACE_API_KEY),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY),
    },"""

# In the AI Studio setup, sometimes process.env vars are NOT picked up by Vite unless explicitly defined 
# if they were injected into process.env at runtime by the infrastructure instead of a .env file!
# So defining them explicitly in define is ACTUALLY the safest way to ensure they are available!

replacement = """    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || ''),
      'process.env.GROQ_API_KEY': JSON.stringify(process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || env.GROQ_API_KEY || env.VITE_GROQ_API_KEY || ''),
      'process.env.HUGGINGFACE_API_KEY': JSON.stringify(process.env.HUGGINGFACE_API_KEY || process.env.VITE_HUGGINGFACE_API_KEY || env.HUGGINGFACE_API_KEY || env.VITE_HUGGINGFACE_API_KEY || ''),
      'import.meta.env.VITE_GROQ_API_KEY': JSON.stringify(process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY || env.VITE_GROQ_API_KEY || ''),
      'import.meta.env.VITE_HUGGINGFACE_API_KEY': JSON.stringify(process.env.VITE_HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_KEY || env.VITE_HUGGINGFACE_API_KEY || ''),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || ''),
    },"""

content = content.replace(target, replacement)

with open('vite.config.ts', 'w') as f:
    f.write(content)

print("Success")
