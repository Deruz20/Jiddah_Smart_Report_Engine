"use client";

import React, { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Shield,
  Eye,
  EyeOff,
  Check,
  RefreshCw,
  LogOut,
  Camera,
  Lock,
  Building2,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

const ACCEPTED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

function getInitials(fullName: string) {
  return (
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "U"
  );
}

export type UserProfileData = {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  canonical_role?: string;
  department?: string;
  assigned_classes?: string[];
  assigned_subjects?: string[];
  avatar_url?: string;
};

interface AccountClientProps {
  initialProfile?: UserProfileData | null;
  userEmail?: string;
  embedded?: boolean;
}

export default function AccountClient({
  initialProfile = null,
  userEmail = "",
  embedded = false,
}: AccountClientProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileData | null>(initialProfile);
  const [loadingProfile, setLoadingProfile] = useState(!initialProfile);

  const [fullName, setFullName] = useState(initialProfile?.full_name || "");
  const [phone, setPhone] = useState(initialProfile?.phone || "");
  const [initialFormState, setInitialFormState] = useState({
    fullName: initialProfile?.full_name || "",
    phone: initialProfile?.phone || "",
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialProfile?.avatar_url || null
  );
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [dangerLoading, setDangerLoading] = useState(false);

  useEffect(() => {
    const fetchExtendedProfile = async () => {
      try {
        const res = await fetch("/api/settings/user", { cache: "no-store" });
        const payload = await res.json();
        if (res.ok && payload?.data) {
          const data = payload.data;
          const merged: UserProfileData = {
            id: data.id || initialProfile?.id || "",
            email: data.email || userEmail || initialProfile?.email || "",
            full_name: data.full_name || data.display_name || initialProfile?.full_name || "",
            phone: data.phone || initialProfile?.phone || "",
            role: data.canonical_role || data.role || initialProfile?.role || "Teacher",
            canonical_role: data.canonical_role || data.role || "Teacher",
            department: data.department || "General",
            assigned_classes: Array.isArray(data.assigned_classes) ? data.assigned_classes : [],
            assigned_subjects: Array.isArray(data.assigned_subjects) ? data.assigned_subjects : [],
            avatar_url: data.avatar_url || initialProfile?.avatar_url || "",
          };
          setProfile(merged);
          setFullName(merged.full_name);
          setPhone(merged.phone || "");
          setInitialFormState({
            fullName: merged.full_name,
            phone: merged.phone || "",
          });
          if (merged.avatar_url) {
            setAvatarPreview(merged.avatar_url);
          }
        }
      } catch (err) {
        console.error("Failed to fetch extended user profile:", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    void fetchExtendedProfile();
  }, [initialProfile, userEmail]);

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
      toast.error("Avatar must be a PNG, JPG, or WEBP image.");
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      toast.error("Avatar must be smaller than 2MB.");
      return;
    }

    setAvatarFile(file);
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", avatarFile);

      const res = await fetch("/api/settings/user/avatar", {
        method: "POST",
        body: formData,
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Avatar upload failed");
      }

      const uploadedUrl = payload?.data?.avatar_url;
      if (uploadedUrl) {
        setAvatarPreview(uploadedUrl);
        setProfile((prev) => (prev ? { ...prev, avatar_url: uploadedUrl } : prev));
      }
      setAvatarFile(null);
      toast.success("Profile photo updated.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Avatar upload failed");
    } finally {
      setAvatarUploading(false);
    }
  };

  const isProfileDirty =
    fullName.trim() !== initialFormState.fullName.trim() ||
    phone.trim() !== initialFormState.phone.trim();

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 2) {
      toast.error("Full name must be at least 2 characters.");
      return;
    }

    setProfileSaving(true);
    try {
      const res = await fetch("/api/settings/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          display_name: fullName.trim(),
          phone: phone.trim(),
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Unable to save profile");
      }

      setInitialFormState({
        fullName: fullName.trim(),
        phone: phone.trim(),
      });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              full_name: fullName.trim(),
              phone: phone.trim(),
            }
          : prev
      );
      toast.success("Profile details saved.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Unable to save profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch("/api/settings/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Unable to update password");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully.");
    } catch (err: any) {
      toast.error(err.message || "Unable to update password");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSignOutAll = async () => {
    setDangerLoading(true);
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (err: any) {
      toast.error(err.message || "Unable to sign out.");
      setDangerLoading(false);
    }
  };

  const roleBadge = profile?.canonical_role || profile?.role || "Administrator";
  const departmentBadge = profile?.department || "All Departments";
  const assignedClasses = profile?.assigned_classes || [];

  return (
    <div className={embedded ? "space-y-5" : "max-w-[760px] w-full mx-auto space-y-5 py-6 px-4"}>
      {!embedded && (
        <div className="mb-2">
          <h1 className="text-xl font-bold text-[#111827] dark:text-[#F3F7F5]">My Account & Security</h1>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-1">
            Manage your personal profile, assigned academic scope, and account credentials.
          </p>
        </div>
      )}

      {/* Card 1: Role & Assigned Department/Classes Summary + Profile Form */}
      <div className="bg-white dark:bg-[#111815] rounded-2xl border border-[#E3E8E3] dark:border-[#1E2B26] shadow-[0_1px_3px_rgba(15,41,30,0.04)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-[15px] font-semibold text-[#111827] dark:text-[#F3F7F5]">Staff Profile & Scope</h2>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
              Your identity, contact phone, and assigned academic permissions.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E2EEE2] dark:bg-[#10B981]/15 px-3 py-1 text-xs font-semibold text-[#0D5C3A] dark:text-[#34D399]">
            <User className="w-3.5 h-3.5" />
            <span>{roleBadge}</span>
          </span>
        </div>

        {/* 2-Column Summary Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#F8FAF8] dark:bg-[#141D1A] border border-[#E3E8E3] dark:border-[#24312C] mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#E2EEE2] dark:bg-[#10B981]/15 text-[#0D5C3A] dark:text-[#34D399] flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider">
                Role & Department
              </div>
              <div className="text-sm font-bold text-[#111827] dark:text-[#F3F7F5]">
                {roleBadge} ({departmentBadge})
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:border-l border-[#E3E8E3] dark:border-[#24312C] sm:pl-3">
            <div className="w-9 h-9 rounded-lg bg-[#FEF3C7] dark:bg-amber-500/15 text-[#B45309] dark:text-amber-300 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider">
                Assigned Classes
              </div>
              <div className="text-sm font-bold text-[#111827] dark:text-[#F3F7F5] truncate">
                {assignedClasses.length > 0
                  ? assignedClasses.join(", ")
                  : roleBadge === "Administrator" || roleBadge.startsWith("DOS")
                    ? "All School Classes"
                    : "Standard Access"}
              </div>
            </div>
          </div>
        </div>

        {/* Avatar Row */}
        <div className="flex flex-wrap items-center gap-4 pb-5 mb-5 border-b border-[#F1F5F1] dark:border-[#1E2B26]">
          <div className="h-16 w-16 overflow-hidden rounded-2xl bg-[#EEF3EE] dark:bg-[#141D1A] border border-[#D5DFD5] dark:border-[#24312C] shrink-0 flex items-center justify-center">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
            ) : (
              <span className="text-base font-bold text-[#0D5C3A] dark:text-[#34D399]">
                {getInitials(fullName || profile?.email || userEmail)}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-sm font-medium text-[#111827] dark:text-[#F3F7F5]">Profile Photo</div>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">PNG, JPG, or WEBP up to 2MB.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-3 py-1.5 text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] hover:bg-[#F8FAF8] dark:hover:bg-[#16211D] transition">
                <Camera className="h-3.5 w-3.5 text-[#0D5C3A] dark:text-[#34D399]" />
                <span>Choose Image</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
              {avatarFile && (
                <button
                  type="button"
                  onClick={handleUploadAvatar}
                  disabled={avatarUploading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D5C3A] hover:bg-[#0A472C] px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50"
                >
                  {avatarUploading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{avatarUploading ? "Uploading..." : "Save Photo"}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full h-10 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-3 text-sm text-[#111827] dark:text-[#F3F7F5] focus:border-[#0D5C3A] dark:focus:border-[#10B981] focus:ring-2 focus:ring-[#0D5C3A]/15 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] mb-1.5">
                Official Email (Read-Only)
              </label>
              <input
                type="email"
                value={profile?.email || userEmail || ""}
                readOnly
                disabled
                className="w-full h-10 rounded-lg border border-[#E3E8E3] dark:border-[#24312C] bg-[#F8FAF8] dark:bg-[#141D1A] px-3 text-sm text-[#4B5563] dark:text-[#D1DBD6] cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+256 700 000000"
                className="w-full h-10 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-3 text-sm text-[#111827] dark:text-[#F3F7F5] focus:border-[#0D5C3A] dark:focus:border-[#10B981] focus:ring-2 focus:ring-[#0D5C3A]/15 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] mb-1.5">
                Assigned Role
              </label>
              <input
                type="text"
                value={`${roleBadge} (${departmentBadge})`}
                readOnly
                disabled
                className="w-full h-10 rounded-lg border border-[#E3E8E3] dark:border-[#24312C] bg-[#F8FAF8] dark:bg-[#141D1A] px-3 text-sm text-[#4B5563] dark:text-[#D1DBD6] cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#F1F5F1] dark:border-[#1E2B26]">
            <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              {loadingProfile
                ? "Loading profile..."
                : isProfileDirty
                  ? "Unsaved profile changes"
                  : "Profile is up to date"}
            </span>
            <button
              type="submit"
              disabled={!isProfileDirty || profileSaving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D5C3A] hover:bg-[#0A472C] px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {profileSaving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>{profileSaving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Card 2: Change Password */}
      <div className="bg-white dark:bg-[#111815] rounded-2xl border border-[#E3E8E3] dark:border-[#1E2B26] shadow-[0_1px_3px_rgba(15,41,30,0.04)] p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-[15px] font-semibold text-[#111827] dark:text-[#F3F7F5]">Change Password</h2>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
              Update your authentication password via Supabase Auth.
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#E2EEE2] dark:bg-[#10B981]/15 text-[#0D5C3A] dark:text-[#34D399] flex items-center justify-center shrink-0">
            <Shield className="h-4 w-4" />
          </div>
        </div>

        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] mb-1.5">
                Current Password (Optional)
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full h-10 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] pl-3 pr-9 text-sm text-[#111827] dark:text-[#F3F7F5] focus:border-[#0D5C3A] dark:focus:border-[#10B981] focus:ring-2 focus:ring-[#0D5C3A]/15 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F7F5]"
                  aria-label="Toggle current password visibility"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full h-10 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] pl-3 pr-9 text-sm text-[#111827] dark:text-[#F3F7F5] focus:border-[#0D5C3A] dark:focus:border-[#10B981] focus:ring-2 focus:ring-[#0D5C3A]/15 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F7F5]"
                  aria-label="Toggle new password visibility"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] mb-1.5">
                Confirm New Password
              </label>
              <input
                type={showNewPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full h-10 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-3 text-sm text-[#111827] dark:text-[#F3F7F5] focus:border-[#0D5C3A] dark:focus:border-[#10B981] focus:ring-2 focus:ring-[#0D5C3A]/15 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F1] dark:border-[#1E2B26]">
            <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              Minimum 6 characters required for staff accounts.
            </span>
            <button
              type="submit"
              disabled={!newPassword || !confirmPassword || passwordSaving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D5C3A] hover:bg-[#0A472C] px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {passwordSaving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              <span>{passwordSaving ? "Updating..." : "Update Password"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Card 3: Active Session Control */}
      <div className="bg-white dark:bg-[#111815] rounded-2xl border border-[#E3E8E3] dark:border-[#1E2B26] shadow-[0_1px_3px_rgba(15,41,30,0.04)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[#111827] dark:text-[#F3F7F5]">Session Management</h2>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
              Sign out of your current browser session and return to the staff sign-in gateway.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOutAll}
            disabled={dangerLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 px-3.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 transition disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{dangerLoading ? "Signing out..." : "Sign Out"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
