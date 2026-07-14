"use client";

import React, { ChangeEvent, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, Shield, Eye, EyeOff, Check, RefreshCw, LogOut, Camera, Lock } from "lucide-react";
import { AnimatedButton } from "@/components/AnimatedButton";
import { HeroSection } from "@/components/HeroSection";
import { createClient } from "@/utils/supabase/client";

const ACCEPTED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

const accountProfileSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  phone: z.string().optional().or(z.literal("")),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, "Password must be at least 6 characters"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AccountProfileForm = z.infer<typeof accountProfileSchema>;
type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

function getInitials(fullName: string) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'U';
}

export type UserProfileData = {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  avatar_url?: string;
};

export default function AccountClient({ initialProfile, userEmail }: { initialProfile: UserProfileData | null, userEmail: string }) {
  const [profile, setProfile] = useState<UserProfileData | null>(initialProfile);
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [dangerLoading, setDangerLoading] = useState(false);



  const profileForm = useForm<AccountProfileForm>({
    resolver: zodResolver(accountProfileSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
    },
  });

  const { register, handleSubmit, formState: { errors } } = profileForm;

  useEffect(() => {
    if (avatarFile) {
      const url = URL.createObjectURL(avatarFile);
      setAvatarPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [avatarFile]);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      alert('Avatar must be a PNG, JPG, or WEBP image.');
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      alert('Avatar must be smaller than 2MB.');
      return;
    }

    setAvatarFile(file);
  };

  const handleUploadAvatar = async () => {
    const supabase = createClient();
    if (!avatarFile || !profile) return;
    setAvatarUploading(true);
    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);
      if (updateError) throw updateError;

      setAvatarPreview(publicUrl);
      setAvatarFile(null);
      alert('Avatar uploaded successfully.');
    } catch (err: any) {
      alert(err.message || 'Avatar upload failed');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleProfileSave = handleSubmit(async (values) => {
    if (!profile) return;
    setProfileSaving(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: values.full_name,
        phone: values.phone,
      }).eq('id', profile.id);
      if (error) throw error;
      alert('Profile saved successfully.');
    } catch (err: any) {
      alert(err.message || 'Unable to save profile');
    } finally {
      setProfileSaving(false);
    }
  });

  const passwordForm = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = passwordForm;

  const handlePasswordSave = handleSubmitPassword(async (values) => {
    setPasswordSaving(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.updateUser({ password: values.newPassword });
      if (error) throw error;
      alert('Password updated successfully.');
      resetPasswordForm();
    } catch (err: any) {
      alert(err.message || 'Unable to update password');
    } finally {
      setPasswordSaving(false);
    }
  });

  const handleSignOutAll = async () => {
    setDangerLoading(true);
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (err: any) {
      alert(err.message || 'Unable to sign out.');
      setDangerLoading(false);
    }
  };

  return (
    <div className="pb-12 w-full">
      <HeroSection
        title="Account Settings"
        subtitle="Manage your profile, email, password, and security preferences."
      />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr] px-4 sm:px-6 lg:px-8 mt-8">
        <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Profile</p>
              <p className="mt-2 text-sm text-slate-500">
                Edit your full name, phone number, and profile avatar.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-24 w-24 overflow-hidden rounded-3xl bg-slate-100 ring-1 ring-slate-200 shrink-0">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-slate-600 bg-emerald-50">
                    {getInitials(profile?.full_name ?? userEmail)}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                  <Camera className="h-4 w-4" />
                  Choose image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </label>
                <p className="text-xs text-slate-500">PNG, JPG or WEBP · max 2MB.</p>
                <AnimatedButton
                  type="button"
                  onClick={handleUploadAvatar}
                  disabled={avatarUploading || !avatarFile}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: '#10B981' }}
                >
                  {avatarUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {avatarUploading ? 'Uploading...' : 'Upload avatar'}
                </AnimatedButton>
              </div>
            </div>
          </div>

          <form onSubmit={handleProfileSave} className="mt-8 space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Full name</label>
                <input
                  {...register('full_name')}
                  placeholder="Sarah Abdullahi"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400"
                />
                {errors.full_name && <p className="mt-2 text-sm text-rose-600">{errors.full_name.message}</p>}
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Phone number</label>
                <input
                  {...register('phone')}
                  placeholder="+234 800 123 4567"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400"
                />
                {errors.phone && <p className="mt-2 text-sm text-rose-600">{errors.phone.message}</p>}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <AnimatedButton
                type="submit"
                disabled={profileSaving}
                className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:opacity-60 text-white"
                style={{ background: '#10B981' }}
              >
                {profileSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {profileSaving ? 'Saving...' : 'Save profile'}
              </AnimatedButton>
            </div>
          </form>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Account information</p>
                <p className="mt-1 text-sm text-slate-500">Your email and role are read-only.</p>
              </div>
              <User className="h-5 w-5 text-emerald-500" />
            </div>

            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Email</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{profile?.email ?? userEmail ?? 'Not available'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Role</p>
                <p className="mt-2 text-sm font-medium text-slate-900 capitalize">{profile?.role ?? 'admin'}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-rose-100 bg-rose-50 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-rose-900">Danger zone</p>
                <p className="mt-2 text-sm text-rose-700">Sign out of all devices and revoke your active session.</p>
              </div>
              <Lock className="h-5 w-5 text-rose-500" />
            </div>

            <div className="mt-6">
              <AnimatedButton
                onClick={handleSignOutAll}
                disabled={dangerLoading}
                className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:opacity-60 text-white"
                style={{ background: '#EF4444' }}
              >
                <LogOut className="h-4 w-4" />
                {dangerLoading ? 'Signing out...' : 'Sign out'}
              </AnimatedButton>
            </div>
          </section>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 mt-6">
        <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Change password</p>
              <p className="mt-1 text-sm text-slate-500">Update your password securely.</p>
            </div>
            <Shield className="h-5 w-5 text-emerald-500" />
          </div>

          <form onSubmit={handlePasswordSave} className="mt-6 space-y-5 max-w-xl">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">New password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  {...registerPassword('newPassword')}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400"
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 hover:bg-slate-200 transition-colors"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4 text-slate-500" /> : <Eye className="h-4 w-4 text-slate-500" />}
                </button>
              </div>
              {passwordErrors.newPassword && <p className="mt-2 text-sm text-rose-600">{passwordErrors.newPassword.message}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Confirm new password</label>
              <input
                type={showNewPassword ? 'text' : 'password'}
                {...registerPassword('confirmPassword')}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400"
                placeholder="Re-enter new password"
              />
              {passwordErrors.confirmPassword && <p className="mt-2 text-sm text-rose-600">{passwordErrors.confirmPassword.message}</p>}
            </div>

            <AnimatedButton
              type="submit"
              disabled={passwordSaving}
              className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:opacity-60 text-white"
              style={{ background: '#10B981' }}
            >
              {passwordSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {passwordSaving ? 'Updating...' : 'Update password'}
            </AnimatedButton>
          </form>
        </section>
      </div>
    </div>
  );
}
