import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { GradingCriteriaClient } from "@/components/layout/grading-criteria-client";

export const metadata = {
  title: "Grading Criteria Engine - Jiddah Engine",
};

export default async function GradingStandardsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div className="p-10">Unauthorized</div>;

  const { verifyDataAccess } = await import('@/lib/auth-server');
  const authRes = await verifyDataAccess(supabase, user, 'read');
  if (!authRes.isAuthorized || (authRes.role !== 'Administrator' && authRes.role !== 'admin' && authRes.role !== 'Head Teacher' && authRes.role !== 'DOS Secular' && authRes.role !== 'DOS Theology')) {
    return <div className="p-10 text-red-500">Access Denied: You must be an authorized administrator to access Settings.</div>;
  }

  return (
    <div className="p-6 md:p-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Grading Rules Engine</h1>
        <p className="text-slate-500 mt-2">Configure dynamic rules for grades and remarks based on specific scoring thresholds.</p>
      </div>

      <GradingCriteriaClient role={authRes.role ?? 'guest'} userId={user.id} />
    </div>
  );
}
