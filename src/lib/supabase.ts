/**
 * The Supabase client.
 *
 * Both values come from Vite environment variables, which are inlined at build
 * time and therefore public. That is expected: Supabase's anon key is designed
 * to be shipped to the browser. What protects the data is RLS on the database —
 * see supabase/migrations/001_ecommerce_schema.sql.
 *
 * The client is intentionally *not* parameterised with a generated `Database`
 * type. Without a real project there is nothing to generate from, and a
 * hand-written generic is easy to get wrong in ways that only show up at build
 * time. Row shapes are declared in src/types/database.ts and asserted at the
 * call site instead. Once a Supabase project exists, run
 *
 *   npx supabase gen types typescript --project-id <ref> --out src/types/db.ts
 *
 * and swap the client over to `createClient<Database>(...)`.
 *
 * If the variables are missing the app still builds and runs; it shows a
 * configuration message instead of pretending the catalogue is empty.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && anonKey)

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!isConfigured) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and ' +
        'VITE_SUPABASE_ANON_KEY, then restart the dev server.',
    )
  }

  if (!client) {
    client = createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      global: {
        headers: { 'x-application-name': 'ghostinc-store' },
      },
    })
  }

  return client
}

/** Narrow a supabase-js error, which arrives typed as `any`. */
export function describeError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}
