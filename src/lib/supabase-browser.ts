import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseAnonKey } from '@/lib/supabase-env'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co'
const supabaseKey =
  getSupabaseAnonKey() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy'

export function createClient() {
  return createBrowserClient(
    supabaseUrl,
    supabaseKey
    // persistSession defaults to true here — this is what lets the
    // session survive an app reload while offline.
  )
}
