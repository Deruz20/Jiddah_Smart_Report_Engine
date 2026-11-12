import { SupabaseClient } from '@supabase/supabase-js';

const SUPPORTED_SIGNATURE_FILENAME = /^[a-z0-9-]+\.(?:png|jpe?g|webp)$/i;

export interface SignatureStorageObject {
  name: string
  updated_at?: string | null
}

export interface SignatureStorageBucket {
  list(path: string, options?: { limit?: number }): Promise<{
    data: SignatureStorageObject[] | null
    error: { message: string } | null
  }>
  move(from: string, to: string): Promise<{ error: { message: string } | null }>
  remove(paths: string[]): Promise<{ error: { message: string } | null }>
}

export function getSignatureObjectNamesForSlot(objects: SignatureStorageObject[], slotKey: string): string[] {
  return objects
    .map((object) => object.name)
    .filter((name) => name.startsWith(`${slotKey}.`) && SUPPORTED_SIGNATURE_FILENAME.test(name));
}

export function getLatestSignatureObjectNameForSlot(objects: SignatureStorageObject[], slotKey: string): string | null {
  const latest = objects
    .filter((object) => object.name.startsWith(`${slotKey}.`) && SUPPORTED_SIGNATURE_FILENAME.test(object.name))
    .reduce<SignatureStorageObject | null>((current, object) => {
      if (!current) return object

      const updatedAt = Date.parse(object.updated_at ?? '')
      const currentUpdatedAt = Date.parse(current.updated_at ?? '')
      if (
        (Number.isFinite(updatedAt) && !Number.isFinite(currentUpdatedAt)) ||
        updatedAt > currentUpdatedAt
      ) {
        return object
      }
      return current
    }, null)

  return latest?.name ?? null
}

export async function setSignatureObjectActiveState(
  storage: SignatureStorageBucket,
  slotKey: string,
  active: boolean
): Promise<{ active: boolean; error?: string; status?: number }> {
  const [activeResult, disabledResult] = await Promise.all([
    storage.list('', { limit: 1000 }),
    storage.list('disabled', { limit: 1000 }),
  ])
  if (activeResult.error || disabledResult.error) {
    return {
      active,
      error: activeResult.error?.message ?? disabledResult.error?.message ?? 'Unable to list report images.',
      status: 500,
    }
  }

  const activePaths = getSignatureObjectNamesForSlot(activeResult.data ?? [], slotKey)
  const disabledPaths = getSignatureObjectNamesForSlot(disabledResult.data ?? [], slotKey)

  if (active) {
    if (activePaths.length > 0) return { active: true }
    const selectedPath = getLatestSignatureObjectNameForSlot(disabledResult.data ?? [], slotKey)
    if (!selectedPath) {
      return { active, error: 'No stored image is available to reactivate.', status: 409 }
    }

    const { error: moveError } = await storage.move(`disabled/${selectedPath}`, selectedPath)
    if (moveError) {
      return { active, error: `Unable to reactivate stored image: ${moveError.message}`, status: 500 }
    }

    const stalePaths = disabledPaths
      .filter((path) => path !== selectedPath)
      .map((path) => `disabled/${path}`)
    if (stalePaths.length > 0) {
      const { error: removeError } = await storage.remove(stalePaths)
      if (removeError) {
        return { active, error: `Image reactivated, but older copies could not be removed: ${removeError.message}`, status: 500 }
      }
    }
    return { active: true }
  }

  if (activePaths.length === 0) {
    return disabledPaths.length > 0
      ? { active: false }
      : { active, error: 'No stored image is available to deactivate.', status: 409 }
  }

  if (disabledPaths.length > 0) {
    const { error: removeError } = await storage.remove(disabledPaths.map((path) => `disabled/${path}`))
    if (removeError) {
      return { active, error: `Unable to prepare the deactivated image folder: ${removeError.message}`, status: 500 }
    }
  }

  for (const path of activePaths) {
    const { error: moveError } = await storage.move(path, `disabled/${path}`)
    if (moveError) {
      return { active, error: `Unable to deactivate stored image: ${moveError.message}`, status: 500 }
    }
  }
  return { active: false }
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

  if (c.includes('baby')) {
    baseClass = 'baby';
  } else if (c.includes('middle')) {
    baseClass = 'middle';
  } else if (c.includes('top')) {
    baseClass = 'top';
  } else if (c.includes('p.1') || c.includes('p1') || c.includes('primary 1') || c.includes('primary one')) {
    baseClass = 'p1';
  } else if (c.includes('p.2') || c.includes('p2') || c.includes('primary 2') || c.includes('primary two')) {
    baseClass = 'p2';
  } else if (c.includes('p.3') || c.includes('p3') || c.includes('primary 3') || c.includes('primary three')) {
    baseClass = 'p3';
  } else if (c.includes('p.4') || c.includes('p4') || c.includes('primary 4') || c.includes('primary four')) {
    baseClass = 'p4';
  } else if (c.includes('p.5') || c.includes('p5') || c.includes('primary 5') || c.includes('primary five')) {
    baseClass = 'p5';
  } else if (c.includes('p.6') || c.includes('p6') || c.includes('primary 6') || c.includes('primary six')) {
    baseClass = 'p6';
  } else if (c.includes('p.7') || c.includes('p7') || c.includes('primary 7') || c.includes('primary seven')) {
    baseClass = 'p7';
  } else {
    return null;
  }

  return isTheology ? `theology-teacher-${baseClass}` : `class-teacher-${baseClass}`;
}

