import { createClient } from '@supabase/supabase-js';
import { getRehearsalCredentials } from './rehearsal-credentials.mjs';

const creds = getRehearsalCredentials();
const SUPABASE_URL = creds.apiUrl;
const serviceKey = creds.serviceRoleKey;

const supabase = createClient(SUPABASE_URL, serviceKey);

const ROLES_TO_SEED = [
  { id: '972af107-555f-4289-9357-5c14119328e5', email: 'admin@test.local', password: 'Password123!', role: 'Administrator', name: 'Synthetic Admin' },
  { id: '47ccf9d7-f514-4e4b-a765-536e29deed84', email: 'head@test.local', password: 'Password123!', role: 'Head Teacher', name: 'Synthetic Head Teacher' },
  { id: '0811a4f1-efab-442e-8f17-dad3adbb82ee', email: 'dos@test.local', password: 'Password123!', role: 'DOS', name: 'Synthetic DOS' },
  { id: 'c599cb13-fb3d-4e5d-8e27-253cb7e5ac1a', email: 'teacher@test.local', password: 'Password123!', role: 'Class Teacher', name: 'Synthetic Class Teacher' },
  { id: '806118f0-3385-47f7-8858-ea4f66f846a6', email: 'theology@test.local', password: 'Password123!', role: 'Theology Instructor', name: 'Synthetic Theology' },
  { id: 'df597ee0-b400-4e46-8d25-2860e07da95b', email: 'staff@test.local', password: 'Password123!', role: 'Support Staff', name: 'Synthetic Support Staff' }
];

