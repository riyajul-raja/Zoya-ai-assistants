const fs = require('fs');
let code = fs.readFileSync('src/components/ContactsManager.tsx', 'utf8');

// 1. Add voiceAction state
code = code.replace(
  'const [isListening, setIsListening] = useState(false);',
  `const [isListening, setIsListening] = useState(false);\n  const [voiceAction, setVoiceAction] = useState<{ type: 'call' | 'whatsapp'; name: string; number: string; } | null>(null);`
);

// 2. Replace startListening logic
code = code.replace(/const startListening = \(\) => \{[\s\S]*?recognition\.start\(\);\n  \};/,
`const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onToast("Speech Recognition is not supported in your browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      onToast("Listening for voice command...");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      
      let actionType: 'call' | 'whatsapp' | null = null;
      let nameToCallRaw = '';

      if (transcript.includes('call ')) {
        actionType = 'call';
        nameToCallRaw = transcript.substring(transcript.indexOf('call ') + 5).trim();
      } else if (transcript.includes('whatsapp ')) {
        actionType = 'whatsapp';
        nameToCallRaw = transcript.substring(transcript.indexOf('whatsapp ') + 9).trim();
      }
      
      if (actionType && nameToCallRaw) {
        const nameToCall = nameToCallRaw.replace(/\\s+/g, '');
        
        if (nameToCall) {
          const match = contacts.find((c) => {
            const contactNameRaw = (c.names?.[0]?.displayName || "").toLowerCase();
            const contactName = contactNameRaw.replace(/\\s+/g, '');
            return contactName.includes(nameToCall) || nameToCall.includes(contactName);
          });

          if (match) {
            const matchedContactPhoneNumber = match.phoneNumbers?.[0]?.value;
            if (matchedContactPhoneNumber) {
              const cleanNumber = matchedContactPhoneNumber.replace(/[\\s\\-\\(\\)]/g, '');
              
              setVoiceAction({
                type: actionType,
                name: match.names?.[0]?.displayName || "Unknown",
                number: cleanNumber
              });
              onToast(\`Tap to \${actionType === 'call' ? 'Call' : 'WhatsApp'} \${match.names?.[0]?.displayName}\`);
            } else {
              onToast(\`Found \${match.names?.[0]?.displayName}, but no phone number available.\`);
            }
          } else {
            onToast(\`Contact not found.\`);
          }
        }
      } else {
        onToast(\`Recognized: "\${transcript}". Say "Call [Name]" or "WhatsApp [Name]".\`);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      onToast(\`Microphone error: \${event.error}\`);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };`
);

// 3. Add UI modal for voice action
code = code.replace(
  'return (\n    <div id="contacts-manager-overlay"',
  `return (
    <>
      <AnimatePresence>
        {voiceAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-neutral-900 border border-red-500/30 rounded-2xl p-6 shadow-[0_0_40px_rgba(239,68,68,0.2)] text-center relative"
            >
              <button
                onClick={() => setVoiceAction(null)}
                className="absolute top-3 right-3 p-1.5 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
              
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                {voiceAction.type === 'call' ? <Phone size={28} className="text-red-400" /> : <Mail size={28} className="text-green-400" />}
              </div>
              
              <h3 className="text-xl font-medium text-white mb-1">
                {voiceAction.type === 'call' ? 'Call' : 'WhatsApp'} {voiceAction.name}
              </h3>
              <p className="text-white/50 text-sm mb-6 font-mono">{voiceAction.number}</p>
              
              <a
                href={voiceAction.type === 'call' ? \`tel:\${voiceAction.number}\` : \`whatsapp://send?phone=\${voiceAction.number}\`}
                onClick={() => setTimeout(() => setVoiceAction(null), 1000)}
                className={\`block w-full py-3.5 rounded-xl text-white font-medium tracking-wide transition-all shadow-lg active:scale-95 \${
                  voiceAction.type === 'call' 
                    ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20' 
                    : 'bg-green-600 hover:bg-green-500 shadow-green-600/20'
                }\`}
              >
                TAP TO {voiceAction.type === 'call' ? 'CALL' : 'WHATSAPP'}
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    <div id="contacts-manager-overlay"`
);

// close the return statement addition
const lastParenIndex = code.lastIndexOf(')');
code = code.substring(0, lastParenIndex) + '    </>\n  )' + code.substring(lastParenIndex + 1);

fs.writeFileSync('src/components/ContactsManager.tsx', code);
