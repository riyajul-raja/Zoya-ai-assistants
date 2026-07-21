import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Replace the live session check
old_check = "    if (liveSessionRef.current && attachedImageBase64s.length === 0) {"
new_check = "    if (liveSessionRef.current && attachedImageBase64s.length === 0 && selectedModel === \"gemini\") {"

content = content.replace(old_check, new_check)

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("Success")
