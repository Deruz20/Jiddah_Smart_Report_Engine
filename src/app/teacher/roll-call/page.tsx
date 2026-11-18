import React from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { RollCallClient } from "@/components/teacher/RollCallClient";
import { verifyDataAccess, hasPermission } from "@/lib/auth-server";
import { classIdsForType, isAdministratorRole } from "@/lib/teacher-access";

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

  const authRes = await verifyDataAccess(supabase, user, "read");
  if (
    !authRes.isAuthorized ||
    authRes.filterByDepartment === "theology" ||
    (!hasPermission(authRes, "read_students") && !hasPermission(authRes, "write_marks"))
  ) {
    return (
      <div className="p-8 text-rose-500 font-medium max-w-xl mx-auto mt-10 bg-rose-50 border border-rose-200 rounded-2xl">
        Access Denied: You do not have permission to record class attendance.
      </div>
    );
  }

  let allowedClasses: Array<{ id: string; class_name: string; section?: string }> = [];

  if (isAdministratorRole(authRes.role)) {
    const { data } = await supabase
      .from("circular_classes")
      .select("id, class_name, section")
      .order("class_name");
    allowedClasses = data || [];
  } else {
    const classIds = classIdsForType(authRes, "circular");
    if (classIds && classIds.length > 0) {
      const { data } = await supabase
        .from("circular_classes")
        .select("id, class_name, section")
        .in("id", classIds)
        .order("class_name");
      allowedClasses = data || [];
    } else if (classIds === null) {
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
        userRole={authRes.role || "Staff"}
      />
    </div>
  );
}
