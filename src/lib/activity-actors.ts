import { normalizeAccountRole } from '@/lib/teacher-access';

export interface ActivityActorTeacherRow {
  id?: string | null;
  auth_user_id?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  subject?: string | null;
}

export interface ActivityActorProfileRow {
  id?: string | null;
  full_name?: string | null;
  role?: string | null;
}

export interface ResolvedActorInfo {
  name: string;
  role: string;
  displayLabel: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function looksLikeUuid(value: unknown): boolean {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

/**
 * Builds an index mapping any teacher.id, teacher.auth_user_id, or profile.id
 * to a human-readable actor name + canonical institutional role.
 */
export function buildActivityActorMap(
  teachers: ActivityActorTeacherRow[] = [],
  profiles: ActivityActorProfileRow[] = []
): Map<string, ResolvedActorInfo> {
  const actorMap = new Map<string, ResolvedActorInfo>();

  for (const p of profiles) {
    if (!p?.id) continue;
    const rawName = (p.full_name || '').trim();
    if (!rawName || looksLikeUuid(rawName)) continue;
    const role = normalizeAccountRole(p.role || 'Staff');
    actorMap.set(p.id, {
      name: rawName,
      role,
      displayLabel: `${rawName} (${role})`,
    });
  }

  for (const t of teachers) {
    const rawName = (t.name || t.email || '').trim();
    if (!rawName || looksLikeUuid(rawName)) continue;
    const role = normalizeAccountRole(t.role || 'Staff', t.subject);
    const info: ResolvedActorInfo = {
      name: rawName,
      role,
      displayLabel: `${rawName} (${role})`,
    };
    if (t.id) actorMap.set(t.id, info);
    if (t.auth_user_id) actorMap.set(t.auth_user_id, info);
  }

  return actorMap;
}

/**
 * Resolves a human-readable actor name & role for an activity log entry,
 * guaranteeing that raw Supabase UUIDs are never displayed in the UI.
 */
export function resolveActivityActor(
  userId: string | null | undefined,
  metadata: Record<string, unknown>,
  actorMap: Map<string, ResolvedActorInfo>
): ResolvedActorInfo {
  if (userId && actorMap.has(userId)) {
    return actorMap.get(userId)!;
  }

  const metaName = typeof metadata?.user_name === 'string' ? metadata.user_name.trim() : '';
  const metaRole = typeof metadata?.user_role === 'string' ? metadata.user_role.trim() : '';
  if (metaName && !looksLikeUuid(metaName)) {
    const role = metaRole || 'Staff';
    return {
      name: metaName,
      role,
      displayLabel: metaRole ? `${metaName} (${metaRole})` : metaName,
    };
  }

  return {
    name: 'School Staff',
    role: 'System',
    displayLabel: 'School Staff (System)',
  };
}

