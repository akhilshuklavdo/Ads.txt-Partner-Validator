/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MANAGE_PARTNER_PIN?: string;
  readonly VITE_SECURITY_PIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
