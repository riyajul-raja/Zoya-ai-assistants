import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace('Array.from(files).forEach((file) => {', 'Array.from(files).forEach((file: any) => {')

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("Success")