export async function getDynamicSignatureSlots(supabase: SupabaseClient) {
  const slots = [
    {
      slot_key: 'school-stamp',
      label: 'Official School Stamp',
      role: 'School',
      description: 'Official circular or rectangular school stamp rendered on terminal report cards.',
      required: true,
    },
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
      slot_key: 'principal',
      label: 'Principal Signature',
      role: 'Principal',
      description: 'Authority signature for official transcripts and school certificates.',
      required: false,
    }
  ];

  // Fetch unique active classes to dynamically create class teacher slots
  const classNames = new Set<string>();
  try {
    const { data: students } = await supabase.from('students').select('class_name, status').eq('status', 'active');
    for (const s of students || []) {
      if (s?.class_name) classNames.add(s.class_name);
    }
  } catch {}

  try {
    const { data: cClasses } = await supabase.from('circular_classes').select('class_name');
    for (const c of cClasses || []) {
      if (c?.class_name) classNames.add(c.class_name);
    }
  } catch {}
  const addedBaseClasses = new Set<string>();

  // Add secular teacher slots
  for (const name of classNames) {
    const key = getClassTeacherSignatureKey(name);
    if (key && !addedBaseClasses.has(key)) {
      addedBaseClasses.add(key);
      
      let prettyName = name;
      if (key.includes('baby')) prettyName = 'Baby Class';
      else if (key.includes('middle')) prettyName = 'Middle Class';
      else if (key.includes('top')) prettyName = 'Top Class';
      else if (key.includes('p1')) prettyName = 'Primary 1';
      else if (key.includes('p2')) prettyName = 'Primary 2';
      else if (key.includes('p3')) prettyName = 'Primary 3';
      else if (key.includes('p4')) prettyName = 'Primary 4';
      else if (key.includes('p5')) prettyName = 'Primary 5';
      else if (key.includes('p6')) prettyName = 'Primary 6';
      else if (key.includes('p7')) prettyName = 'Primary 7';

      slots.push({
        slot_key: key,
        label: `Class Teacher — ${prettyName}`,
        role: 'Class Teacher',
        description: `Signature for ${prettyName} reports.`,
        required: true,
      });
    }
  }

  // Theology uses same class names but theology teachers. We will add those too.
  // Assuming Theology classes match the secular structure.
  addedBaseClasses.clear();
  for (const name of classNames) {
    const key = getClassTeacherSignatureKey(name, true);
    if (key && !addedBaseClasses.has(key)) {
      addedBaseClasses.add(key);
      
      let prettyName = name;
      if (key.includes('baby')) prettyName = 'Baby Class';
      else if (key.includes('middle')) prettyName = 'Middle Class';
      else if (key.includes('top')) prettyName = 'Top Class';
      else if (key.includes('p1')) prettyName = 'Primary 1';
      else if (key.includes('p2')) prettyName = 'Primary 2';
      else if (key.includes('p3')) prettyName = 'Primary 3';
      else if (key.includes('p4')) prettyName = 'Primary 4';
      else if (key.includes('p5')) prettyName = 'Primary 5';
      else if (key.includes('p6')) prettyName = 'Primary 6';
      else if (key.includes('p7')) prettyName = 'Primary 7';

      slots.push({
        slot_key: key,
        label: `Theology Teacher — ${prettyName}`,
        role: 'Theology Teacher',
        description: `Signature for ${prettyName} Theology reports.`,
        required: true,
      });
    }
  }

  return slots;
}
