import type { SupabaseClient } from '@supabase/supabase-js';

const SUPPORTED_SIGNATURE_FILENAME = /^[a-z0-9-]+\.(?:png|jpe?g|webp)$/i;

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

export function getClassTeacherSignatureKey(className: string | undefined | null, isTheology: boolean = false): string | null {
  if (!className) return null;
  const c = className.toLowerCase().trim();
  
  let baseClass = '';

  if (c.includes('baby') || c.includes('lower kindergarten') || c.includes('الروضة السفلى')) {
    baseClass = 'baby';
  } else if (c.includes('middle') || c.includes('middle kindergarten') || c.includes('الروضة الوسطى')) {
    baseClass = 'middle';
  } else if (c.includes('top') || c.includes('upper kindergarten') || c.includes('الروضة العليا')) {
    baseClass = 'top';
  } else if (c.includes('p.1') || c.includes('p1') || c.includes('primary 1') || c.includes('primary one') || c.includes('الصف الأول')) {
    baseClass = 'p1';
  } else if (c.includes('p.2') || c.includes('p2') || c.includes('primary 2') || c.includes('primary two') || c.includes('الصف الثاني')) {
    baseClass = 'p2';
  } else if (c.includes('p.3') || c.includes('p3') || c.includes('primary 3') || c.includes('primary three') || c.includes('الصف الثالث')) {
    baseClass = 'p3';
  } else if (c.includes('p.4') || c.includes('p4') || c.includes('primary 4') || c.includes('primary four') || c.includes('الصف الرابع')) {
    baseClass = 'p4';
  } else if (c.includes('p.5') || c.includes('p5') || c.includes('primary 5') || c.includes('primary five') || c.includes('الصف الخامس')) {
    baseClass = 'p5';
  } else if (c.includes('p.6') || c.includes('p6') || c.includes('primary 6') || c.includes('primary six') || c.includes('الصف السادس')) {
    baseClass = 'p6';
  } else if (c.includes('p.7') || c.includes('p7') || c.includes('primary 7') || c.includes('primary seven') || c.includes('الصف السابع')) {
    baseClass = 'p7';
  } else {
    return null;
  }

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
  ]);

  return ['head-teacher', 'principal', 'school-stamp', ...classTeacherKeys]
    .filter((key): key is string => Boolean(key));
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
      slot_key: 'head-teacher',
      label: 'Headteacher Signature',
      role: 'Head Teacher',
      description: 'Authorized signature of the Headteacher rendered across all secular and theology reports.',
      required: true,
    },
    {
      slot_key: 'dos-signature',
      label: 'Director of Studies (DOS) Signature',
      role: 'DOS',
      description: 'Authorized signature for the Director of Studies (Secular Curriculum).',
      required: true,
    },
    {
      slot_key: 'theology-head',
      label: 'Theology Head Signature',
      role: 'DOS Theology',
      description: 'Authorized signature for the Head of Theology / Islamic Studies.',
      required: true,
    },
    {
      slot_key: 'school-stamp',
      label: 'Official School Stamp',
      role: 'School',
      description: 'Official circular or rectangular school stamp rendered on terminal report cards.',
      required: true,
    },
    {
      slot_key: 'principal',
      label: 'Principal Signature',
      role: 'Principal',
      description: 'Authority signature for official transcripts and school certificates.',
      required: false,
    }
  ];

  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select(`
      circular_classes ( class_name ),
      theology_classes ( class_name_english ),
      students!inner ( is_archived )
    `)
    .eq('is_active', true)
    .eq('students.is_archived', false);

  if (error) {
    throw new Error(`Unable to load active enrollments for signature slots: ${error.message}`);
  }

  const circularClassNames = new Set<string>();
  const theologyClassNames = new Set<string>();
  for (const enrollment of enrollments ?? []) {
    const circularClass = Array.isArray(enrollment.circular_classes)
      ? enrollment.circular_classes[0]
      : enrollment.circular_classes;
    const theologyClass = Array.isArray(enrollment.theology_classes)
      ? enrollment.theology_classes[0]
      : enrollment.theology_classes;
    if (circularClass?.class_name) circularClassNames.add(circularClass.class_name);
    if (theologyClass?.class_name_english) theologyClassNames.add(theologyClass.class_name_english);
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

  const addTeacherSlots = (classNames: Set<string>, isTheology: boolean) => {
    const sortedNames = Array.from(classNames).sort((a, b) => {
      const weightDiff = getClassSortWeight(a) - getClassSortWeight(b);
      return weightDiff !== 0 ? weightDiff : a.localeCompare(b);
    });

    for (const name of sortedNames) {
      const key = getClassTeacherSignatureKey(name, isTheology);
      if (!key || slots.some((slot) => slot.slot_key === key)) continue;
      // P.7 sits PLE only under the Secular curriculum; Theology stops at P.6.
      if (isTheology && key === 'theology-teacher-p7') continue;
      const prettyName = name.trim();
      slots.push({
        slot_key: key,
        label: `${isTheology ? 'Theology Teacher' : 'Class Teacher'} — ${prettyName}`,
        role: isTheology ? 'Theology Teacher' : 'Class Teacher',
        description: `Signature for ${prettyName}${isTheology ? ' Theology' : ''} reports.`,
        required: true,
      });
    }
  };

  addTeacherSlots(circularClassNames, false);
  addTeacherSlots(theologyClassNames, true);

  return slots;
}
