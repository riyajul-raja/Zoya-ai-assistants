const fs = require('fs');

let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

content = content.replace(
  'import { Menu, X, Trash2, Mic, Send, Loader2, PlusCircle, Sparkles, ImageIcon, Brain, RefreshCw } from "lucide-react";',
  'import { Menu, X, Trash2, Mic, Send, Loader2, PlusCircle, Sparkles, ImageIcon, Brain, RefreshCw, Copy, ThumbsUp, ThumbsDown, Volume2 } from "lucide-react";'
);

fs.writeFileSync('src/components/ChatPage.tsx', content);
