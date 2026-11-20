import { SupabaseClient, User } from '@supabase/supabase-js';

export const DEFAULT_SCHOOL_ID = 'c0000000-0000-0000-0000-000000000001';

/**
 * Feature flag indicating whether the multi-tenant database migration
 * (20261120000000_multi_tenant_isolation.sql) has been applied to PostgreSQL.
 * Defaults to false until human review and DBA execution of the migration.
 */
export const MULTI_TENANT_SCHEMA_ENABLED =
  process.env.ENABLE_MULTI_TENANT_RLS === 'true' ||
  process.env.NEXT_PUBLIC_ENABLE_MULTI_TENANT === 'true';

/**
 * Resolves current tenant school ID from request headers, authenticated user metadata,
 * or the teachers database record. Defaults cleanly to DEFAULT_SCHOOL_ID for safe
 * operation both during and after multi-tenant schema migrations.
 */
export async function resolveCurrentSchoolId(
  supabase?: SupabaseClient | null,
  user?: User | null,
  headersOrReq?: Headers | Request | { headers?: Headers | Record<string, string | null> } | null
): Promise<string> {
  // 1. Check request headers (subdomain middleware or API client header)
  if (headersOrReq) {
    let headerVal: string | null = null;
    if ('headers' in headersOrReq && headersOrReq.headers) {
      if (typeof (headersOrReq.headers as Headers).get === 'function') {
        headerVal =
          (headersOrReq.headers as Headers).get('x-tenant-id') ||
          (headersOrReq.headers as Headers).get('x-school-id');
      } else {
        const raw = headersOrReq.headers as Record<string, string | null>;
        headerVal = raw['x-tenant-id'] || raw['x-school-id'] || null;
      }
    } else if (typeof (headersOrReq as Request).headers?.get === 'function') {
      headerVal =
        (headersOrReq as Request).headers.get('x-tenant-id') ||
        (headersOrReq as Request).headers.get('x-school-id');
    }
    if (headerVal && headerVal.trim().length > 0) {
      return headerVal.trim();
    }
  }

  // 2. Check user metadata claims (Supabase auth user app_metadata / user_metadata)
  if (user) {
    const metaSchoolId = (user.app_metadata?.school_id || user.user_metadata?.school_id) as
      | string
      | undefined;
    if (metaSchoolId && typeof metaSchoolId === 'string' && metaSchoolId.trim().length > 0) {
      return metaSchoolId.trim();
    }

    // 3. Query teacher table for assigned school
    if (supabase && MULTI_TENANT_SCHEMA_ENABLED) {
      try {
        const { data } = await supabase
          .from('teachers')
          .select('school_id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (data && 'school_id' in data && data.school_id) {
          return String(data.school_id);
        }
      } catch {
        // Fall back to default if column or table not yet applied
      }
    }
  }

  return DEFAULT_SCHOOL_ID;
}

/**
 * Applies tenant scoping to a Supabase query builder.
 * When MULTI_TENANT_SCHEMA_ENABLED is true, adds .eq('school_id', schoolId).
 */
export function applyTenantScope<T>(query: T, schoolId: string): T {
  if (MULTI_TENANT_SCHEMA_ENABLED && query && typeof (query as any).eq === 'function') {
    return (query as any).eq('school_id', schoolId);
  }
  return query;
}

/**
 * Attaches school_id to mutation payloads for insert/upsert operations.
 */
export function withTenantPayload<P extends Record<string, any>>(payload: P, schoolId: string): P {
  if (MULTI_TENANT_SCHEMA_ENABLED) {
    return { ...payload, school_id: schoolId };
  }
  return payload;
}
