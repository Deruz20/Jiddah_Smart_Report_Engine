"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy';

let browserClient: any;

export function createClient() {
  if (browserClient) return browserClient;
  
  browserClient = createBrowserClient(
    supabaseUrl!,
    supabaseKey!,
  );
  
  return browserClient;
}
