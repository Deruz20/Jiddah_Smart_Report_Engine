import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import TeachersClient, { DashboardTeacher } from '@/components/layout/teachers-client'
import { verifyDataAccess } from '@/lib/auth-server'
import { normalizeAccountRole } from '@/lib/teacher-access'

export const dynamic = "force-dynamic";

export default async function TeachersManagementPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div className="p-10">Unauthorized</div>

  const authRes = await verifyDataAccess(supabase, user, 'read');
  if (!authRes.isAuthorized) {
    return <div className="p-10 text-red-500">Access Denied: {authRes.message}</div>
  }

  // Fetch both circular and theology classes + assignments to map all UUIDs to human-readable names
  const [
    { data: circularClasses },
    { data: theologyClasses },
    { data: classAssignments },
  ] = await Promise.all([
    supabase.from('circular_classes').select('id, class_name, section, class_teacher_id'),
    supabase.from('theology_classes').select('id, class_name_english, class_name_arabic'),
    supabase.from('teacher_class_assignments').select('teacher_id, class_id'),
  ]);

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

  let query = supabase.from('teachers').select('*').order('name', { ascending: true });

  if (authRes.filterByDepartment === 'secular') {
    query = query.not('subject', 'ilike', '%Theology%');
  } else if (authRes.filterByDepartment === 'theology') {
    query = query.ilike('subject', '%Theology%');
  }

  const { data: teachers } = await query;

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
      subject: t.subject || '',
      classes: [...new Set(resolvedNames)],
      classIds: [...new Set(resolvedIds)],
      email: t.email || '',
      phone: t.phone || '',
      status: t.status || 'active',
      joined: t.created_at || ''
    };
  });

  let currentUserRole = authRes.role || user?.user_metadata?.role || 'Class Teacher';
  let currentUserSubject = '';

  if (user?.email) {
    const { data: profile } = await supabase.from('teachers').select('role, subject').eq('email', user.email).maybeSingle();
    if (profile) {
      currentUserRole = profile.role || currentUserRole;
      currentUserSubject = profile.subject || '';
    }
  }

  if (currentUserRole === 'Administrator' || currentUserRole === 'admin') {
    currentUserRole = 'admin';
  }

  return (
    <div className="w-full h-full bg-[#FDFBF7]">
      <TeachersClient
        initialTeachers={formattedTeachers}
        currentUserRole={currentUserRole}
        currentUserSubject={currentUserSubject}
      />
    </div>
  )
}
