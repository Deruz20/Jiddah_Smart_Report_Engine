import { SupabaseClient } from '@supabase/supabase-js';

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

  // Fetch unique active classes to dynamically create class teacher slots
  // We'll query students instead of classes since we need to know what classes are actually in use
  const { data: students } = await supabase.from('students').select('class_name, status').eq('status', 'active');
  
  const classNames = new Set(students?.map(s => s.class_name).filter(Boolean) || []);
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

