import { getGeminiKeys } from "./api/envHelper.js";
const keys = getGeminiKeys();
console.log("Keys found:", keys.length);
keys.forEach((k, i) => {
  console.log(`Key ${i}: length ${k.length}, first 4: ${k.substring(0, 4)}`);
});
