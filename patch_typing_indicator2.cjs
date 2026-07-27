const fs = require('fs');
let code = fs.readFileSync('src/components/TypingIndicator.tsx', 'utf8');

const target = `export default function TypingIndicator({ isGhostMode }: TypingIndicatorProps) {`;
const replacement = `interface TypingIndicatorProps {
  isGhostMode: boolean;
  thought?: string | null;
}

export default function TypingIndicator({ isGhostMode, thought = null }: TypingIndicatorProps) {`;

code = code.replace(/interface TypingIndicatorProps \{\n  isGhostMode: boolean;\n\}\n\nexport default function TypingIndicator\(\{ isGhostMode \}: TypingIndicatorProps\) \{/, replacement);

fs.writeFileSync('src/components/TypingIndicator.tsx', code);
