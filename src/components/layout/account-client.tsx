"use client";

import React, { ChangeEvent, useEffect, useRef, useState } from "react";
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
  Mail,
  Clock,
  Smartphone,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { syncOfflineUserProfileCache } from "@/lib/offline-sync";

const ACCEPTED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;

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
  username?: string;
  pending_email?: string | null;
  full_name: string;
  phone?: string;
  role: string;
  canonical_role?: string;
  department?: string;
  assigned_classes?: string[];
  assigned_subjects?: string[];
  avatar_url?: string;
  last_sign_in_at?: string | null;
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
  const hasUserEditedProfileRef = useRef(false);

  // Password state (Amendment 3 A2)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Admin self-service email change state (Amendment 3 A3)
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailActionLoading, setEmailActionLoading] = useState(false);

  // Session state (Amendment 3 A6)
  const [otherDevicesLoading, setOtherDevicesLoading] = useState(false);
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
            username: data.username ?? initialProfile?.username ?? "",
            pending_email: data.pending_email ?? initialProfile?.pending_email ?? null,
            full_name: data.full_name || data.display_name || initialProfile?.full_name || "",
            phone: data.phone ?? initialProfile?.phone ?? "",
            role: data.role || data.canonical_role || initialProfile?.role || "Teacher",
            canonical_role: data.canonical_role || data.role || "Teacher",
            department: data.department || "General",
            assigned_classes: Array.isArray(data.assigned_classes) ? data.assigned_classes : [],
            assigned_subjects: Array.isArray(data.assigned_subjects) ? data.assigned_subjects : [],
            avatar_url: data.avatar_url || initialProfile?.avatar_url || "",
            last_sign_in_at: data.last_sign_in_at || initialProfile?.last_sign_in_at || null,
          };
          setProfile(merged);
          setInitialFormState({
            fullName: merged.full_name,
            phone: merged.phone || "",
          });
          if (!hasUserEditedProfileRef.current) {
            setFullName(merged.full_name);
            setPhone(merged.phone || "");
            await syncOfflineUserProfileCache(merged as unknown as Record<string, unknown>);
          }
          if (merged.avatar_url && !avatarFile) {
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
  }, [initialProfile?.id, userEmail]);

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
      toast.error("Avatar must be a PNG, JPG, or WEBP image (no SVG).");
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
        const updatedProfile = profile
          ? { ...profile, avatar_url: uploadedUrl }
          : null;
        setProfile(updatedProfile);
        await syncOfflineUserProfileCache({
          ...(updatedProfile || {}),
          full_name: fullName.trim(),
          avatar_url: uploadedUrl,
        });
      }
      setAvatarFile(null);
      toast.success("Profile photo updated and verified.");
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
    if (phone.trim() && !PHONE_REGEX.test(phone.trim())) {
      toast.error("Invalid phone number format. Use 7–20 digits (e.g. +256 700 000000).");
      return;
    }

    setProfileSaving(true);
    try {
      const res = await fetch("/api/settings/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim(),
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Unable to save profile");
      }

      const verifiedName = payload?.data?.full_name ?? fullName.trim();
      const verifiedPhone = payload?.data?.phone ?? phone.trim();

      hasUserEditedProfileRef.current = false;
      setFullName(verifiedName);
      setPhone(verifiedPhone);
      setInitialFormState({
        fullName: verifiedName,
        phone: verifiedPhone,
      });
      const nextProfile = profile
        ? {
            ...profile,
            full_name: verifiedName,
            phone: verifiedPhone,
          }
        : null;
      setProfile(nextProfile);
      await syncOfflineUserProfileCache({
        ...(nextProfile || {}),
        full_name: verifiedName,
        phone: verifiedPhone,
        avatar_url: avatarPreview || nextProfile?.avatar_url || "",
      });
      toast.success("Profile details saved and verified.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Unable to save profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword.trim()) {
      toast.error("Current password is required.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
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
      toast.success("Password updated and other sessions signed out.");
    } catch (err: any) {
      toast.error(err.message || "Unable to update password");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !confirmEmail.trim()) {
      toast.error("Please enter and confirm the new email address.");
      return;
    }
    if (newEmail.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      toast.error("New email and confirmation email do not match.");
      return;
    }
    if (!emailCurrentPassword.trim()) {
      toast.error("Current password is required to change your email.");
      return;
    }

    setEmailSaving(true);
    try {
      const res = await fetch("/api/settings/user/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newEmail: newEmail.trim(),
          confirmEmail: confirmEmail.trim(),
          currentPassword: emailCurrentPassword.trim(),
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Unable to request email change");
      }

      const pending = payload?.data?.pending_email || newEmail.trim().toLowerCase();
      setProfile((prev) => (prev ? { ...prev, pending_email: pending } : prev));
      setNewEmail("");
      setConfirmEmail("");
      setEmailCurrentPassword("");
      toast.success(`Confirmation link sent to ${pending}. Current email stays active until confirmed.`);
    } catch (err: any) {
      toast.error(err.message || "Unable to request email change");
    } finally {
      setEmailSaving(false);
    }
  };

  const handleResendPendingEmail = async () => {
    setEmailActionLoading(true);
    try {
      const res = await fetch("/api/settings/user/email", { method: "PUT" });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Unable to resend confirmation email");
      }
      toast.success(`Confirmation email resent to ${profile?.pending_email}.`);
    } catch (err: any) {
      toast.error(err.message || "Unable to resend confirmation email");
    } finally {
      setEmailActionLoading(false);
    }
  };

  const handleCancelPendingEmail = async () => {
    setEmailActionLoading(true);
    try {
      const res = await fetch("/api/settings/user/email", { method: "DELETE" });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Unable to cancel pending email change");
      }
      setProfile((prev) => (prev ? { ...prev, pending_email: null } : prev));
      toast.success("Pending email change cancelled.");
    } catch (err: any) {
      toast.error(err.message || "Unable to cancel pending email change");
    } finally {
      setEmailActionLoading(false);
    }
  };

  const handleSignOutOtherDevices = async () => {
    setOtherDevicesLoading(true);
    try {
      const res = await fetch("/api/settings/user/sessions", { method: "POST" });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Unable to sign out other devices");
      }
      toast.success("All other active devices and sessions have been signed out.");
    } catch (err: any) {
      toast.error(err.message || "Unable to sign out other devices");
    } finally {
      setOtherDevicesLoading(false);
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

  const roleBadge = profile?.role || profile?.canonical_role || "Administrator";
  const canonicalRole = profile?.canonical_role || roleBadge;
  const isAdmin = canonicalRole === "Administrator" || roleBadge === "Administrator";
  const rawDept = profile?.department || "General";
  const departmentBadge =
    isAdmin || canonicalRole === "Principal" || canonicalRole === "Head Teacher"
      ? "All Departments"
      : rawDept;
  const displayRole = isAdmin
    ? "Administrator (All Departments)"
    : `${roleBadge} (${departmentBadge})`;
  const assignedClasses = profile?.assigned_classes || [];
  const assignedClassesDisplay = isAdmin
    ? "All classes"
    : assignedClasses.length > 0
      ? assignedClasses.join(", ")
      : canonicalRole === "Principal" || canonicalRole === "Head Teacher"
        ? "All School Classes"
        : canonicalRole.startsWith("DOS")
          ? "All Department Classes"
          : "No classes assigned";

  const formattedLastSignIn = profile?.last_sign_in_at
    ? new Date(profile.last_sign_in_at).toLocaleString()
    : "Current session active";

  return (
    <div className={embedded ? "space-y-5" : "max-w-[760px] w-full mx-auto space-y-5 py-6 px-4"}>
      {!embedded && (
        <div className="mb-2">
          <h1 className="text-xl font-bold text-[#1F1F1F] dark:text-[#E3E3E3]">My Account & Security</h1>
          <p className="text-xs text-[#747775] dark:text-[#8E918F] mt-1">
            Manage your personal profile, assigned academic scope, and account credentials.
          </p>
        </div>
      )}

      {/* Card 1: Role & Assigned Department/Classes Summary + Profile Form */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-[#E1E3E1] dark:border-[#282A2C] shadow-xs p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-[15px] font-semibold text-[#1F1F1F] dark:text-[#E3E3E3]">Staff Profile & Scope</h2>
            <p className="text-xs text-[#747775] dark:text-[#8E918F] mt-0.5">
              Your identity, contact phone, and assigned academic permissions.
            </p>
          </div>
          <span
            data-testid="account-role-badge"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#E2EEE2] dark:bg-[#282A2C] px-3 py-1 text-xs font-semibold text-[#0D5C3A] dark:text-[#E3E3E3]"
          >
            <User className="w-3.5 h-3.5" />
            <span>{displayRole}</span>
          </span>
        </div>

        {/* 2-Column Summary Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#F8FAFD] dark:bg-[#131314] border border-[#E1E3E1] dark:border-[#282A2C] mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#E2EEE2] dark:bg-[#282A2C] text-[#0D5C3A] dark:text-[#34D399] flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-[#747775] dark:text-[#8E918F] uppercase tracking-wider">
                Role & Department
              </div>
              <div className="text-sm font-bold text-[#1F1F1F] dark:text-[#E3E3E3]">
                {displayRole}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:border-l border-[#E1E3E1] dark:border-[#282A2C] sm:pl-3">
            <div className="w-9 h-9 rounded-lg bg-[#FEF3C7] dark:bg-[#282A2C] text-[#B45309] dark:text-amber-300 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-[#747775] dark:text-[#8E918F] uppercase tracking-wider">
                Assigned Classes
              </div>
              <div
                data-testid="account-assigned-classes"
                className="text-sm font-bold text-[#1F1F1F] dark:text-[#E3E3E3] truncate"
              >
                {assignedClassesDisplay}
              </div>
            </div>
          </div>
        </div>

        {/* Avatar Row */}
        <div className="flex flex-wrap items-center gap-4 pb-5 mb-5 border-b border-[#E1E3E1] dark:border-[#282A2C]">
          <div className="h-16 w-16 overflow-hidden rounded-2xl bg-[#F0F4F9] dark:bg-[#131314] border border-[#E1E3E1] dark:border-[#282A2C] shrink-0 flex items-center justify-center">
            {avatarPreview ? (
              <img
                data-testid="account-avatar-img"
                src={avatarPreview}
                alt="Avatar preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <span
                data-testid="account-avatar-initials"
                className="text-base font-bold text-[#0D5C3A] dark:text-[#34D399]"
              >
                {getInitials(fullName || profile?.email || userEmail)}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-sm font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">Profile Photo</div>
            <p className="text-xs text-[#747775] dark:text-[#8E918F] mt-0.5">PNG, JPG, or WEBP up to 2MB.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#E1E3E1] dark:border-[#3C4043] bg-white dark:bg-[#131314] px-3 py-1.5 text-xs font-semibold text-[#1F1F1F] dark:text-[#E3E3E3] hover:bg-[#F0F4F9] dark:hover:bg-[#282A2C] transition">
                <Camera className="h-3.5 w-3.5 text-[#0D5C3A] dark:text-[#34D399]" />
                <span>Choose Image</span>
                <input
                  data-testid="account-avatar-file-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
              {avatarFile && (
                <button
                  type="button"
                  data-testid="account-avatar-save-btn"
                  onClick={handleUploadAvatar}
                  disabled={avatarUploading}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#0D5C3A] hover:bg-[#0A472C] dark:bg-[#34D399] dark:hover:bg-[#10B981] px-3 py-1.5 text-xs font-semibold text-white dark:text-[#131314] transition disabled:opacity-50"
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
              <label className="block text-xs font-semibold text-[#1F1F1F] dark:text-[#CBD5E1] mb-1.5">
                Full Name
              </label>
              <input
                data-testid="account-fullname-input"
                type="text"
                value={fullName}
                onChange={(e) => {
                  hasUserEditedProfileRef.current = true;
                  setFullName(e.target.value);
                }}
                placeholder="Enter your full name"
                className="w-full h-10 rounded-lg border border-[#E1E3E1] dark:border-[#3C4043] bg-white dark:bg-[#131314] px-3 text-sm text-[#1F1F1F] dark:text-[#E3E3E3] focus:border-[#0D5C3A] dark:focus:border-[#A8C7FA] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F1F1F] dark:text-[#CBD5E1] mb-1.5">
                {isAdmin ? "Active Official Email" : "Official Email (Read-Only)"}
              </label>
              <input
                data-testid="account-email-input"
                type="email"
                value={profile?.email || userEmail || ""}
                readOnly
                disabled
                className="w-full h-10 rounded-lg border border-[#E1E3E1] dark:border-[#3C4043] bg-[#F8FAFD] dark:bg-[#131314] px-3 text-sm text-[#444746] dark:text-[#E3E3E3] cursor-not-allowed"
              />
              {!isAdmin && (
                <p className="text-[11px] text-[#747775] dark:text-[#8E918F] mt-1">
                  Contact an Administrator to update your official email address.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F1F1F] dark:text-[#CBD5E1] mb-1.5">
                Sign-In Username (Read-Only)
              </label>
              <input
                data-testid="account-username-input"
                type="text"
                value={profile?.username || (profile?.email ? profile.email.split("@")[0] : "")}
                readOnly
                disabled
                className="w-full h-10 rounded-lg border border-[#E1E3E1] dark:border-[#3C4043] bg-[#F8FAFD] dark:bg-[#131314] px-3 text-sm font-mono text-[#444746] dark:text-[#E3E3E3] cursor-not-allowed"
              />
              <p className="text-[11px] text-[#747775] dark:text-[#8E918F] mt-1">
                Use this username (or your email) with your password to sign in. Only an Administrator can change it.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F1F1F] dark:text-[#CBD5E1] mb-1.5">
                Phone Number (Optional)
              </label>
              <input
                data-testid="account-phone-input"
                type="tel"
                value={phone}
                onChange={(e) => {
                  hasUserEditedProfileRef.current = true;
                  setPhone(e.target.value);
                }}
                placeholder="+256 700 000000"
                className="w-full h-10 rounded-lg border border-[#E1E3E1] dark:border-[#3C4043] bg-white dark:bg-[#131314] px-3 text-sm text-[#1F1F1F] dark:text-[#E3E3E3] focus:border-[#0D5C3A] dark:focus:border-[#A8C7FA] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F1F1F] dark:text-[#CBD5E1] mb-1.5">
                Assigned Role
              </label>
              <input
                data-testid="account-role-input"
                type="text"
                value={displayRole}
                readOnly
                disabled
                className="w-full h-10 rounded-lg border border-[#E1E3E1] dark:border-[#3C4043] bg-[#F8FAFD] dark:bg-[#131314] px-3 text-sm text-[#444746] dark:text-[#E3E3E3] cursor-not-allowed"
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
              data-testid="account-profile-save-btn"
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

      {/* Card 1B: Administrator Self-Service Email Change (Amendment 3 A3) */}
      {isAdmin && (
        <div
          data-testid="account-email-change-card"
          className="bg-white dark:bg-[#111815] rounded-2xl border border-[#E3E8E3] dark:border-[#1E2B26] shadow-[0_1px_3px_rgba(15,41,30,0.04)] p-6 space-y-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-semibold text-[#111827] dark:text-[#F3F7F5]">
                Change Administrator Email
              </h2>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                Requires password verification and confirmation at the new address before taking effect.
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#E2EEE2] dark:bg-[#10B981]/15 text-[#0D5C3A] dark:text-[#34D399] flex items-center justify-center shrink-0">
              <Mail className="h-4 w-4" />
            </div>
          </div>

          {profile?.pending_email && (
            <div
              data-testid="account-pending-email-banner"
              className="rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50/80 dark:bg-amber-950/30 p-3.5 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="text-xs text-amber-900 dark:text-amber-200">
                <span className="font-bold">Pending confirmation:</span>{" "}
                <span className="font-mono">{profile.pending_email}</span>
                <div className="text-[11px] text-amber-700 dark:text-amber-300/90 mt-0.5">
                  Your current email ({profile.email}) remains active until you click the confirmation link.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="account-resend-email-btn"
                  disabled={emailActionLoading}
                  onClick={handleResendPendingEmail}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-300 dark:border-amber-500/40 bg-white dark:bg-[#131314] px-2.5 py-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200 hover:bg-amber-100/60 transition disabled:opacity-50"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Resend</span>
                </button>
                <button
                  type="button"
                  data-testid="account-cancel-email-btn"
                  disabled={emailActionLoading}
                  onClick={handleCancelPendingEmail}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition disabled:opacity-50"
                >
                  <XCircle className="w-3 h-3" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleRequestEmailChange} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] mb-1.5">
                  New Email Address
                </label>
                <input
                  data-testid="account-new-email-input"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new.email@school.org"
                  className="w-full h-10 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-3 text-sm text-[#111827] dark:text-[#F3F7F5] focus:border-[#0D5C3A] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] mb-1.5">
                  Confirm New Email
                </label>
                <input
                  data-testid="account-confirm-email-input"
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder="Repeat new email"
                  className="w-full h-10 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-3 text-sm text-[#111827] dark:text-[#F3F7F5] focus:border-[#0D5C3A] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] mb-1.5">
                  Current Password (Required)
                </label>
                <input
                  data-testid="account-email-password-input"
                  type="password"
                  value={emailCurrentPassword}
                  onChange={(e) => setEmailCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full h-10 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-3 text-sm text-[#111827] dark:text-[#F3F7F5] focus:border-[#0D5C3A] outline-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F1] dark:border-[#1E2B26]">
              <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                A typo will never lock your account — confirmation is required first.
              </span>
              <button
                type="submit"
                data-testid="account-email-submit-btn"
                disabled={!newEmail || !confirmEmail || !emailCurrentPassword || emailSaving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D5C3A] hover:bg-[#0A472C] px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {emailSaving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Mail className="w-3.5 h-3.5" />
                )}
                <span>{emailSaving ? "Sending..." : "Send Confirmation Email"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Card 2: Change Password */}
      <div className="bg-white dark:bg-[#111815] rounded-2xl border border-[#E3E8E3] dark:border-[#1E2B26] shadow-[0_1px_3px_rgba(15,41,30,0.04)] p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-[15px] font-semibold text-[#111827] dark:text-[#F3F7F5]">Change Password</h2>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
              Re-authenticates your current password server-side and signs out other sessions on update.
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
                Current Password (Required)
              </label>
              <div className="relative">
                <input
                  data-testid="account-current-password-input"
                  type={showCurrentPassword ? "text" : "password"}
                  required
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
                  data-testid="account-new-password-input"
                  type={showNewPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
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
                data-testid="account-confirm-password-input"
                type={showNewPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full h-10 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-3 text-sm text-[#111827] dark:text-[#F3F7F5] focus:border-[#0D5C3A] dark:focus:border-[#10B981] focus:ring-2 focus:ring-[#0D5C3A]/15 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F1] dark:border-[#1E2B26]">
            <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              Minimum 8 characters required for staff accounts.
            </span>
            <button
              type="submit"
              data-testid="account-password-submit-btn"
              disabled={!currentPassword || !newPassword || !confirmPassword || passwordSaving}
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

      {/* Card 3: Active Session Control (Amendment 3 A6) */}
      <div className="bg-white dark:bg-[#111815] rounded-2xl border border-[#E3E8E3] dark:border-[#1E2B26] shadow-[0_1px_3px_rgba(15,41,30,0.04)] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[#111827] dark:text-[#F3F7F5]">Session Management</h2>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
              Review your last sign-in timestamp and manage active device sessions.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8FAFD] dark:bg-[#131314] border border-[#E1E3E1] dark:border-[#282A2C] px-3 py-1.5 text-xs text-[#444746] dark:text-[#C4C7C5]">
            <Clock className="w-3.5 h-3.5 text-[#0D5C3A] dark:text-[#34D399]" />
            <span>Last sign-in:</span>
            <span data-testid="account-last-signin" className="font-semibold text-[#1F1F1F] dark:text-[#E3E3E3]">
              {formattedLastSignIn}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F1] dark:border-[#1E2B26]">
          <button
            type="button"
            data-testid="account-signout-others-btn"
            onClick={handleSignOutOtherDevices}
            disabled={otherDevicesLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E1E3E1] dark:border-[#3C4043] bg-white dark:bg-[#131314] hover:bg-[#F0F4F9] dark:hover:bg-[#282A2C] px-3.5 py-2 text-xs font-semibold text-[#1F1F1F] dark:text-[#E3E3E3] transition disabled:opacity-50"
          >
            <Smartphone className="h-3.5 w-3.5 text-[#0D5C3A] dark:text-[#34D399]" />
            <span>{otherDevicesLoading ? "Revoking..." : "Sign Out Other Devices"}</span>
          </button>

          <button
            type="button"
            data-testid="account-signout-btn"
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
