import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin
    .from('teachers')
    .insert([
      {
        id: '12345678-1234-1234-1234-123456789012',
        email: 'test_profile_error@example.com',
        role: 'teacher',
        subject: 'Math',
        name: 'Test Profile',
        classes: [],
        phone: null,
        status: 'active'
      }
    ]);

  return NextResponse.json({ error });
}
