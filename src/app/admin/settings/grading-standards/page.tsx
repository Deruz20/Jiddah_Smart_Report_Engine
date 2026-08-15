import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { GradingStandardsClient } from "@/components/layout/grading-standards-client";

export const metadata = {
  title: "Smart Grading Standards - Jiddah Engine",
};

export default async function GradingStandardsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div className="p-10">Unauthorized</div>;

  const { verifyDataAccess } = await import('@/lib/auth-server');
  const authRes = await verifyDataAccess(supabase, user, 'read');
  if (!authRes.isAuthorized || (authRes.role !== 'Administrator' && authRes.role !== 'admin')) {
    return <div className="p-10 text-red-500">Access Denied: You must be an Administrator to access Settings.</div>;
  }

  return (
    <div className="p-6 md:p-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Grading Standards</h1>
        <p className="text-slate-500 mt-2">Configure the score ranges and remarks that will auto-generate based on student performance on report cards.</p>
      </div>

      <GradingStandardsClient role={authRes.role ?? 'guest'} userId={user.id} />
    </div>
  );
}
