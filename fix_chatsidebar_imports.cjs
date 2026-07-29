const fs = require('fs');
let content = fs.readFileSync('src/components/ChatSidebar.tsx', 'utf8');

content = content.replace(
  "import React, { useState, useMemo } from 'react';",
  "import React, { useState, useMemo, useRef } from 'react';"
);

fs.writeFileSync('src/components/ChatSidebar.tsx', content);
