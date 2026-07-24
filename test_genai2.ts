import { GoogleGenAI } from "@google/genai";
import * as fs from 'fs';
import { getGeminiKeys } from "./api/envHelper.js";

async function run() {
  const pkg = JSON.parse(fs.readFileSync('./node_modules/@google/genai/package.json', 'utf8'));
  console.log("1. @google/genai version:", pkg.version);

  const keys = getGeminiKeys();
  const key = keys[0];

  const originalFetch = global.fetch;
  global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    console.log("3. Endpoint URL:", input.toString());
    const headersObj: Record<string, string> = {};
    if (init?.headers) {
      new Headers(init.headers as any).forEach((v, k) => headersObj[k] = v);
    }
    if (headersObj['x-goog-api-key']) headersObj['x-goog-api-key'] = 'REDACTED';
    console.log("4. Request headers:", JSON.stringify(headersObj, null, 2));

    try {
      const response = await originalFetch(input, init);
      console.log("7. Reaches Google's server: YES");
      const respHeaders: Record<string, string> = {};
      response.headers.forEach((v, k) => respHeaders[k] = v);
      console.log("5. Response headers:", JSON.stringify(respHeaders, null, 2));
      
      const clone = response.clone();
      const body = await clone.text();
      console.log("6. Error response body:", body);
      return response;
    } catch (e: any) {
      console.log("7. Reaches Google's server: NO");
      console.log("Fetch failed:", e);
      throw e;
    }
  };

  const ai = new GoogleGenAI({ apiKey: key });
  console.log("2. Model name: gemini-1.5-flash");

  try {
    await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: "Hello"
    });
  } catch (e: any) {
    console.log("SDK threw:", e.message);
  }
}
run();
