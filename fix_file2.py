import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace('const safeImages = capturedImageBase64s.map(img => {', 'const safeImages = capturedImageBase64s.map((img: any) => {')

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("Success")
