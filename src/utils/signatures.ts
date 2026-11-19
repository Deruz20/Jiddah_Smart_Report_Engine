import type { SupabaseClient } from '@supabase/supabase-js';

const SUPPORTED_SIGNATURE_FILENAME = /^[a-z0-9_-]+\.(?:png|jpe?g|webp)$/i;

export interface SignatureStorageObject {
  name: string;
  updated_at?: string | null;
  metadata?: {
    size?: number;
    contentLength?: number;
  } | null;
}

export type SignatureStorageBucket = {
  list(path?: string, options?: { limit?: number }): Promise<{
    data: SignatureStorageObject[] | any[] | null;
    error: { message: string } | null;
  }>;
  move(from: string, to: string): Promise<{ data?: any; error: { message: string } | null }>;
  remove(paths: string[]): Promise<{ data?: any; error: { message: string } | null }>;
} | ReturnType<SupabaseClient['storage']['from']>;

export function getSignatureObjectNamesForSlot(
  objects: SignatureStorageObject[],
  slotKey: string
): string[] {
  const prefix = `${slotKey}.`;

  return objects
    .map((object) => object.name)
    .filter((name) => name.startsWith(prefix) && SUPPORTED_SIGNATURE_FILENAME.test(name));
}

export function getLatestSignatureObjectNameForSlot(
  objects: SignatureStorageObject[],
  slotKey: string
): string | null {
  const latest = objects
    .filter((object) => object.name.startsWith(`${slotKey}.`) && SUPPORTED_SIGNATURE_FILENAME.test(object.name))
    .reduce<SignatureStorageObject | null>((current, object) => {
      if (!current) return object;

      const updatedAt = Date.parse(object.updated_at ?? '');
      const currentUpdatedAt = Date.parse(current.updated_at ?? '');
      if (
        (Number.isFinite(updatedAt) && !Number.isFinite(currentUpdatedAt)) ||
        updatedAt > currentUpdatedAt
      ) {
        return object;
      }
      return current;
    }, null);

  return latest?.name ?? null;
}

export async function setSignatureObjectActiveState(
  storage: SignatureStorageBucket,
  slotKey: string,
  active: boolean
): Promise<{ active: boolean; error?: string; status?: number }> {
  const [activeResult, disabledResult] = await Promise.all([
    storage.list('', { limit: 1000 }),
    storage.list('disabled', { limit: 1000 }),
  ]);
  if (activeResult.error || disabledResult.error) {
    return {
      active,
      error: activeResult.error?.message ?? disabledResult.error?.message ?? 'Unable to list report images.',
      status: 500,
    };
  }

  const activePaths = getSignatureObjectNamesForSlot(activeResult.data ?? [], slotKey);
  const disabledPaths = getSignatureObjectNamesForSlot(disabledResult.data ?? [], slotKey);

  if (active) {
    if (activePaths.length > 0) return { active: true };
    const selectedPath = getLatestSignatureObjectNameForSlot(disabledResult.data ?? [], slotKey);
    if (!selectedPath) {
      return { active, error: 'No stored image is available to reactivate.', status: 409 };
    }

    const { error: moveError } = await storage.move(`disabled/${selectedPath}`, selectedPath);
    if (moveError) {
      return { active, error: `Unable to reactivate stored image: ${moveError.message}`, status: 500 };
    }

    const stalePaths = disabledPaths
      .filter((path) => path !== selectedPath)
      .map((path) => `disabled/${path}`);
    if (stalePaths.length > 0) {
      const { error: removeError } = await storage.remove(stalePaths);
      if (removeError) {
        return { active, error: `Image reactivated, but older copies could not be removed: ${removeError.message}`, status: 500 };
      }
    }
    return { active: true };
  }

  if (activePaths.length === 0) {
    return disabledPaths.length > 0
      ? { active: false }
      : { active, error: 'No stored image is available to deactivate.', status: 409 };
  }

  if (disabledPaths.length > 0) {
    const { error: removeError } = await storage.remove(disabledPaths.map((path) => `disabled/${path}`));
    if (removeError) {
      return { active, error: `Unable to prepare the deactivated image folder: ${removeError.message}`, status: 500 };
    }
  }

  for (const path of activePaths) {
    const { error: moveError } = await storage.move(path, `disabled/${path}`);
    if (moveError) {
      return { active, error: `Unable to deactivate stored image: ${moveError.message}`, status: 500 };
    }
  }
  return { active: false };
}

