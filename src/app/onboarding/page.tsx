"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { CheckCircle2, RefreshCw } from "lucide-react";
import Image from "next/image";

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      const user = session?.user;
      if (!user) {
        router.replace("/login");
      } else if (user.user_metadata?.onboarding_completed) {
        router.replace("/admin");
      } else {
        setFullName(user.user_metadata?.full_name || "");
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setError(null);
    setLoading(true);

    try {
      const updates: any = { data: { full_name: fullName, onboarding_completed: true } };
      if (password && password.length >= 6) {
        updates.password = password;
      }

      const { error: updateError } = await supabase.auth.updateUser(updates);
      
      if (updateError) throw updateError;
      
      router.replace("/admin");
    } catch (err: any) {
      setError(err.message || "Failed to complete onboarding.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FEFDF8] p-6 relative overflow-hidden">
      {/* Background graphic */}
      <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-gradient-to-br from-emerald-100/60 to-orange-50/50 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-md bg-white/75 backdrop-blur-xl border border-slate-100 shadow-xl shadow-slate-200/50 rounded-3xl p-8 relative z-10">
        <div className="flex justify-center mb-6">
          <Image src="/school_budge.jpeg" alt="Logo" width={64} height={64} className="rounded-xl border border-slate-200 shadow-sm" />
        </div>
        
        <h1 className="text-2xl font-bold text-center text-emerald-800 mb-2 font-serif">Welcome to Jiddah</h1>
        <p className="text-center text-slate-500 text-sm mb-8">Please complete your profile to continue to your dashboard.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-emerald-500 transition-colors"
              placeholder="e.g. Abdullah S."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password (Optional)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-emerald-500 transition-colors"
              placeholder="Leave blank to keep current"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 shadow-md shadow-emerald-600/20 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #10B981, #065F46)" }}
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Complete Setup
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
