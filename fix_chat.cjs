const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

const chatBlockStart = content.indexOf('{/* Integrated Chat History & Input Panel */}');
const afterChatBlock = content.indexOf('{/* Controls */}');
const controlsBlockStart = content.lastIndexOf('</AnimatePresence>', afterChatBlock) + '</AnimatePresence>'.length;

const before = content.substring(0, chatBlockStart);
const after = content.substring(controlsBlockStart);

const newChatBlock = `      {/* Integrated Chat History & Input Panel */}
      <AnimatePresence>
        {showChat && (
          <ChatPage 
            messages={messages as any}
            textInput={textInput}
            setTextInput={setTextInput}
            handleTextSubmit={handleTextSubmit}
            isLoading={isLoading}
            isTyping={isTyping}
            isGhostMode={isGhostMode}
            isARMode={isARMode}
            isListening={isListening}
            toggleInputDictation={toggleInputDictation}
            selectedImages={selectedImages}
            setSelectedImages={setSelectedImages}
            isImageMode={isImageMode}
            setIsImageMode={setIsImageMode}
            isDeepThinking={isDeepThinking}
            setIsDeepThinking={setIsDeepThinking}
            setShowChat={setShowChat}
            isInputReadOnly={isInputReadOnly}
            setIsInputReadOnly={setIsInputReadOnly}
            handleImageUpload={handleImageUpload}
            setIsPlusMenuOpen={setIsPlusMenuOpen}
            textareaRef={textareaRef}
            fileInputRef={fileInputRef}
            chatContainerRef={chatContainerRef}
            recognitionRef={recognitionRef}
          />
        )}
      </AnimatePresence>\n`;

fs.writeFileSync('src/App.tsx', before + newChatBlock + after);
