import re

with open('src/services/geminiService.ts', 'r') as f:
    content = f.read()

# Add imports
imports = """import { GoogleGenAI } from "@google/genai";
import { diagnosticsStore, Provider } from "./diagnosticsStore";
import Groq from "groq-sdk";
import { HfInference } from "@huggingface/inference";
"""
content = content.replace('import { GoogleGenAI } from "@google/genai";\nimport { diagnosticsStore, Provider } from "./diagnosticsStore";', imports)

# Rewrite groq stream
groq_stream_old = """    const startTime = Date.now();
    diagnosticsStore.updateProvider("groq", { status: "pending", lastRequestTime: startTime, isConfigured: true });
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
        body: JSON.stringify({ model: "llama3-8b-8192", messages, stream: true })
      });
      
      if (!response.ok) {
        let errMsg = `Groq API error: ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData?.error?.message) errMsg = errData.error.message;
          else if (errData?.message) errMsg = errData.message;
        } catch (e) {}
        throw new Error(errMsg);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulatedText = "";

      if (reader) {
        let done = false;
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunkText = decoder.decode(value, { stream: true });
            const lines = chunkText.split("\\n").filter(line => line.trim() !== "");
            for (const line of lines) {
              if (line === "data: [DONE]") continue;
              if (line.startsWith("data: ")) {
                try {
                  const parsed = JSON.parse(line.slice(6));
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    accumulatedText += content;
                    if (onChunk) onChunk(accumulatedText);
                  }
                } catch (e) {
                  // ignore JSON parse errors for incomplete chunks
                }
              }
            }
          }
        }
      }

      diagnosticsStore.updateProvider("groq", { status: "success", latencyMs: Date.now() - startTime });
      if (isDev) console.log("[Groq Stream] Success, length:", accumulatedText.length);
      return accumulatedText || "Ugh, fine. I have nothing to say.";
    } catch (error: any) {"""

groq_stream_new = """    const startTime = Date.now();
    diagnosticsStore.updateProvider("groq", { status: "pending", lastRequestTime: startTime, isConfigured: true });
    try {
      const groq = new Groq({ apiKey: groqKey, dangerouslyAllowBrowser: true });
      const stream = await groq.chat.completions.create({
        messages: messages as any,
        model: "llama3-8b-8192",
        stream: true,
      });

      let accumulatedText = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          accumulatedText += content;
          if (onChunk) onChunk(accumulatedText);
        }
      }

      diagnosticsStore.updateProvider("groq", { status: "success", latencyMs: Date.now() - startTime });
      if (isDev) console.log("[Groq Stream] Success, length:", accumulatedText.length);
      return accumulatedText || "Ugh, fine. I have nothing to say.";
    } catch (error: any) {"""
content = content.replace(groq_stream_old, groq_stream_new)

# Rewrite hf stream
hf_stream_old = """    const startTime = Date.now();
    diagnosticsStore.updateProvider("huggingface", { status: "pending", lastRequestTime: startTime, isConfigured: true });
    try {
      const response = await fetch("https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${hfKey}` },
        body: JSON.stringify({ model: "HuggingFaceH4/zephyr-7b-beta", messages, stream: true, max_tokens: 500 })
      });
      
      if (!response.ok) {
        let errMsg = `Hugging Face API error: ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData?.error) errMsg = errData.error;
          else if (errData?.message) errMsg = errData.message;
        } catch (e) {}
        throw new Error(errMsg);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulatedText = "";

      if (reader) {
        let done = false;
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunkText = decoder.decode(value, { stream: true });
            const lines = chunkText.split("\\n").filter(line => line.trim() !== "");
            for (const line of lines) {
              if (line === "data: [DONE]") continue;
              if (line.startsWith("data: ")) {
                try {
                  const parsed = JSON.parse(line.slice(6));
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    accumulatedText += content;
                    if (onChunk) onChunk(accumulatedText);
                  }
                } catch (e) {}
              }
            }
          }
        }
      }

      diagnosticsStore.updateProvider("huggingface", { status: "success", latencyMs: Date.now() - startTime });
      if (isDev) console.log("[Hugging Face Stream] Success, length:", accumulatedText.length);
      return accumulatedText || "Ugh, fine. I have nothing to say.";
    } catch (error: any) {"""

