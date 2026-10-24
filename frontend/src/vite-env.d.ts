/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_APP_NAME?: string
  readonly VITE_HR_USER_NAME?: string
  readonly VITE_HR_USER_ROLE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
