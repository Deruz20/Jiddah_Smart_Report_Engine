import { createAdminClient, createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import TeachersClient, { DashboardTeacher } from '@/components/layout/teachers-client'
import { verifyDataAccess, DEFAULT_ROLE_PERMISSIONS, PERMISSION_KEYS, type PermissionKey } from '@/lib/auth-server'
import { isAdministratorRole, normalizeAccountRole } from '@/lib/teacher-access'

export const dynamic = "force-dynamic";

export default async function TeachersManagementPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div className="p-10">Unauthorized</div>

  const authRes = await verifyDataAccess(supabase, user, 'read');
  if (!authRes.isAuthorized || !isAdministratorRole(authRes.role)) {
    return (
      <div className="p-10 text-red-600 font-semibold" data-testid="teachers-access-denied">
        Access Denied: Administrator access required to manage users, roles, and permissions.
      </div>
    );
  }

  const supabaseAdmin = createAdminClient(cookieStore);

  // Fetch both circular and theology classes + assignments + role_permissions
  const [
    { data: circularClasses },
    { data: theologyClasses },
    { data: classAssignments },
    rolePermsRes,
  ] = await Promise.all([
    supabaseAdmin.from('circular_classes').select('id, class_name, section, class_teacher_id'),
    supabaseAdmin.from('theology_classes').select('id, class_name_english, class_name_arabic'),
    supabaseAdmin.from('teacher_class_assignments').select('teacher_id, class_id'),
    supabaseAdmin.from('role_permissions').select('role, permissions'),
  ]);

  const initialRolePermissions: Record<string, PermissionKey[]> = { ...DEFAULT_ROLE_PERMISSIONS };
  if (!rolePermsRes.error && Array.isArray(rolePermsRes.data)) {
    const validSet = new Set<string>(PERMISSION_KEYS);
    for (const row of rolePermsRes.data) {
      if (row?.role && Array.isArray(row.permissions)) {
        initialRolePermissions[row.role] = row.permissions.filter((k: string): k is PermissionKey =>
          validSet.has(k)
        );
      }
    }
  }
  initialRolePermissions.Administrator = [...PERMISSION_KEYS];

  const classIdToName = new Map<string, string>();
  const classNameToId = new Map<string, string>();

  (circularClasses || []).forEach((c: any) => {
    const label = c.class_name || 'Unnamed Class';
    classIdToName.set(c.id, label);
    classNameToId.set(label.toLowerCase(), c.id);
  });

  (theologyClasses || []).forEach((c: any) => {
    const label = c.class_name_english || c.class_name_arabic || 'Theology Class';
    classIdToName.set(c.id, label);
    if (c.class_name_english) classNameToId.set(c.class_name_english.toLowerCase(), c.id);
    if (c.class_name_arabic) classNameToId.set(c.class_name_arabic.toLowerCase(), c.id);
  });

  const { data: teachers } = await supabaseAdmin
    .from('teachers')
    .select('*')
    .order('name', { ascending: true });

  const formattedTeachers: DashboardTeacher[] = (teachers || []).map((t: any) => {
    const rawList: string[] = Array.isArray(t.classes)
      ? t.classes
      : typeof t.classes === 'string'
      ? t.classes.split(',').map((c: string) => c.trim()).filter(Boolean)
      : [];

    const assignedFromTable = (classAssignments || [])
      .filter((a: any) => a.teacher_id === t.id)
      .map((a: any) => a.class_id);

    const assignedFromCircularLead = (circularClasses || [])
      .filter((c: any) => c.class_teacher_id === t.id)
      .map((c: any) => c.id);

    const combinedTokens = [...new Set([...rawList, ...assignedFromTable, ...assignedFromCircularLead])];

    const resolvedNames: string[] = [];
    const resolvedIds: string[] = [];

    for (const token of combinedTokens) {
      if (classIdToName.has(token)) {
        resolvedNames.push(classIdToName.get(token)!);
        resolvedIds.push(token);
      } else {
        const matchedId = classNameToId.get(String(token).toLowerCase());
        if (matchedId) {
          resolvedIds.push(matchedId);
          resolvedNames.push(classIdToName.get(matchedId) || String(token));
        } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(String(token))) {
          resolvedNames.push(String(token));
        }
      }
    }

    return {
      id: t.id,
      name: t.name || '',
      role: normalizeAccountRole(t.role, t.subject),
      rawRole: t.role || '',
      subject: t.subject || '',
      classes: [...new Set(resolvedNames)],
      classIds: [...new Set(resolvedIds)],
      email: t.email || '',
      username: t.username || (t.email ? String(t.email).split('@')[0] : ''),
      phone: t.phone || '',
      status: t.status || 'active',
      joined: t.created_at || '',
      permissions: Array.isArray(t.permissions) ? t.permissions : [],
    };
  });

  return (
    <div className="w-full h-full bg-[#FDFBF7]">
      <TeachersClient
        initialTeachers={formattedTeachers}
        currentUserRole="admin"
        currentUserSubject="Administration"
        initialRolePermissions={initialRolePermissions}
      />
    </div>
  )
}
