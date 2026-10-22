import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { getSupabaseAnonKey } from "@/lib/supabase-env";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseKey = getSupabaseAnonKey() || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

const SUPABASE_FETCH_TIMEOUT_MS = 25_000;

function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUPABASE_FETCH_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  init?.signal?.addEventListener('abort', onExternalAbort, { once: true });

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
    init?.signal?.removeEventListener('abort', onExternalAbort);
  });
}

export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  const client = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      global: {
        fetch: fetchWithTimeout,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );

  const originalGetUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = async (jwt?: string) => {
    if (jwt) {
      return originalGetUser(jwt);
    }
    try {
      const headerList = await headers();
      const authHeader = headerList.get('authorization') || headerList.get('Authorization');
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        const token = authHeader.slice(7).trim();
        if (token) {
          const res = await originalGetUser(token);
          if (!res.error && res.data?.user) {
            return res;
          }
        }
      }
    } catch {
      // In non-request context, ignore
    }
    return originalGetUser();
  };

  return client;
};

export const createAdminClient = () => {
  const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: { fetch: fetchWithTimeout }
    }
  );
};

