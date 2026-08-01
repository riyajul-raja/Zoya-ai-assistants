const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// The bottom of the file from app.listen(PORT... should just be standard startServer
content = content.replace(/app\.listen\(PORT, "0\.0\.0\.0", \(\) => \{[\s\S]*\}\nstartServer\(\);/, `app.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });
}
startServer();`);

fs.writeFileSync('server.ts', content);
