
export type Provider = "gemini-3.6-flash" | "gemini-3.5-flash-lite" | "gemini-3.5-flash" | "gemini-3.1-pro-preview" | "gemini-3.1-flash-lite" | "gemini-3.0-flash-preview" | "gemini-pro-latest" | "gemini-2.5-flash";

export interface ProviderDiagnostic {
  provider: Provider;
  modelName: string;
  subtitle: string;
  latencyMs: number;
  tokenUsage: { prompt: number; completion: number; total: number } | null;
  status: "success" | "error" | "pending" | "idle";
  lastError: string | null;
  isConfigured: boolean;
  lastRequestTime: number | null;
}

export type DiagnosticsState = Record<Provider, ProviderDiagnostic>;

let state: DiagnosticsState = {
  "gemini-3.6-flash": {
    provider: "gemini-3.6-flash",
    modelName: "Gemini 3.6 Flash",
    subtitle: "All-around help",
    latencyMs: 0,
    tokenUsage: null,
    status: "idle",
    lastError: null,
    isConfigured: false,
    lastRequestTime: null,
  },
  "gemini-3.5-flash-lite": {
    provider: "gemini-3.5-flash-lite",
    modelName: "Gemini 3.5 Flash Lite",
    subtitle: "Fastest answers",
    latencyMs: 0,
    tokenUsage: null,
    status: "idle",
    lastError: null,
    isConfigured: false,
    lastRequestTime: null,
  },
  "gemini-3.5-flash": {
    provider: "gemini-3.5-flash",
    modelName: "Gemini 3.5 Flash",
    subtitle: "Balanced speed & intelligence",
    latencyMs: 0,
    tokenUsage: null,
    status: "idle",
    lastError: null,
    isConfigured: false,
    lastRequestTime: null,
  },
  "gemini-3.1-pro-preview": {
    provider: "gemini-3.1-pro-preview",
    modelName: "Gemini 3.1 Pro Preview",
    subtitle: "Advanced maths and code",
    latencyMs: 0,
    tokenUsage: null,
    status: "idle",
    lastError: null,
    isConfigured: false,
    lastRequestTime: null,
  },
  "gemini-3.1-flash-lite": {
    provider: "gemini-3.1-flash-lite",
    modelName: "Gemini 3.1 Flash Lite",
    subtitle: "Ultra-fast response engine",
    latencyMs: 0,
    tokenUsage: null,
    status: "idle",
    lastError: null,
    isConfigured: false,
    lastRequestTime: null,
  },
  "gemini-3.0-flash-preview": {
    provider: "gemini-3.0-flash-preview",
    modelName: "Gemini 3 Flash Preview",
    subtitle: "Next-gen experimental model",
    latencyMs: 0,
    tokenUsage: null,
    status: "idle",
    lastError: null,
    isConfigured: false,
    lastRequestTime: null,
  },
  "gemini-pro-latest": {
    provider: "gemini-pro-latest",
    modelName: "Gemini Pro Latest",
    subtitle: "Complex reasoning & deep analysis",
    latencyMs: 0,
    tokenUsage: null,
    status: "idle",
    lastError: null,
    isConfigured: false,
    lastRequestTime: null,
  },
  "gemini-2.5-flash": {
    provider: "gemini-2.5-flash",
    modelName: "Gemini 2.5 Flash",
    subtitle: "Stable default engine",
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
  },
  setAllConfigured: (isConfigured: boolean) => {
    Object.keys(state).forEach((provider) => {
      diagnosticsStore.updateProvider(provider as Provider, { isConfigured });
    });
  }
};
