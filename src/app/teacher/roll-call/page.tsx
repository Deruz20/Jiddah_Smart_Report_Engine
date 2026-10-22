import React from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { RollCallClient } from "@/components/teacher/RollCallClient";
import { verifyDataAccess } from "@/lib/auth-server";
import { classIdsForType } from "@/lib/teacher-access";

export const dynamic = "force-dynamic";

export default async function RollCallPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-8 text-rose-500 font-medium max-w-xl mx-auto mt-10 bg-rose-50 border border-rose-200 rounded-2xl">
        Unauthorized: Please log in to take roll call.
      </div>
    );
  }

  const metaRole = user.app_metadata?.role || user.user_metadata?.role;
  const { isAdministratorRole } = await import("@/lib/teacher-access");
  const isAdmin = isAdministratorRole(metaRole);

  let allowedClasses: Array<{ id: string; class_name: string; section?: string }> = [];

  if (isAdmin) {
    const { data } = await supabase
      .from("circular_classes")
      .select("id, class_name, section")
      .order("class_name");
    allowedClasses = data || [];
  } else {
    const authRes = await verifyDataAccess(supabase, user, "read");
    if (!authRes.isAuthorized) {
      return (
        <div className="p-8 text-rose-500 font-medium max-w-xl mx-auto mt-10 bg-rose-50 border border-rose-200 rounded-2xl">
          Access Denied: You do not have permission to record class attendance.
        </div>
      );
    }
    const classIds = classIdsForType(authRes, "circular");
    if (classIds && classIds.length > 0) {
      const { data } = await supabase
        .from("circular_classes")
        .select("id, class_name, section")
        .in("id", classIds)
        .order("class_name");
      allowedClasses = data || [];
    } else {
      const { data } = await supabase
        .from("circular_classes")
        .select("id, class_name, section")
        .order("class_name");
      allowedClasses = data || [];
    }
  }

  return (
    <div className="w-full min-h-full bg-[var(--bg-canvas,#090C0A)] text-[var(--text-primary,#F1F5F9)] transition-colors">
      <RollCallClient
        initialClasses={allowedClasses}
        userRole={metaRole || "Staff"}
      />
    </div>
  );
}
