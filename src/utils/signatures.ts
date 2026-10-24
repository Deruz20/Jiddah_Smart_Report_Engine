import type { SupabaseClient } from '@supabase/supabase-js';

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

export interface SignatureStorageObject {
  name: string;
  updated_at?: string | null;
  metadata?: {
    size?: number;
    contentLength?: number;
  } | null;
}

export function mapLatestSignatureObjects(
  objects: SignatureStorageObject[],
  keys: string[] = getReportSignatureKeys()
): Map<string, SignatureStorageObject> {
  const latestByKey = new Map<string, SignatureStorageObject>();
  const supportedFileName = /^[a-z0-9-]+\.(?:png|jpe?g|webp)$/i;

  for (const object of objects) {
    if (!supportedFileName.test(object.name)) continue;
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
  const { data: objects, error } = await supabase.storage
    .from('signatures')
    .list('', { limit: 1000 });

  if (error) {
    throw new Error(`Unable to load report signatures: ${error.message}`);
  }

  const keys = getReportSignatureKeys();
  const latest = mapLatestSignatureObjects(objects ?? [], keys);
  const storage = supabase.storage.from('signatures');

  return Object.fromEntries(
    keys.map((key) => {
      const object = latest.get(key);
      if (!object) return [key, null];
      const publicUrl = storage.getPublicUrl(object.name).data?.publicUrl ?? null;
      return [key, publicUrl ? withSignatureVersion(publicUrl, object.updated_at) : null];
    })
  ) as Record<string, string | null>;
}

export async function getDynamicSignatureSlots(supabase: SupabaseClient) {
  const slots = [
    {
      slot_key: 'school-stamp',
      label: 'Official School Stamp',
      role: 'School',
      description: 'PNG stamp image used on official student reports.',
      required: true,
    },
    {
      slot_key: 'head-teacher',
      label: 'Head Teacher Signature',
      role: 'Head Teacher',
      description: 'Used on all student report cards. Must be a clear scan or photo.',
      required: true,
    },
    {
      slot_key: 'principal',
      label: 'Principal Signature',
      role: 'Principal',
      description: 'Authority signature for official reports and certificates.',
      required: true,
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

  const addTeacherSlots = (classNames: Set<string>, isTheology: boolean) => {
    for (const name of classNames) {
      const key = getClassTeacherSignatureKey(name, isTheology);
      if (!key || slots.some((slot) => slot.slot_key === key)) continue;
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
