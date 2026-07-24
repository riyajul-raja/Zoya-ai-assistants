import { getGeminiKeys } from "./api/envHelper.js";

async function run() {
  const keys = getGeminiKeys();
  const key = keys[0];

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await response.json();
    console.log("Models:", data.models?.map((m: any) => m.name).join(", "));
  } catch (e: any) {
    console.log("ListModels error:", e.message);
  }
}
run();
