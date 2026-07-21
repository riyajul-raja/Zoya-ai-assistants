import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Find try-catch block for getZoyaResponseStream
start_marker = "        try {\n          responseText = await getZoyaResponseStream("
end_marker = "        } catch (error) {\n          if (autoSelectModel && currentActiveModel !== \"groq\") {"
end_replace_marker = "          } else {\n            throw error;\n          }\n        }"

start_idx = content.find(start_marker)
end_idx = content.find(end_replace_marker)

if start_idx != -1 and end_idx != -1:
    end_idx += len(end_replace_marker)
    
    new_block = """        responseText = await getZoyaResponseStream(
          promptToSend,
          messagesRef.current,
          capturedImageBase64s,
          isProfessionalMode,
          environmentContext,
          chunkCallback,
          selectedModel
        );"""
    
    content = content[:start_idx] + new_block + content[end_idx:]

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("Success")