export async function seedRehearsalDatabase() {
  console.log('Seeding complete deterministic fixture dataset into rehearsal stack...');

  // 1. School settings
  await supabase.from('school_settings').upsert({
    id: 'current',
    school_name: 'Jiddah Islamic Schools',
    primary_font: 'Inter',
    arabic_font: 'Amiri',
    report_theme_preset: 'emerald',
    theme_color: '#0f766e'
  });

  // 2. Academic terms
  await supabase.from('terms').upsert([
    {
      id: 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111',
      label: 'Term 1, 2026',
      academic_year: '2026',
      term_number: 1,
      is_current: true,
      start_date: '2026-02-01',
      end_date: '2026-05-01',
      next_term_start: '2026-05-25'
    },
    {
      id: 'a1b2c3d4-e5f6-4a1b-8c2d-222222222222',
      label: 'Term 2, 2026',
      academic_year: '2026',
      term_number: 2,
      is_current: false,
      start_date: '2026-05-25',
      end_date: '2026-08-25',
      next_term_start: '2026-09-15'
    },
    {
      id: 'a1b2c3d4-e5f6-4a1b-8c2d-333333333333',
      label: 'Term 3, 2025',
      academic_year: '2025',
      term_number: 3,
      is_current: false,
      start_date: '2025-09-01',
      end_date: '2025-12-01',
      next_term_start: '2026-02-01'
    }
  ]);

  // 3. Circular classes (Primary 1 assigned, Primary 2 unassigned)
  await supabase.from('circular_classes').upsert([
    {
      id: 'c1000000-0000-0000-0000-000000000001',
      class_name: 'Primary 1',
      section: 'lower_primary',
      class_teacher_id: null
    },
    {
      id: 'c1000000-0000-0000-0000-000000000002',
      class_name: 'Primary 2',
      section: 'lower_primary',
      class_teacher_id: null
    }
  ]);

  // 4. Theology classes (P.1 Theology assigned to Class 1, P.2 Theology unassigned)
  await supabase.from('theology_classes').upsert([
    {
      id: 'c0000000-0000-0000-0000-000000000002',
      class_name_arabic: 'الفصل التجريبي',
      class_name_english: '1',
      level: 1
    },
    {
      id: 'c0000000-0000-0000-0000-000000000003',
      class_name_arabic: 'الثانية',
      class_name_english: 'P.2 Theology',
      level: 2
    }
  ]);

  // 5. Subjects & Theology Subjects
  await supabase.from('subjects').upsert([
    {
      id: 'b0000000-0000-0000-0000-000000000001',
      subject_name: 'القرآن الكريم (Quran)',
      curriculum: 'theology',
      section: '1'
    },
    {
      id: 'b0000000-0000-0000-0000-000000000002',
      subject_name: 'الفقه والإسلامية (Fiqh)',
      curriculum: 'theology',
      section: '2'
    }
  ]);

  await supabase.from('theology_subjects').upsert([
    {
      id: 'b0000000-0000-0000-0000-000000000001',
      subject_name: 'القرآن الكريم (Quran)',
      subject_name_arabic: 'القرآن الكريم',
      name_arabic: 'القرآن الكريم',
      section: '1',
      level: 1,
      sort_order: 1
    },
    {
      id: 'b0000000-0000-0000-0000-000000000002',
      subject_name: 'الفقه والإسلامية (Fiqh)',
      subject_name_arabic: 'الفقه والإسلامية',
      name_arabic: 'الفقه والإسلامية',
      section: '2',
      level: 2,
      sort_order: 2
    }
  ]);

  // 6. Seed users & teacher records with deterministic UUID parity
  const { data: userList } = await supabase.auth.admin.listUsers();
  const existingUsers = userList?.users || [];

  for (const item of ROLES_TO_SEED) {
    const existing = existingUsers.find(u => u.email === item.email);
    if (existing && existing.id !== item.id) {
      await supabase.auth.admin.deleteUser(existing.id);
    }

    const { data: refreshedUsers } = await supabase.auth.admin.listUsers();
    const current = refreshedUsers?.users?.find(u => u.email === item.email);

    if (!current) {
      const { error: createErr } = await supabase.auth.admin.createUser({
        id: item.id,
        email: item.email,
        password: item.password,
        email_confirm: true,
        user_metadata: { role: item.role, name: item.name, onboarding_completed: true }
      });
      if (createErr) {
        console.error(`Error creating user ${item.email}:`, createErr.message);
        continue;
      }
    } else {
      await supabase.auth.admin.updateUserById(item.id, {
        password: item.password,
        user_metadata: { role: item.role, name: item.name, onboarding_completed: true }
      });
    }

    await supabase.from('teachers').upsert({
      id: item.id,
      auth_user_id: item.id,
      email: item.email,
      role: item.role,
      name: item.name,
      status: 'active'
    });

    console.log(`✔ Synced ${item.role} (${item.email})`);
  }

  // 7. Teacher class assignment (Assign Class Teacher to circular class Primary 1)
  const teacherId = 'c599cb13-fb3d-4e5d-8e27-253cb7e5ac1a';
  await supabase.from('circular_classes').update({ class_teacher_id: teacherId }).eq('id', 'c1000000-0000-0000-0000-000000000001');
  await supabase.from('teacher_class_assignments').delete().eq('teacher_id', teacherId);
  await supabase.from('teacher_class_assignments').insert({
    teacher_id: teacherId,
    class_id: 'c1000000-0000-0000-0000-000000000001',
    class_type: 'circular'
  });

  // 8. Students & Subjects Cleanup
  // Clean up any extraneous students, enrollments, and test subjects from prior runs
  await supabase.from('theology_marks').delete().not('enrollment_id', 'in', '("e0000000-0000-0000-0000-000000000001","e0000000-0000-0000-0000-000000000002")');
  await supabase.from('theology_subjects').delete().ilike('subject_name_arabic', 'Today%');
  await supabase.from('theology_subjects').delete().ilike('subject_name', 'Today%');
  await supabase.from('circular_subjects').delete().ilike('subject_name', 'Today%');
  await supabase.from('enrollments').delete().not('id', 'in', '("e0000000-0000-0000-0000-000000000001","e0000000-0000-0000-0000-000000000002")');
  await supabase.from('students').delete().not('id', 'in', '("a0000000-0000-0000-0000-000000000001","a0000000-0000-0000-0000-000000000002")');

  const { error: studentErr } = await supabase.from('students').upsert([
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      name: 'Test Student',
      admission_number: 'ADM-001',
      gender: 'male',
      is_archived: false
    },
    {
      id: 'a0000000-0000-0000-0000-000000000002',
      name: 'Unassigned Test Student',
      admission_number: 'ADM-002',
      gender: 'female',
      is_archived: false
    }
  ]);
  if (studentErr) {
    console.error('Error seeding students:', studentErr.message);
  }

  // 9. Enrollments
  const { error: enrollErr } = await supabase.from('enrollments').upsert([
    {
      id: 'e0000000-0000-0000-0000-000000000001',
      student_id: 'a0000000-0000-0000-0000-000000000001',
      circular_class_id: 'c1000000-0000-0000-0000-000000000001',
      theology_class_id: 'c0000000-0000-0000-0000-000000000002',
      academic_year: 2026,
      is_active: true
    },
    {
      id: 'e0000000-0000-0000-0000-000000000002',
      student_id: 'a0000000-0000-0000-0000-000000000002',
      circular_class_id: 'c1000000-0000-0000-0000-000000000002',
      theology_class_id: 'c0000000-0000-0000-0000-000000000003',
      academic_year: 2026,
      is_active: true
    }
  ]);
  if (enrollErr) {
    console.error('Error seeding enrollments:', enrollErr.message);
  }

  // 10. Initial marks for assigned student and unassigned student
  const { data: adminUser } = await supabase.from('teachers').select('id').eq('email', 'admin@test.local').single();
  const adminId = adminUser?.id || teacherId;

  await supabase.from('theology_marks').upsert([
    {
      id: '20da181d-93fe-4b45-b899-70ec5314b4e7',
      enrollment_id: 'e0000000-0000-0000-0000-000000000001',
      subject_id: 'b0000000-0000-0000-0000-000000000001',
      term_id: 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111',
      mot_score: 89,
      eot_score: 91,
      updated_by: teacherId
    },
    {
      id: '30da181d-93fe-4b45-b899-70ec5314b4e8',
      enrollment_id: 'e0000000-0000-0000-0000-000000000002',
      subject_id: 'b0000000-0000-0000-0000-000000000002',
      term_id: 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111',
      mot_score: 75,
      eot_score: 80,
      updated_by: adminId
    }
  ]);

  console.log('✔ Complete rehearsal fixture dataset seeded successfully.');
}

if (process.argv[1]?.endsWith('seed-rehearsal-synthetic-users.mjs')) {
  seedRehearsalDatabase().catch(err => {
    console.error('Fatal seeding error:', err);
    process.exit(1);
  });
}
