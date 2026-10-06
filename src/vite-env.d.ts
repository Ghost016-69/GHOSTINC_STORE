/// <reference types="vite/client" />

/**
 * Vite exposes import.meta.env with these keys. Declaring them here means
 * TypeScript knows about the Supabase pair and fails loudly if a typo slips
 * into an env var name.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