export async function deleteSignatureSlotObject(
  storage: SignatureStorageBucket,
  slotKey: string
): Promise<{ success: boolean; error?: string; status?: number }> {
  const [activeResult, disabledResult] = await Promise.all([
    storage.list('', { limit: 1000 }),
    storage.list('disabled', { limit: 1000 }),
  ])
  if (activeResult.error || disabledResult.error) {
    return {
      success: false,
      error: activeResult.error?.message ?? disabledResult.error?.message ?? 'Unable to list report images.',
      status: 500,
    }
  }

  const activePaths = getSignatureObjectNamesForSlot(activeResult.data ?? [], slotKey)
  const disabledPaths = getSignatureObjectNamesForSlot(disabledResult.data ?? [], slotKey).map((p) => `disabled/${p}`)
  const allPaths = [...activePaths, ...disabledPaths]

  if (allPaths.length === 0) {
    return { success: false, error: 'No stored image found to delete.', status: 404 }
  }

  const { error: removeError } = await storage.remove(allPaths)
  if (removeError) {
    return { success: false, error: `Unable to delete stored image: ${removeError.message}`, status: 500 }
  }

  return { success: true }
}

function resolveBaseClassSlug(className: string | undefined | null): string | null {
  if (!className) return null;
  const c = className.toLowerCase().trim();

  if (c.includes('baby') || c.includes('lower kindergarten') || c.includes('الروضة السفلى')) {
    return 'baby';
  } else if (c.includes('middle') || c.includes('middle kindergarten') || c.includes('الروضة الوسطى')) {
    return 'middle';
  } else if (c.includes('top') || c.includes('upper kindergarten') || c.includes('الروضة العليا')) {
    return 'top';
  } else if (c === '1' || c.includes('p.1') || c.includes('p1') || c.includes('primary 1') || c.includes('primary one') || c.includes('الصف الأول') || c.includes('الأول') || c.includes('الأولى')) {
    return 'p1';
  } else if (c === '2' || c.includes('p.2') || c.includes('p2') || c.includes('primary 2') || c.includes('primary two') || c.includes('الصف الثاني') || c.includes('الثاني') || c.includes('الثانية')) {
    return 'p2';
  } else if (c === '3' || c.includes('p.3') || c.includes('p3') || c.includes('primary 3') || c.includes('primary three') || c.includes('الصف الثالث') || c.includes('الثالث') || c.includes('الثالثة')) {
    return 'p3';
  } else if (c === '4' || c.includes('p.4') || c.includes('p4') || c.includes('primary 4') || c.includes('primary four') || c.includes('الصف الرابع') || c.includes('الرابع') || c.includes('الرابعة')) {
    return 'p4';
  } else if (c === '5' || c.includes('p.5') || c.includes('p5') || c.includes('primary 5') || c.includes('primary five') || c.includes('الصف الخامس') || c.includes('الخامس') || c.includes('الخامسة')) {
    return 'p5';
  } else if (c === '6' || c.includes('p.6') || c.includes('p6') || c.includes('primary 6') || c.includes('primary six') || c.includes('الصف السادس') || c.includes('السادس') || c.includes('السادسة')) {
    return 'p6';
  } else if (c === '7' || c.includes('p.7') || c.includes('p7') || c.includes('primary 7') || c.includes('primary seven') || c.includes('الصف السابع') || c.includes('السابع') || c.includes('السابعة')) {
    return 'p7';
  }
  return null;
}

export function getClassTeacherSignatureKey(className: string | undefined | null, isTheology: boolean = false): string | null {
  const baseClass = resolveBaseClassSlug(className);
  if (!baseClass) return null;
  return isTheology ? `theology_class_teacher_${baseClass}` : `secular_class_teacher_${baseClass}`;
}

