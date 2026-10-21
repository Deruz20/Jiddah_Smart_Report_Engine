import { createClient } from '@supabase/supabase-js';
import { getRehearsalCredentials } from './rehearsal-credentials.mjs';

const credentials = getRehearsalCredentials();
const target = new URL(credentials.apiUrl);
if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.port !== '54321') {
  throw new Error('Refusing to inspect a non-local rehearsal endpoint.');
}

const client = createClient(credentials.apiUrl, credentials.serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const [{ data: teachers, error: teacherError }, { data: circularClasses, error: circularError }, { data: theologyClasses, error: theologyError }] = await Promise.all([
  client.from('teachers').select('id, classes'),
  client.from('circular_classes').select('id'),
  client.from('theology_classes').select('id'),
]);

if (teacherError) throw new Error(`Unable to read teachers: ${teacherError.message}`);
if (circularError) throw new Error(`Unable to read circular class IDs: ${circularError.message}`);
if (theologyError) throw new Error(`Unable to read theology class IDs: ${theologyError.message}`);

const circularIds = new Set((circularClasses ?? []).map((row) => row.id.toLowerCase()));
const theologyIds = new Set((theologyClasses ?? []).map((row) => row.id.toLowerCase()));
const counts = (teachers ?? []).map((teacher) => {
  const legacyEntries = Array.isArray(teacher.classes)
    ? teacher.classes
    : typeof teacher.classes === 'string'
      ? teacher.classes.split(',')
      : [];
  let circularMatches = 0;
  let theologyMatches = 0;
  let neither = 0;
  let nonUuid = 0;

  for (const entry of legacyEntries) {
    if (typeof entry !== 'string' || !uuidPattern.test(entry.trim())) {
      nonUuid++;
      continue;
    }
    const id = entry.trim().toLowerCase();
    if (circularIds.has(id)) circularMatches++;
    else if (theologyIds.has(id)) theologyMatches++;
    else neither++;
  }

  return {
    teacher_id: teacher.id,
    circular_uuid_matches: circularMatches,
    theology_uuid_matches: theologyMatches,
    neither_uuid_matches: neither,
    non_uuid_entries: nonUuid,
  };
});

console.log(JSON.stringify(counts, null, 2));
