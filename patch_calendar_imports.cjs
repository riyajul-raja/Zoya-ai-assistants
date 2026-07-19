const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarManager.tsx', 'utf8');
code = code.replace(
  /CloudOff, Cloud\n} from "lucide-react";/,
  "CloudOff, Cloud, ChevronLeft, ChevronRight\n} from \"lucide-react\";"
);
fs.writeFileSync('src/components/CalendarManager.tsx', code);
console.log("Patched imports");
