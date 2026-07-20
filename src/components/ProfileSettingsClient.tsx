"use client";

import React, { useEffect, useState } from "react";
import { User, Mail, Shield, BookOpen } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function ProfileSettingsClient() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('teachers').select('*').eq('email', user.email).single();
        setProfile(data);
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  if (loading) return <div className="p-8 text-slate-500">Loading profile...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <User className="text-emerald-500" />
          My Profile
        </h2>

        {profile ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Name</label>
                <div className="text-slate-800 font-medium text-lg flex items-center gap-2 mt-1">
                  {profile.name}
                </div>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</label>
                <div className="text-slate-800 flex items-center gap-2 mt-1">
                  <Mail size={16} className="text-slate-400" />
                  {profile.email}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</label>
                <div className="text-slate-800 flex items-center gap-2 mt-1">
                  <Shield size={16} className="text-emerald-500" />
                  <span className="capitalize">{profile.role}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Department / Subject</label>
                <div className="text-slate-800 flex items-center gap-2 mt-1">
                  <BookOpen size={16} className="text-orange-500" />
                  {profile.subject || 'N/A'}
                </div>
              </div>

              {profile.classes && profile.classes.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Classes</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.classes.map((cls: string) => (
                      <span key={cls} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-sm border border-slate-200">
                        {cls}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-slate-500">Profile data not found.</p>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-sm text-slate-500">
            To update your email or role, please contact the System Administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
