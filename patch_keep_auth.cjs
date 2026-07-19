const fs = require('fs');
let code = fs.readFileSync('src/components/KeepManager.tsx', 'utf8');

// Replace the auth check in JSX
code = code.replace(
  /\{isAuthChecking \? \([\s\S]*?\) : !isAuthenticated \? \([\s\S]*?\) : \(/,
  '{false ? ( <div /> ) : false ? ( <div /> ) : ('
);

fs.writeFileSync('src/components/KeepManager.tsx', code);
console.log('Patched KeepManager auth UI check');
