import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client with the service role key.
 * Lazy so missing env vars don't crash the Next.js build.
 */
let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  _client = createClient(url, serviceKey ?? anonKey ?? '', {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return _client
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    const c = getClient() as any
    const v = c[prop]
    return typeof v === 'function' ? v.bind(c) : v
  },
})

export const isServiceRoleConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
