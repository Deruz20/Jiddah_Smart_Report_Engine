import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { verifyDataAccess } from '@/lib/auth-server'
import { format } from 'date-fns'

export const dynamic = "force-dynamic";

export default async function InvitesPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div className="p-10">Unauthorized</div>

  const authRes = await verifyDataAccess(supabase, user, 'read');
  if (!authRes.isAuthorized) {
    return <div className="p-10 text-red-500">Access Denied: {authRes.message}</div>
  }

  // Invites are admin visible
  const { data: invites, error } = await supabase
    .from('teacher_invites')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching invites:', error);
  }

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-[#0f172a] p-4 md:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Invite Status Tracking</h1>
          <p className="text-slate-500 mt-1">Monitor the status of teacher invitations.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Email</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Role</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Temp Password</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Sent On</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Claimed On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invites?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No invites found.
                  </td>
                </tr>
              )}
              {invites?.map((invite: any) => (
                <tr key={invite.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3 font-medium text-slate-700">
                    {invite.email}
                  </td>
                  <td className="px-6 py-3 text-slate-600">
                    {invite.role}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      invite.status === 'claimed' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                      invite.status === 'revoked' ? 'bg-red-100 text-red-800 border-red-200' :
                      'bg-orange-100 text-orange-800 border-orange-200'
                    }`}>
                      {invite.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-500 font-mono text-xs">
                    {invite.status === 'pending' ? invite.temp_password : '••••••••'}
                  </td>
                  <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                    {invite.created_at ? format(new Date(invite.created_at), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                    {invite.claimed_at ? format(new Date(invite.claimed_at), 'MMM d, yyyy') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
