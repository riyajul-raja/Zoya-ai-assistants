const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `                            <div className="whitespace-pre-wrap break-words overflow-hidden max-w-full">{msg.text}</div>
                            {msg.sender === "zoya" && !msg.isError && msg.text && (
                              <button
                                type="button"
                                onClick={() => speakMessageText(msg.text)}
                                className="absolute bottom-1.5 right-1.5 p-1 rounded bg-white/5 hover:bg-white/15 text-pink-300/70 hover:text-pink-100 transition-all cursor-pointer flex items-center justify-center border border-white/5 active:scale-95"
                                title="Speak message"
                              >
                                <Volume2 size={11} />
                              </button>
                            )}
                          </div>`;

const replacement = `                            <div className="whitespace-pre-wrap break-words overflow-hidden max-w-full">{msg.text}</div>
                            {msg.sender === "zoya" && !msg.isError && msg.text && (
                              <div className="absolute bottom-1.5 right-1.5 flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCopyMessage(msg.text, msg.id)}
                                  className="p-1 rounded bg-white/5 hover:bg-white/15 text-white/50 hover:text-white transition-all cursor-pointer flex items-center justify-center border border-white/5 active:scale-95"
                                  title="Copy message"
                                >
                                  {copiedMessageId === msg.id ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => speakMessageText(msg.text)}
                                  className="p-1 rounded bg-white/5 hover:bg-white/15 text-pink-300/70 hover:text-pink-100 transition-all cursor-pointer flex items-center justify-center border border-white/5 active:scale-95"
                                  title="Speak message"
                                >
                                  <Volume2 size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRegenerateMessage(msg.id)}
                                  className="p-1 rounded bg-white/5 hover:bg-white/15 text-purple-300/70 hover:text-purple-100 transition-all cursor-pointer flex items-center justify-center border border-white/5 active:scale-95"
                                  title="Regenerate message"
                                >
                                  <RefreshCw size={11} />
                                </button>
                              </div>
                            )}
                          </div>`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
