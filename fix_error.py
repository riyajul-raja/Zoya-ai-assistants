import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# We need to replace the error handling block inside catch(error: any)

# Find the try/catch block
start_marker = "      } catch (error: any) {"
end_marker = "      setAppState(\"idle\");\n    }\n  }, [isMuted, isSessionActive"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_block = """      } catch (error: any) {
        setIsTyping(false);
        setIsLoading(false);
        console.error("Chat Error:", error);
        // Remove the empty/incomplete message on error
        setMessages((prev) => prev.filter((msg) => msg.id !== responseMessageId));

        console.log(error);
        let errMsg = "";
        let rawMessage = error?.message || String(error);

        if (typeof rawMessage === "string") {
          try {
            const parsed = JSON.parse(rawMessage);
            if (parsed?.error?.message) {
              rawMessage = parsed.error.message;
            } else if (parsed?.message) {
              rawMessage = parsed.message;
            }
          } catch (e) {
            try {
              const startIdx = rawMessage.indexOf("{");
              const endIdx = rawMessage.lastIndexOf("}");
              if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                const potentialJson = rawMessage.substring(startIdx, endIdx + 1);
                const parsedEmbedded = JSON.parse(potentialJson);
                if (parsedEmbedded?.error?.message) {
                  rawMessage = parsedEmbedded.error.message;
                } else if (parsedEmbedded?.message) {
                  rawMessage = parsedEmbedded.message;
                }
              }
            } catch (err2) {}
          }

          rawMessage = rawMessage
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'")
            .replace(/\\n/g, " ")
            .trim();

          if (rawMessage.startsWith("{") || rawMessage.includes('{"') || rawMessage.includes('":')) {
            rawMessage = rawMessage
              .replace(/[\\{\\}\\[\\]"']/g, "")
              .replace(/error\\s*:/gi, "")
              .replace(/message\\s*:/gi, "")
              .replace(/code\\s*:\\s*\\d+/gi, "")
              .replace(/\\s+/g, " ")
              .trim();
          }
        }
        
        errMsg = rawMessage;

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString() + "-z",
            sender: "zoya",
            role: "model",
            text: `SYSTEM ERROR: ${errMsg}`,
            isError: true,
          },
        ]);
      }
"""
    new_content = content[:start_idx] + new_block + content[end_idx:]
    with open('src/App.tsx', 'w') as f:
        f.write(new_content)
    print("Success")
else:
    print("Failed to find markers")
