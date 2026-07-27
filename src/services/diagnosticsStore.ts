export type Provider = "gemini";
export interface ProviderDiagnostic {
  provider: Provider;
  modelName: string;
  latencyMs: number;
  tokenUsage: { prompt: number; completion: number; total: number } | null;
  status: "success" | "error" | "pending" | "idle";
  lastError: string | null;
  isConfigured: boolean;
  lastRequestTime: number | null;
}
export type DiagnosticsState = Record<Provider, ProviderDiagnostic>;
let state: DiagnosticsState = {
  gemini: {
    provider: "gemini",
    modelName: "gemini-2.5-flash",
    latencyMs: 0,
    tokenUsage: null,
    status: "idle",
    lastError: null,
    isConfigured: false,
    lastRequestTime: null,
  }
};
type Listener = (state: DiagnosticsState) => void;
const listeners: Set<Listener> = new Set();
export const diagnosticsStore = {
  getState: () => ({ ...state }),
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    listener(state);
    return () => listeners.delete(listener);
  },
  updateProvider: (provider: Provider, update: Partial<ProviderDiagnostic>) => {
    state = {
      ...state,
      [provider]: {
        ...state[provider],
        ...update
      }
    };
    listeners.forEach(l => l(state));
  },
  setConfigured: (provider: Provider, isConfigured: boolean) => {
    diagnosticsStore.updateProvider(provider, { isConfigured });
  }
};
