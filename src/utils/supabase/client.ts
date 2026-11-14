"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey } from "@/lib/supabase-env";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseKey =
  getSupabaseAnonKey() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

let browserClient: any;

export function createClient() {
  if (browserClient) return browserClient;
  
  browserClient = createBrowserClient(
    supabaseUrl!,
    supabaseKey!,
  );
  
  return browserClient;
}
