import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSupabaseKey } from "@/lib/supabase-env";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = getServerSupabaseKey();

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ students: 0, teachers: 0, classes: 0 }, { status: 200 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [studentsResult, teachersResult, classesResult] = await Promise.all([
      supabaseAdmin.from("students").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("teachers").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("classes").select("id", { count: "exact", head: true }),
    ]);

    return NextResponse.json({
      students: studentsResult.count || 0,
      teachers: teachersResult.count || 0,
      classes: classesResult.count || 0,
    });
  } catch (error: any) {
    console.error("Failed to fetch public stats:", error);
    return NextResponse.json({ students: 0, teachers: 0, classes: 0 }, { status: 500 });
  }
}
