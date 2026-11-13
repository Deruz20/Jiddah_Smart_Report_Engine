import { createClient } from '@supabase/supabase-js'
import { getServerSupabaseKey, getSupabaseAnonKey } from '@/lib/supabase-env'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co'
const supabaseKey =
  getServerSupabaseKey() ||
  getSupabaseAnonKey() ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy'

export const supabase = createClient(supabaseUrl, supabaseKey)
