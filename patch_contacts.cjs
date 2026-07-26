const fs = require('fs');
let code = fs.readFileSync('src/components/ContactsManager.tsx', 'utf8');

const oldInit = `    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setFirebaseUser(user);
        setToken(cachedToken);
        setIsAuthenticated(true);
        setIsAuthChecking(false);
        fetchContacts(cachedToken);
      },
      () => {
        setIsAuthenticated(false);
        setFirebaseUser(null);
        setToken(null);
        setIsAuthChecking(false);
      }
    );`;

const newInit = `    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setFirebaseUser(user);
        setToken(cachedToken);
        setIsAuthenticated(true);
        setIsAuthChecking(false);
        fetchContacts(cachedToken);
      },
      () => {
        setIsAuthenticated(false);
        setFirebaseUser(null);
        setToken(null);
        setIsAuthChecking(false);
      },
      'zoya_google_contacts_token'
    );`;

code = code.replace(oldInit, newInit);

code = code.replace(
  "const result = await googleSignIn();",
  "const result = await googleSignIn(['https://www.googleapis.com/auth/contacts.readonly'], 'zoya_google_contacts_token');"
);

code = code.replace(
  "await logout();",
  "await logout('zoya_google_contacts_token');"
);

// update fetchContacts
const oldFetchContacts = `      if (!response.ok) {
        throw new Error("Failed to fetch contacts");
      }
      const data = await response.json();
      setContacts(data.connections || []);
    } catch (err) {
      console.error("Error fetching contacts:", err);
      onToast("Error loading contacts. Try logging in again.");
    } finally {
      setIsLoadingContacts(false);
    }`;

const newFetchContacts = `      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setIsAuthenticated(false);
          setToken(null);
          return;
        }
        throw new Error("Failed to fetch contacts");
      }
      const data = await response.json();
      setContacts(data.connections || []);
    } catch (err) {
      console.error("Error fetching contacts:", err);
      // Removed red toast since user might just need to log in
    } finally {
      setIsLoadingContacts(false);
    }`;

code = code.replace(oldFetchContacts, newFetchContacts);

fs.writeFileSync('src/components/ContactsManager.tsx', code);
console.log("Patched ContactsManager");
