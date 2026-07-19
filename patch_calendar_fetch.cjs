const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarManager.tsx', 'utf8');

const oldFetch = `  // Fetch upcoming events from primary calendar
  const fetchEvents = async (accessToken: string, queryStr = "") => {
    if (!accessToken) {
      setEvents([]);
      return;
    }
    setIsLoading(true);
    try {
      const timeMin = new Date().toISOString();
      let url = \`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=\${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime&maxResults=5\`;
      
      if (queryStr) {
        url += \`&q=\${encodeURIComponent(queryStr)}\`;
      }`;

const newFetch = `  // Fetch upcoming events from primary calendar
  const fetchEvents = async (accessToken: string, queryStr = "", targetMonth?: Date) => {
    if (!accessToken) {
      setEvents([]);
      return;
    }
    setIsLoading(true);
    try {
      const monthToUse = targetMonth || currentMonth;
      const startOfMonth = new Date(monthToUse.getFullYear(), monthToUse.getMonth(), 1);
      const endOfMonth = new Date(monthToUse.getFullYear(), monthToUse.getMonth() + 1, 0, 23, 59, 59);
      
      const timeMin = startOfMonth.toISOString();
      const timeMax = endOfMonth.toISOString();
      
      let url = \`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=\${encodeURIComponent(timeMin)}&timeMax=\${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=100\`;
      
      if (queryStr) {
        url += \`&q=\${encodeURIComponent(queryStr)}\`;
      }`;

code = code.replace(oldFetch, newFetch);

const oldUseEffect = `  // Initialize Auth & Load
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setFirebaseUser(user);
        setToken(cachedToken);
        setIsAuthenticated(true);
        setIsAuthChecking(false);
        setApiMode("real");
        fetchEvents(cachedToken);
      },`;

const newUseEffect = `  // Effect for changing months
  useEffect(() => {
    if (token && isAuthenticated) {
      fetchEvents(token, searchQuery, currentMonth);
    }
  }, [currentMonth]);

  // Initialize Auth & Load
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setFirebaseUser(user);
        setToken(cachedToken);
        setIsAuthenticated(true);
        setIsAuthChecking(false);
        setApiMode("real");
        fetchEvents(cachedToken, "", currentMonth);
      },`;

code = code.replace(oldUseEffect, newUseEffect);

fs.writeFileSync('src/components/CalendarManager.tsx', code);
console.log("Patched fetchEvents");
