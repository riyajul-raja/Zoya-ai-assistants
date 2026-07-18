import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Flag to indicate if we are in the middle of a sign-in flow
let isSigningIn = false;
// Cache the access token in memory and local storage
let cachedAccessToken: string | null = localStorage.getItem('zoya_google_token');

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    // Re-read from localStorage just in case
    cachedAccessToken = localStorage.getItem('zoya_google_token');
    
    // In our new GIS flow, we bypass Firebase Auth for Google, so 'user' might be null here
    // but if we have a valid cachedAccessToken, we consider it authenticated for API usage.
    if (user || cachedAccessToken) {
      if (cachedAccessToken) {
        // Create a mock user if one doesn't exist so components don't crash
        const activeUser = user || {
          uid: 'google-oauth-user',
          displayName: 'Google User',
          email: '',
          photoURL: null
        } as unknown as User;
        if (onAuthSuccess) onAuthSuccess(activeUser, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        localStorage.removeItem('zoya_google_token');
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      localStorage.removeItem('zoya_google_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (customScopes?: string[]): Promise<{ user: User; accessToken: string } | null> => {
  return new Promise((resolve, reject) => {
    isSigningIn = true;
    
    const defaultScopes = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/contacts.readonly';
    const scopes = customScopes && customScopes.length > 0 
      ? customScopes.join(' ') 
      : defaultScopes;

    const handleSuccess = (tokenResponse: any) => {
      if (tokenResponse && tokenResponse.access_token) {
        cachedAccessToken = tokenResponse.access_token;
        localStorage.setItem('zoya_google_token', tokenResponse.access_token);
        
        // Mock user object to satisfy the expected return type without Firebase
        const mockUser = {
          uid: 'google-oauth-user',
          email: '',
          displayName: 'Google User',
          photoURL: null,
        } as unknown as User;

        isSigningIn = false;
        resolve({ user: mockUser, accessToken: cachedAccessToken });
      } else {
        isSigningIn = false;
        reject(new Error('Failed to get access token from Google Identity Services'));
      }
    };

    const loadAndInit = () => {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '866655994820-p1vng5399ae5lnnhu22gniatk5hlda57.apps.googleusercontent.com',
          scope: scopes,
          callback: handleSuccess,
          error_callback: (error: any) => {
            isSigningIn = false;
            reject(error);
          }
        });
        client.requestAccessToken();
      } catch (e) {
        isSigningIn = false;
        reject(e);
      }
    };

    // Load GIS script if not present
    if (!(window as any).google?.accounts?.oauth2) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = loadAndInit;
      script.onerror = () => {
        isSigningIn = false;
        reject(new Error('Failed to load Google Identity Services script'));
      };
      document.body.appendChild(script);
    } else {
      loadAndInit();
    }
  });
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken || localStorage.getItem('zoya_google_token');
};

export const setAccessToken = (token: string) => {
  cachedAccessToken = token;
  localStorage.setItem('zoya_google_token', token);
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  localStorage.removeItem('zoya_google_token');
};
