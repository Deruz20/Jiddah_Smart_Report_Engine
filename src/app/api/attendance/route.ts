import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { verifyDataAccess } from "@/lib/auth-server";
import { canAccessClass } from "@/lib/teacher-access";
import { recordActivity } from "@/lib/api-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { class_id, date, rows } = body || {};

    if (!class_id || !date || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "class_id, date, and non-empty attendance rows are required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authRes = await verifyDataAccess(supabase, user, "write");
    if (!authRes.isAuthorized) {
      return NextResponse.json({ error: authRes.message }, { status: 403 });
    }

    const { data: cls } = await supabase
      .from("circular_classes")
      .select("id, class_name")
      .eq("id", class_id)
      .maybeSingle();

    if (!canAccessClass(authRes, "circular", class_id, cls?.class_name)) {
      return NextResponse.json(
        { error: "Forbidden: Class outside assigned teaching scope" },
        { status: 403 }
      );
    }

    const validStatuses = new Set(["present", "absent", "late", "excused"]);
    const sanitized = rows.map((row: any) => ({
      student_id: String(row.student_id),
      class_id: String(class_id),
      date: String(date),
      status: validStatuses.has(row.status) ? row.status : "present",
      recorded_by: user.id,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("attendance")
      .upsert(sanitized, { onConflict: "student_id,date" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await recordActivity(supabase, user.id, "Recorded Roll Call", {
      class_id,
      date,
      count: sanitized.length,
    });

    return NextResponse.json({ success: true, count: sanitized.length });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

