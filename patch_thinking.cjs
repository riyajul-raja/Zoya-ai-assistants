const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Update ChatMessage interface
const oldInterface = `interface ChatMessage {
  id: string;
  sender: "user" | "zoya";
  role?: "user" | "model";
  text: string;
  image?: string;
  isError?: boolean;
}`;
const newInterface = `interface ChatMessage {
  id: string;
  sender: "user" | "zoya";
  role?: "user" | "model";
  text: string;
  image?: string;
  isError?: boolean;
  isHighThinking?: boolean;
}`;
code = code.replace(oldInterface, newInterface);

// 2. Add isHighThinking to the initial message creation
const oldAppend = `      // Append an initial message for Zoya with empty text so that the UI updates in real-time
      setMessages((prev) => [
        ...prev,
        { id: responseMessageId, sender: "zoya", role: "model", text: "" }
      ]);`;
const newAppend = `      const isHighThinking = /think|solve|complex|calculate|math|reason|puzzle|code|debug|logic/i.test(finalTranscript);
      
      // Append an initial message for Zoya with empty text so that the UI updates in real-time
      setMessages((prev) => [
        ...prev,
        { id: responseMessageId, sender: "zoya", role: "model", text: "", isHighThinking }
      ]);`;
code = code.replace(oldAppend, newAppend);

// 3. Render the badge
const oldRender = `                            )}
                            <div className="whitespace-pre-wrap">{msg.text}</div>
                            {msg.sender === "zoya" && !msg.isError && msg.text && (`;

const newRender = `                            )}
                            {msg.sender === "zoya" && msg.isHighThinking && (
                              <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-md bg-white/5 border border-white/10 w-fit backdrop-blur-md shadow-sm">
                                <Brain size={12} className="text-pink-400 animate-pulse" />
                                <span className="text-[9px] font-mono uppercase tracking-wider text-pink-300">Deep Thinking</span>
                              </div>
                            )}
                            <div className="whitespace-pre-wrap">{msg.text}</div>
                            {msg.sender === "zoya" && !msg.isError && msg.text && (`;

code = code.replace(oldRender, newRender);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx");
