const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldEffect = `  useEffect(() => {
    setShowUpdateToast(true);
    const timer = setTimeout(() => setShowUpdateToast(false), 2500);
    return () => clearTimeout(timer);
  }, []);`;

const newEffect = `  useEffect(() => {
    if (localStorage.getItem('justUpdated') === 'true') {
      setShowUpdateToast(true);
      localStorage.removeItem('justUpdated');
      const timer = setTimeout(() => setShowUpdateToast(false), 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const checkForUpdates = async () => {
      if (document.hidden) return;
      try {
        const response = await fetch(window.location.href, { cache: 'no-cache' });
        const etag = response.headers.get('ETag') || response.headers.get('Last-Modified');
        if (etag) {
          const storedEtag = localStorage.getItem('appVersionHeader');
          if (storedEtag && storedEtag !== etag) {
            localStorage.setItem('justUpdated', 'true');
            localStorage.setItem('appVersionHeader', etag);
            window.location.reload();
          } else if (!storedEtag) {
            localStorage.setItem('appVersionHeader', etag);
          }
        }
      } catch (err) {
        console.error("Update check failed", err);
      }
    };

    checkForUpdates();

    document.addEventListener("visibilitychange", checkForUpdates);
    return () => {
      document.removeEventListener("visibilitychange", checkForUpdates);
    };
  }, []);`;

code = code.replace(oldEffect, newEffect);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx with smart deployment detector");
