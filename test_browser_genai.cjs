const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><p>Hello world</p>', {
  url: 'http://localhost/',
});
global.window = dom.window;
global.document = dom.window.document;
global.fetch = require('node-fetch');
global.Headers = global.fetch.Headers;
global.Request = global.fetch.Request;
global.Response = global.fetch.Response;
// mock other things if necessary

const { GoogleGenAI } = require("@google/genai");

async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash",
      contents: "hello",
    });
    for await (const chunk of responseStream) {
        console.log(chunk.text);
    }
  } catch (error) {
    console.log("EXACT ERROR MESSAGE:", error.message);
    console.log("EXACT ERROR STATUS:", error.status);
    console.log("EXACT ERROR DETAILS:", JSON.stringify(error, null, 2));
  }
}
run();
