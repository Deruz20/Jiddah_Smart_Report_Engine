import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const ROLES_TO_SEED = [
  { email: 'admin@test.local', password: 'Password123!', role: 'Administrator', name: 'Synthetic Admin' },
  { email: 'head@test.local', password: 'Password123!', role: 'Head Teacher', name: 'Synthetic Head Teacher' },
  { email: 'dos@test.local', password: 'Password123!', role: 'DOS', name: 'Synthetic DOS' },
  { email: 'teacher@test.local', password: 'Password123!', role: 'Class Teacher', name: 'Synthetic Class Teacher' },
  { email: 'theology@test.local', password: 'Password123!', role: 'Theology Instructor', name: 'Synthetic Theology' },
  { email: 'staff@test.local', password: 'Password123!', role: 'Support Staff', name: 'Synthetic Support Staff' }
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
      section: 'lower_primary'
    },
    {
      id: 'c1000000-0000-0000-0000-000000000002',
      class_name: 'Primary 2',
      section: 'lower_primary'
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

  // 5. Subjects
  await supabase.from('subjects').upsert([
    {
      id: 'b0000000-0000-0000-0000-000000000001',
      subject_name: 'القرآن الكريم (Quran)',
      curriculum: 'theology',
      section: '1'
    }
  ]);

  // 6. Seed users & teacher records
  let teacherId = null;
  const { data: userList } = await supabase.auth.admin.listUsers();
  const existingUsers = userList?.users || [];

  for (const item of ROLES_TO_SEED) {
    let authUserId = null;
    const existing = existingUsers.find(u => u.email === item.email);
    if (existing) {
      authUserId = existing.id;
      // Ensure password and metadata match
      await supabase.auth.admin.updateUserById(authUserId, {
        password: item.password,
        user_metadata: { role: item.role, name: item.name, onboarding_completed: true }
      });
    } else {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: item.email,
        password: item.password,
        email_confirm: true,
        user_metadata: { role: item.role, name: item.name, onboarding_completed: true }
      });
      if (createErr) {
        console.error(`Error creating user ${item.email}:`, createErr.message);
        continue;
      }
      authUserId = created.user.id;
    }

    if (item.email === 'teacher@test.local') {
      teacherId = authUserId;
    }

    await supabase.from('teachers').upsert({
      id: authUserId,
      auth_user_id: authUserId,
      email: item.email,
      role: item.role,
      name: item.name,
      status: 'active'
    });

    console.log(`✔ Synced ${item.role} (${item.email})`);
  }

  // 7. Teacher class assignment (Assign Class Teacher to circular class Primary 1)
  if (teacherId) {
    await supabase.from('teacher_class_assignments').delete().eq('teacher_id', teacherId);
    await supabase.from('teacher_class_assignments').insert({
      teacher_id: teacherId,
      class_id: 'c1000000-0000-0000-0000-000000000001',
      class_type: 'circular'
    });
  }

  // 8. Students
  await supabase.from('students').upsert([
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      name: 'Test Student',
      admission_number: 'ADM-001',
      gender: 'male',
      status: 'active'
    },
    {
      id: 'a0000000-0000-0000-0000-000000000002',
      name: 'Unassigned Test Student',
      admission_number: 'ADM-002',
      gender: 'female',
      status: 'active'
    }
  ]);

  // 9. Enrollments
  await supabase.from('enrollments').upsert([
    {
      id: 'e0000000-0000-0000-0000-000000000001',
      student_id: 'a0000000-0000-0000-0000-000000000001',
      circular_class_id: 'c1000000-0000-0000-0000-000000000001',
      theology_class_id: 'c0000000-0000-0000-0000-000000000002',
      term_id: 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111',
      academic_year: '2026',
      is_active: true
    },
    {
      id: 'e0000000-0000-0000-0000-000000000002',
      student_id: 'a0000000-0000-0000-0000-000000000002',
      circular_class_id: 'c1000000-0000-0000-0000-000000000002',
      theology_class_id: 'c0000000-0000-0000-0000-000000000003',
      term_id: 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111',
      academic_year: '2026',
      is_active: true
    }
  ]);

  // 10. Initial mark for assigned student (so updates succeed)
  if (teacherId) {
    await supabase.from('theology_marks').upsert([
      {
        id: '20da181d-93fe-4b45-b899-70ec5314b4e7',
        enrollment_id: 'e0000000-0000-0000-0000-000000000001',
        subject_id: 'b0000000-0000-0000-0000-000000000001',
        term_id: 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111',
        mot_score: 89,
        eot_score: 91,
        updated_by: teacherId
      }
    ]);
  }

  // Ensure unassigned student has NO mark initially
  await supabase.from('theology_marks').delete().eq('enrollment_id', 'e0000000-0000-0000-0000-000000000002');

  console.log('✔ Complete rehearsal fixture dataset seeded successfully.');
}

if (process.argv[1]?.endsWith('seed-rehearsal-synthetic-users.mjs')) {
  seedRehearsalDatabase().catch(err => {
    console.error('Fatal seeding error:', err);
    process.exit(1);
  });
}