export function getLegacyClassTeacherSignatureKey(className: string | undefined | null, isTheology: boolean = false): string | null {
  const baseClass = resolveBaseClassSlug(className);
  if (!baseClass) return null;
  return isTheology ? `theology-teacher-${baseClass}` : `class-teacher-${baseClass}`;
}

export function getReportSignatureKeys(): string[] {
  const classNames = [
    'Baby Class',
    'Middle Class',
    'Top Class',
    'Primary 1',
    'Primary 2',
    'Primary 3',
    'Primary 4',
    'Primary 5',
    'Primary 6',
    'Primary 7',
  ];

  const classTeacherKeys = classNames.flatMap((className) => [
    getClassTeacherSignatureKey(className),
    getClassTeacherSignatureKey(className, true),
    getLegacyClassTeacherSignatureKey(className),
    getLegacyClassTeacherSignatureKey(className, true),
  ]);

  return [
    'head-teacher',
    'principal',
    'school-stamp',
    'dos-secular',
    'dos-theology',
    'theology-head',
    ...classTeacherKeys,
  ].filter((key): key is string => Boolean(key));
}

/**
 * Strictly separates dual-curriculum signature keys for a single student report
 * so secular class teacher, theology class teacher, DOS secular, DOS theology,
 * and head teacher NEVER cross-wire or overwrite one another.
 */
export function buildStudentReportSignatures(
  baseSignatures: Record<string, string | null>,
  secularClassName?: string | null,
  theologyClassName?: string | null
): Record<string, string | null> {
  const secKey = getClassTeacherSignatureKey(secularClassName, false);
  const theoKey = getClassTeacherSignatureKey(theologyClassName, true);
  const legacySecKey = getLegacyClassTeacherSignatureKey(secularClassName, false);
  const legacyTheoKey = getLegacyClassTeacherSignatureKey(theologyClassName, true);

  const headTeacherUrl = baseSignatures['head-teacher'] ?? baseSignatures['head_teacher'] ?? null;
  const dosSecularUrl = baseSignatures['dos-secular'] ?? baseSignatures['dos_secular'] ?? null;
  const dosTheologyUrl = baseSignatures['dos-theology'] ?? baseSignatures['dos_theology'] ?? null;

  const secularTeacherUrl =
    (secKey ? baseSignatures[secKey] : null) ??
    (legacySecKey ? baseSignatures[legacySecKey] : null) ??
    null;
  const theologyTeacherUrl =
    (theoKey ? baseSignatures[theoKey] : null) ??
    (legacyTheoKey ? baseSignatures[legacyTheoKey] : null) ??
    null;

  return {
    ...baseSignatures,
    'head-teacher': headTeacherUrl,
    head_teacher: headTeacherUrl,
    dos_secular: dosSecularUrl,
    dos_theology: dosTheologyUrl,
    secular_class_teacher: secularTeacherUrl,
    theology_class_teacher: theologyTeacherUrl,
  };
}

export function buildBaseSignaturesFromStorageObjects(
  supabase: SupabaseClient,
  objects: SignatureStorageObject[] | null | undefined
): Record<string, string | null> {
  const signatures: Record<string, string | null> = {
    'head-teacher': null,
    'principal': null,
    'school-stamp': null,
    'dos-secular': null,
    'dos-theology': null,
  };
  const sorted = [...(objects ?? [])].sort((a, b) => {
    const tA = Date.parse(a?.updated_at ?? '') || 0;
    const tB = Date.parse(b?.updated_at ?? '') || 0;
    return tA - tB;
  });
  for (const object of sorted) {
    if (!object?.name) continue;
    const match = object.name.match(/^([a-z0-9_-]+?)(?:__\d+)?\.(?:png|jpe?g|webp)$/i);
    if (match) {
      const publicUrl = supabase.storage.from('signatures').getPublicUrl(object.name).data?.publicUrl ?? null;
      signatures[match[1]] = publicUrl ? withSignatureVersion(publicUrl, object.updated_at ?? object.name) : null;
    }
  }
  return signatures;
}

