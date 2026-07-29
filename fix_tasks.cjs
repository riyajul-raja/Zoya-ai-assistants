const fs = require('fs');
let content = fs.readFileSync('src/components/TasksManager.tsx', 'utf8');

content = content.replace(
  'const newStatus = task.status === "completed" ? "needsAction" : "completed";',
  'const newStatus: "completed" | "needsAction" = task.status === "completed" ? "needsAction" : "completed";'
);

fs.writeFileSync('src/components/TasksManager.tsx', content);
