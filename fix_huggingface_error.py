import re

with open('src/services/geminiService.ts', 'r') as f:
    content = f.read()

# Fix huggingface getZoyaResponse
content = content.replace(
"""    } catch (error) {
      console.error("Hugging Face Error:", error);
      return "Hugging Face API Limit Reached or Error. Zoya is resting.";
    }""",
"""    } catch (error: any) {
      console.error("Hugging Face Error:", error);
      if (error instanceof TypeError || error.name === 'TypeError') {
        throw new Error("CORS Error or Network Blocked: " + error.message);
      }
      throw error;
    }"""
)

# Fix gemini getZoyaResponse
content = content.replace(
"""  } catch (error) {
    console.error("Gemini Error:", error);
    return "API Limit Reached or Error. Zoya is resting.";
  }""",
"""  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw error;
  }"""
)

# Fix hugging face error return
content = content.replace(
    'return "Hugging Face API key is missing or invalid.";',
    'throw new Error("Hugging Face API key is missing or invalid.");'
)

# Replace hugging face fetch to use corsproxy
content = content.replace(
    'fetch("https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta/v1/chat/completions",',
    'fetch("https://corsproxy.io/?https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta/v1/chat/completions",'
)

with open('src/services/geminiService.ts', 'w') as f:
    f.write(content)

print("Success")
