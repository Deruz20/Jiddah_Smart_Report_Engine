"use client";

import React, { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  UserPlus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Mail,
  Shield,
  ExternalLink,
} from "lucide-react";
import { HeroSection } from "@/components/HeroSection";
import { toast } from "sonner";

export interface TeacherInviteItem {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  subject?: string | null;
  status: "pending" | "claimed" | "revoked";
  temp_password?: string | null;
  created_at?: string | null;
  claimed_at?: string | null;
  token?: string | null;
}

export default function InvitesClient({ initialInvites }: { initialInvites: TeacherInviteItem[] }) {
  const [invites] = useState<TeacherInviteItem[]>(initialInvites);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const togglePassword = (id: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = async (text: string, id: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const copyFullCredentials = async (invite: TeacherInviteItem) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://jiddahschool.ac.ug";
    const text = `Assalamu Alaikum ${invite.name || "Teacher"},\n\nYour staff account for Jiddah Islamic Nursery & Primary School has been created:\n\nLogin Portal: ${origin}/login\nEmail: ${invite.email}\nTemporary Password: ${invite.temp_password || "Set by Admin"}\nRole: ${invite.role}\n\nPlease log in and update your password immediately upon arrival.`;
    await copyToClipboard(text, invite.id, "Account invitation packet");
  };

  // Filtered list
  const filtered = invites.filter((inv) => {
    const matchesSearch =
      inv.email.toLowerCase().includes(search.toLowerCase()) ||
      (inv.name && inv.name.toLowerCase().includes(search.toLowerCase())) ||
      inv.role.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCount = invites.length;
  const pendingCount = invites.filter((i) => i.status === "pending").length;
  const claimedCount = invites.filter((i) => i.status === "claimed").length;
  const revokedCount = invites.filter((i) => i.status === "revoked").length;

  return (
    <div className="w-full">
      <HeroSection
        title="Staff Invitations & Onboarding"
        subtitle="Manage pending teacher invitations, access tokens, and temporary onboarding credentials"
        actions={
          <Link
            href="/admin/teachers"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-[#10B981] hover:bg-[#059669] text-white text-sm shadow-sm transition-all min-h-[44px] cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Invite New Teacher
          </Link>
        }
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Invitations",
            value: totalCount,
            sub: "All time recorded",
            color: "#3B82F6",
            icon: Mail,
          },
          {
            label: "Pending Activation",
            value: pendingCount,
            sub: "Awaiting teacher login",
            color: "#F59E0B",
            icon: Clock,
          },
          {
            label: "Claimed & Active",
            value: claimedCount,
            sub: "Successfully activated",
            color: "#10B981",
            icon: CheckCircle2,
          },
          {
            label: "Revoked / Expired",
            value: revokedCount,
            sub: "Deactivated access",
            color: "#EF4444",
            icon: XCircle,
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-2xl p-5 bg-white dark:bg-[#1E2623] border border-slate-200/80 dark:border-white/[0.08] shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {kpi.label}
                </span>
                <Icon className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
              <p
                className="text-2xl sm:text-3xl font-black mt-2 tabular-nums"
                style={{ color: kpi.color }}
              >
                {kpi.value}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E2623] text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 focus:border-[#10B981] transition-all"
          />
        </div>

        <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E2623] p-1 gap-1">
          {[
            { id: "all", label: `All (${totalCount})` },
            { id: "pending", label: `Pending (${pendingCount})` },
            { id: "claimed", label: `Claimed (${claimedCount})` },
            { id: "revoked", label: `Revoked (${revokedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px] cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-[#10B981] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#1E2623] border border-slate-200/80 dark:border-white/[0.08] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] divide-y divide-slate-100 dark:divide-white/5 text-sm">
            <thead className="bg-slate-50/80 dark:bg-white/[0.02]">
              <tr>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Teacher / Staff Member
                </th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Assigned Role
                </th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Temporary Password
                </th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Sent On
                </th>
                <th className="px-6 py-3.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Mail className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No teacher invitations match your filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((invite) => {
                  const isRevealed = Boolean(revealedPasswords[invite.id]);
                  const isPending = invite.status === "pending";

                  return (
                    <tr
                      key={invite.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                          {invite.name || invite.email.split("@")[0]}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{invite.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                          <Shield className="w-3 h-3 text-slate-400" />
                          {invite.role}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            invite.status === "claimed"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
                              : invite.status === "revoked"
                              ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800"
                              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
                          }`}
                        >
                          {invite.status === "claimed" ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : invite.status === "revoked" ? (
                            <XCircle className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          <span className="capitalize">{invite.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isPending && invite.temp_password ? (
                          <div className="inline-flex items-center gap-2">
                            <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200">
                              {isRevealed ? invite.temp_password : "••••••••••••"}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePassword(invite.id)}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                              title={isRevealed ? "Hide Password" : "Show Password"}
                            >
                              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(invite.temp_password || "", invite.id, "Password")
                              }
                              className="p-1 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                              title="Copy Password"
                            >
                              {copiedId === invite.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-mono">
                            {invite.status === "claimed" ? "Encrypted on activation" : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                        {invite.created_at ? format(new Date(invite.created_at), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {isPending ? (
                          <button
                            type="button"
                            onClick={() => copyFullCredentials(invite)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800 transition-all min-h-[36px] cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            Copy Packet
                          </button>
                        ) : (
                          <Link
                            href="/admin/teachers"
                            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-[#10B981] transition-colors"
                          >
                            <span>Manage</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