export function mapLatestSignatureObjects(
  objects: SignatureStorageObject[],
  keys: string[] = getReportSignatureKeys()
): Map<string, SignatureStorageObject> {
  const latestByKey = new Map<string, SignatureStorageObject>();

  for (const object of objects) {
    if (!SUPPORTED_SIGNATURE_FILENAME.test(object.name)) continue;
    const key = keys.find((candidate) => object.name.startsWith(`${candidate}.`));
    if (!key) continue;

    const current = latestByKey.get(key);
    if (!current) {
      latestByKey.set(key, object);
      continue;
    }

    const updatedAt = Date.parse(object.updated_at ?? '');
    const currentUpdatedAt = Date.parse(current.updated_at ?? '');
    if (
      (Number.isFinite(updatedAt) && !Number.isFinite(currentUpdatedAt)) ||
      updatedAt > currentUpdatedAt
    ) {
      latestByKey.set(key, object);
    }
  }

  return latestByKey;
}

export function withSignatureVersion(url: string, updatedAt: string | null | undefined): string {
  if (!updatedAt) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${encodeURIComponent(updatedAt)}`;
}

export async function getReportSignatures(supabase: SupabaseClient) {
  const keys = getReportSignatureKeys();
  const { data: objects, error } = await supabase.storage
    .from('signatures')
    .list('', { limit: 1000 });
  if (error) {
    throw new Error(`Unable to load report stamp: ${error.message}`);
  }

  const stamp = mapLatestSignatureObjects(objects ?? [], ['school-stamp']).get('school-stamp');
  const stampUrl = stamp
    ? supabase.storage.from('signatures').getPublicUrl(stamp.name).data?.publicUrl ?? null
    : null;
  const signatures = Object.fromEntries(keys.map((key) => [key, null])) as Record<string, string | null>;
  signatures['school-stamp'] = stampUrl ? withSignatureVersion(stampUrl, stamp.updated_at) : null;
  return signatures;
}

export async function getDynamicSignatureSlots(supabase: SupabaseClient) {
  const slots = [
    {
      slot_key: 'principal',
      label: 'Principal Signature',
      role: 'Principal',
      description: 'Authorized signature of the School Principal.',
      required: false,
    },
    {
      slot_key: 'head-teacher',
      label: 'Headteacher Signature',
      role: 'Head Teacher',
      description: 'Authorized signature of the Headteacher rendered across all secular and theology reports.',
      required: true,
    },
    {
      slot_key: 'dos-secular',
      label: 'DOS Secular Signature',
      role: 'DOS Secular',
      description: 'Authorized signature of the Director of Studies (Secular Curriculum).',
      required: false,
    },
    {
      slot_key: 'dos-theology',
      label: 'DOS Theology Signature',
      role: 'DOS Theology',
      description: 'Authorized signature of the Director of Studies (Theology / Arabic Curriculum).',
      required: false,
    },
    {
      slot_key: 'school-stamp',
      label: 'Official School Stamp',
      role: 'School',
      description: 'Official circular or rectangular school stamp rendered on terminal report cards.',
      required: true,
    },
  ];

  const [enrollmentsRes, circularClassesRes, theologyClassesRes] = await Promise.all([
    supabase
      .from('enrollments')
      .select(`
        circular_classes ( class_name ),
        theology_classes ( class_name_english, class_name_arabic ),
        students!inner ( is_archived )
      `)
      .eq('is_active', true)
      .eq('students.is_archived', false),
    supabase.from('circular_classes').select('class_name'),
    supabase.from('theology_classes').select('class_name_english, class_name_arabic'),
  ]);

  if (enrollmentsRes.error) {
    throw new Error(`Unable to load active enrollments for signature slots: ${enrollmentsRes.error.message}`);
  }

  const circularClassNames = new Set<string>();
  const theologyClassNames = new Set<string>();
  for (const c of circularClassesRes.data ?? []) {
    if (c?.class_name) circularClassNames.add(c.class_name);
  }
  for (const t of theologyClassesRes.data ?? []) {
    const label = t?.class_name_english || t?.class_name_arabic;
    if (label) theologyClassNames.add(label);
  }
  for (const enrollment of enrollmentsRes.data ?? []) {
    const circularClass = Array.isArray(enrollment.circular_classes)
      ? enrollment.circular_classes[0]
      : enrollment.circular_classes;
    const theologyClass = Array.isArray(enrollment.theology_classes)
      ? enrollment.theology_classes[0]
      : enrollment.theology_classes;
    if (circularClass?.class_name) circularClassNames.add(circularClass.class_name);
    if ((theologyClass as any)?.class_name_english) {
      theologyClassNames.add((theologyClass as any).class_name_english);
    } else if ((theologyClass as any)?.class_name_arabic) {
      theologyClassNames.add((theologyClass as any).class_name_arabic);
    }
  }

  const getClassSortWeight = (name: string) => {
    const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalized.includes('baby')) return 1;
    if (normalized.includes('middle')) return 2;
    if (normalized.includes('top')) return 3;
    const pMatch = normalized.match(/^p(\d+)$/) || normalized.match(/(\d+)/);
    if (pMatch) return 10 + Number(pMatch[1]);
    return 999;
  };

  const getTheologyArabicSuffix = (key: string) => {
    const map: Record<string, string> = {
      'theology_class_teacher_baby': 'الروضة السفلى',
      'theology_class_teacher_middle': 'الروضة الوسطى',
      'theology_class_teacher_top': 'الروضة العليا',
      'theology_class_teacher_p1': 'الصف الأول',
      'theology_class_teacher_p2': 'الصف الثاني',
      'theology_class_teacher_p3': 'الصف الثالث',
      'theology_class_teacher_p4': 'الصف الرابع',
      'theology_class_teacher_p5': 'الصف الخامس',
      'theology_class_teacher_p6': 'الصف السادس',
      'theology-teacher-baby': 'الروضة السفلى',
      'theology-teacher-middle': 'الروضة الوسطى',
      'theology-teacher-top': 'الروضة العليا',
      'theology-teacher-p1': 'الصف الأول',
      'theology-teacher-p2': 'الصف الثاني',
      'theology-teacher-p3': 'الصف الثالث',
      'theology-teacher-p4': 'الصف الرابع',
      'theology-teacher-p5': 'الصف الخامس',
      'theology-teacher-p6': 'الصف السادس',
    };
    return map[key] ? ` (${map[key]})` : '';
  };

  const addTeacherSlots = (classNames: Set<string>, isTheology: boolean) => {
    const sortedNames = Array.from(classNames).sort((a, b) => {
      const weightDiff = getClassSortWeight(a) - getClassSortWeight(b);
      return weightDiff !== 0 ? weightDiff : a.localeCompare(b);
    });

    for (const name of sortedNames) {
      const key = getClassTeacherSignatureKey(name, isTheology);
      if (!key || slots.some((slot) => slot.slot_key === key)) continue;
      // P.7 sits PLE only under the Secular curriculum; Theology stops at P.6.
      if (isTheology && (key === 'theology_class_teacher_p7' || key === 'theology-teacher-p7')) continue;
      const prettyName = name.trim();
      const arabicSuffix = isTheology ? getTheologyArabicSuffix(key) : '';
      slots.push({
        slot_key: key,
        label: `${isTheology ? 'Theology Class Teacher' : 'Secular Class Teacher'} — ${prettyName}${arabicSuffix}`,
        role: isTheology ? 'Theology Class Teacher' : 'Secular Class Teacher',
        description: `Signature for ${prettyName}${isTheology ? ' Theology' : ' Secular'} reports.`,
        required: true,
      });
    }
  };

  addTeacherSlots(circularClassNames, false);
  addTeacherSlots(theologyClassNames, true);

  return slots;
}

/**
 * Resolves the exact set of signature slot keys a user is authorized to view and upload/manage.
 * Returns `null` for Administrators (unrestricted access to all slots including school-stamp and school-logo).
 * Returns a Set<string> for Principal, Head Teacher, DOS, Class Teacher, and Theology Instructor.
 */
export async function resolveAllowedSignatureSlotsForUser(
  supabaseAdmin: SupabaseClient,
  access: {
    isAuthorized: boolean;
    role?: string | null;
    canonicalRole?: string | null;
    filterByDepartment?: 'secular' | 'theology' | 'both';
    filterByClasses?: string[];
    classAssignments?: Array<{ classId: string; classType: 'circular' | 'theology' }>;
    effectivePermissions?: string[];
  }
): Promise<Set<string> | null> {
  if (!access.isAuthorized) return new Set();
  const roleLower = (access.role ?? '').trim().toLowerCase();
  if (
    roleLower === 'administrator' ||
    roleLower === 'admin' ||
    access.canonicalRole === 'Administrator' ||
    roleLower === 'secretary' ||
    access.canonicalRole === 'Secretary' ||
    (access.effectivePermissions ?? []).includes('manage_settings')
  ) {
    return null; // Unrestricted (Admin & Secretary Print QA)
  }

  const allowed = new Set<string>();
  const canonical = access.canonicalRole || '';

  if (canonical === 'Principal' || roleLower === 'principal') {
    allowed.add('principal');
    allowed.add('head-teacher');
    return allowed;
  }

  if (
    canonical === 'Head Teacher' ||
    roleLower === 'head teacher' ||
    roleLower === 'headteacher' ||
    roleLower === 'deputy head teacher' ||
    roleLower === 'deputy headteacher'
  ) {
    allowed.add('head-teacher');
    return allowed;
  }

  const [circRes, theoRes] = await Promise.all([
    supabaseAdmin.from('circular_classes').select('id, class_name'),
    supabaseAdmin.from('theology_classes').select('id, class_name_english, class_name_arabic, level'),
  ]);
  const circClasses = circRes.data ?? [];
  const theoClasses = theoRes.data ?? [];

  if (canonical === 'DOS Secular') {
    allowed.add('dos-secular');
    for (const c of circClasses) {
      const key = getClassTeacherSignatureKey(c.class_name, false);
      const legacyKey = getLegacyClassTeacherSignatureKey(c.class_name, false);
      if (key) allowed.add(key);
      if (legacyKey) allowed.add(legacyKey);
    }
    for (const base of ['baby', 'middle', 'top', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']) {
      allowed.add(`secular_class_teacher_${base}`);
      allowed.add(`class-teacher-${base}`);
    }
    return allowed;
  }

  if (canonical === 'DOS Theology') {
    allowed.add('dos-theology');
    for (const t of theoClasses) {
      const key =
        getClassTeacherSignatureKey(t.class_name_english, true) ||
        getClassTeacherSignatureKey(t.class_name_arabic, true) ||
        (t.level ? getClassTeacherSignatureKey(String(t.level), true) : null);
      const legacyKey =
        getLegacyClassTeacherSignatureKey(t.class_name_english, true) ||
        getLegacyClassTeacherSignatureKey(t.class_name_arabic, true) ||
        (t.level ? getLegacyClassTeacherSignatureKey(String(t.level), true) : null);
      if (key && key !== 'theology_class_teacher_p7') allowed.add(key);
      if (legacyKey && legacyKey !== 'theology-teacher-p7') allowed.add(legacyKey);
    }
    for (const base of ['baby', 'middle', 'top', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6']) {
      allowed.add(`theology_class_teacher_${base}`);
      allowed.add(`theology-teacher-${base}`);
    }
    return allowed;
  }

  // Class Teacher / Theology Instructor — strictly scoped to their assigned class(es) and department
  const assignedIds = new Set<string>(access.filterByClasses ?? []);
  for (const a of access.classAssignments ?? []) {
    if (a?.classId) assignedIds.add(a.classId);
  }

  const dept = access.filterByDepartment ?? 'both';
  if (dept === 'secular' || dept === 'both') {
    for (const c of circClasses) {
      if (assignedIds.has(c.id)) {
        const key = getClassTeacherSignatureKey(c.class_name, false);
        if (key) allowed.add(key);
      }
    }
  }
  if (dept === 'theology' || dept === 'both') {
    for (const t of theoClasses) {
      if (assignedIds.has(t.id)) {
        const key =
          getClassTeacherSignatureKey(t.class_name_english, true) ||
          getClassTeacherSignatureKey(t.class_name_arabic, true) ||
          (t.level ? getClassTeacherSignatureKey(String(t.level), true) : null);
        if (key && key !== 'theology-teacher-p7') allowed.add(key);
      }
    }
  }

  return allowed;
}

