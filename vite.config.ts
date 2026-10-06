import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * GitHub Pages serves a project from a subpath:
 *   https://<user>.github.io/GHOSTINC_STORE/
 *
 * Without a matching `base`, every built asset URL starts at "/" and 404s.
 * Default to "/GHOSTINC_STORE/" for production and override with
 * GITHUB_PAGES_BASE if the repository is ever renamed.
 *
 * `defineConfig` is imported from "vitest/config" rather than "vite" so the
 * `test` block below is typed.
 */
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'
  const base =
    process.env.GITHUB_PAGES_BASE ?? (isProduction ? '/GHOSTINC_STORE/' : '/')

  return {
    plugins: [react()],
    base,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            supabase: ['@supabase/supabase-js'],
          },
        },
      },
    },
    server: {
      port: 5173,
      strictPort: false,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
})
