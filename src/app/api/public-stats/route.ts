import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials in environment");
      return NextResponse.json({ students: 0, teachers: 0, classes: 0 }, { status: 500 });
    }

    // Use the service role key to bypass RLS for public stats
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

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
