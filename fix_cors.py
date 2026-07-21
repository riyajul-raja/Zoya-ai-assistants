import re

with open('src/services/geminiService.ts', 'r') as f:
    content = f.read()

# Replace Groq fetch
content = content.replace(
    'fetch("https://api.groq.com/openai/v1/chat/completions", {',
    'fetch("https://corsproxy.io/?https://api.groq.com/openai/v1/chat/completions", {'
)

# Catch block in Groq stream
content = content.replace(
"""    } catch (error: any) {
      console.error("Groq Stream Error:", error);
      throw error;
    }""",
"""    } catch (error: any) {
      console.error("Groq Stream Error:", error);
      if (error instanceof TypeError || error.name === 'TypeError') {
        throw new Error("CORS Error or Network Blocked: " + error.message);
      }
      throw error;
    }"""
)

# Catch block in Groq standard
content = content.replace(
"""    } catch (error) {
      console.error("Groq Error:", error);
      throw error;
    }""",
"""    } catch (error: any) {
      console.error("Groq Error:", error);
      if (error instanceof TypeError || error.name === 'TypeError') {
        throw new Error("CORS Error or Network Blocked: " + error.message);
      }
      throw error;
    }"""
)


with open('src/services/geminiService.ts', 'w') as f:
    f.write(content)

print("Success")
