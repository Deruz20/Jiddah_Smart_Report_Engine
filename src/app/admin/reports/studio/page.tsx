import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import ReportStudioClient from '@/components/reports/ReportStudioClient';

export const dynamic = 'force-dynamic';

export default async function ReportStudioPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-10 text-red-500 font-medium max-w-xl mx-auto mt-10 bg-red-50 border border-red-200 rounded-xl">
        Unauthorized: You must be logged in to access Report Studio.
      </div>
    );
  }

  const { data: profile } = await supabase
    .from('teachers')
    .select('role, status')
    .eq('email', user.email)
    .single();

  const role = profile?.role;
  const isDenied =
    profile?.status === 'inactive' ||
    role === 'Support Staff' ||
    role === 'Theology Instructor' ||
    role === 'Teacher Theology';

  if (isDenied) {
    return (
      <div className="p-10 text-red-500 font-medium max-w-xl mx-auto mt-10 bg-red-50 border border-red-200 rounded-xl">
        Access Denied: Your role ({role}) does not have permission to access Report Studio.
      </div>
    );
  }

  const { data: schoolSettings } = await supabase
    .from('school_settings')
    .select('primary_font, arabic_font, report_theme_preset, theme_color, school_name')
    .limit(1)
    .maybeSingle();

  return <ReportStudioClient initialSettings={schoolSettings || {}} />;
}
