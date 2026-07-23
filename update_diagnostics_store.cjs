const fs = require('fs');

const models = [
  { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash", subtitle: "All-around help" },
  { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite", subtitle: "Fastest answers" },
  { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", subtitle: "Balanced speed & intelligence" },
  { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview", subtitle: "Advanced maths and code" },
  { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", subtitle: "Ultra-fast response engine" },
  { id: "gemini-3.0-flash-preview", name: "Gemini 3 Flash Preview", subtitle: "Next-gen experimental model" },
  { id: "gemini-pro-latest", name: "Gemini Pro Latest", subtitle: "Complex reasoning & deep analysis" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", subtitle: "Stable default engine" }
];

let content = `
export type Provider = ${models.map(m => `"${m.id}"`).join(' | ')};

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
${models.map(m => `  "${m.id}": {
    provider: "${m.id}",
    modelName: "${m.name}",
    subtitle: "${m.subtitle}",
    latencyMs: 0,
    tokenUsage: null,
    status: "idle",
    lastError: null,
    isConfigured: false,
    lastRequestTime: null,
  }`).join(',\n')}
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
`;

fs.writeFileSync('src/services/diagnosticsStore.ts', content);
console.log("Updated diagnosticsStore.ts");
