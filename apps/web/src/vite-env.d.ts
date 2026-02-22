/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_TUNNEL_STATUS: string;
  readonly VITE_UI_V2_TOKENS?: string;
  readonly VITE_DOWNLOAD_MAC: string;
  readonly VITE_DOWNLOAD_WIN: string;
  readonly VITE_DOWNLOAD_LINUX: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __gratoniteHarness?: {
    setCallState: (partial: Record<string, unknown>) => void;
    resetCallState: () => void;
    getCallState: () => Record<string, unknown>;
  };
}