hf_stream_new = """    const startTime = Date.now();
    diagnosticsStore.updateProvider("huggingface", { status: "pending", lastRequestTime: startTime, isConfigured: true });
    try {
      const hf = new HfInference(hfKey);
      const stream = hf.chatCompletionStream({
        model: "HuggingFaceH4/zephyr-7b-beta",
        messages: messages as any,
        max_tokens: 500
      });

      let accumulatedText = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          accumulatedText += content;
          if (onChunk) onChunk(accumulatedText);
        }
      }

      diagnosticsStore.updateProvider("huggingface", { status: "success", latencyMs: Date.now() - startTime });
      if (isDev) console.log("[Hugging Face Stream] Success, length:", accumulatedText.length);
      return accumulatedText || "Ugh, fine. I have nothing to say.";
    } catch (error: any) {"""
content = content.replace(hf_stream_old, hf_stream_new)

# Rewrite groq req
groq_req_old = """    const startTime = Date.now();
    diagnosticsStore.updateProvider("groq", { status: "pending", lastRequestTime: startTime, isConfigured: true });
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
        body: JSON.stringify({ model: "llama3-8b-8192", messages, stream: false })
      });
      
      if (!response.ok) {
        let errMsg = `Groq API error: ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData?.error?.message) errMsg = errData.error.message;
          else if (errData?.message) errMsg = errData.message;
        } catch (e) {}
        throw new Error(errMsg);
      }
      
      const data = await response.json();
      const tokenUsage = data.usage ? { prompt: data.usage.prompt_tokens, completion: data.usage.completion_tokens, total: data.usage.total_tokens } : null;
      diagnosticsStore.updateProvider("groq", { status: "success", latencyMs: Date.now() - startTime, tokenUsage });
      if (isDev) console.log("[Groq Request] Success");
      return data.choices?.[0]?.message?.content || "Ugh, fine. I have nothing to say.";
    } catch (error: any) {"""

groq_req_new = """    const startTime = Date.now();
    diagnosticsStore.updateProvider("groq", { status: "pending", lastRequestTime: startTime, isConfigured: true });
    try {
      const groq = new Groq({ apiKey: groqKey, dangerouslyAllowBrowser: true });
      const response = await groq.chat.completions.create({
        messages: messages as any,
        model: "llama3-8b-8192",
      });
      
      const usage = response.usage;
      const tokenUsage = usage ? { prompt: usage.prompt_tokens, completion: usage.completion_tokens, total: usage.total_tokens } : null;
      diagnosticsStore.updateProvider("groq", { status: "success", latencyMs: Date.now() - startTime, tokenUsage });
      if (isDev) console.log("[Groq Request] Success");
      return response.choices?.[0]?.message?.content || "Ugh, fine. I have nothing to say.";
    } catch (error: any) {"""
content = content.replace(groq_req_old, groq_req_new)

# Rewrite hf req
hf_req_old = """    const startTime = Date.now();
    diagnosticsStore.updateProvider("huggingface", { status: "pending", lastRequestTime: startTime, isConfigured: true });
    try {
      const response = await fetch("https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${hfKey}` },
        body: JSON.stringify({ model: "HuggingFaceH4/zephyr-7b-beta", messages, stream: false, max_tokens: 500 })
      });
      
      if (!response.ok) {
        let errMsg = `Hugging Face API error: ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData?.error) errMsg = errData.error;
          else if (errData?.message) errMsg = errData.message;
        } catch (e) {}
        throw new Error(errMsg);
      }
      
      const data = await response.json();
      diagnosticsStore.updateProvider("huggingface", { status: "success", latencyMs: Date.now() - startTime });
      if (isDev) console.log("[Hugging Face Request] Success");
      return data.choices?.[0]?.message?.content || "Ugh, fine. I have nothing to say.";
    } catch (error: any) {"""

hf_req_new = """    const startTime = Date.now();
    diagnosticsStore.updateProvider("huggingface", { status: "pending", lastRequestTime: startTime, isConfigured: true });
    try {
      const hf = new HfInference(hfKey);
      const response = await hf.chatCompletion({
        model: "HuggingFaceH4/zephyr-7b-beta",
        messages: messages as any,
        max_tokens: 500
      });
      
      diagnosticsStore.updateProvider("huggingface", { status: "success", latencyMs: Date.now() - startTime });
      if (isDev) console.log("[Hugging Face Request] Success");
      return response.choices?.[0]?.message?.content || "Ugh, fine. I have nothing to say.";
    } catch (error: any) {"""
content = content.replace(hf_req_old, hf_req_new)

with open('src/services/geminiService.ts', 'w') as f:
    f.write(content)

print("Success")
