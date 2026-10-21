import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAnonKey } from "@/lib/supabase-env";
import { normalizeAccountRole, resolveRoleDepartment } from "@/lib/teacher-access";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = getSupabaseAnonKey();

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let rawRole = "guest";
  let rawSubject = "";
  let status = "active";

  if (user) {
    rawRole =
      user.app_metadata?.role ||
      user.user_metadata?.role ||
      "Class Teacher";
    rawSubject = user.user_metadata?.subject || "";

    if (user.email) {
      const { data: teacherProfile } = await supabase
        .from("teachers")
        .select("role, subject, status")
        .eq("email", user.email)
        .maybeSingle();
      if (teacherProfile?.role) {
        rawRole = teacherProfile.role;
      }
      if (teacherProfile?.subject) {
        rawSubject = teacherProfile.subject;
      }
      if (teacherProfile?.status) {
        status = teacherProfile.status;
      }
    }
  }

  const path = request.nextUrl.pathname;

  if (
    process.env.NODE_ENV === "production" &&
    (path.startsWith("/preview-shell") || path.startsWith("/preview-test"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = !user ? "/login" : "/admin";
    return NextResponse.redirect(url);
  }

  if (!user) {
    if (
      path.startsWith("/admin") ||
      path.startsWith("/dos") ||
      path.startsWith("/teacher") ||
      path.startsWith("/pending") ||
      path === "/"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const rl = rawRole.trim().toLowerCase();
  const isSuspended = ["inactive", "suspended", "deactivated", "banned"].includes(
    status.trim().toLowerCase()
  );
  const isPendingOrSupport =
    isSuspended || rl === "support staff" || rl === "pending" || rl === "guest";

  const targetLanding = isPendingOrSupport ? "/pending" : "/admin";

  if (path === "/login" || path === "/") {
    const url = request.nextUrl.clone();
    url.pathname = targetLanding;
    return NextResponse.redirect(url);
  }

  if (path.startsWith("/admin") && targetLanding !== "/admin") {
    const url = request.nextUrl.clone();
    url.pathname = targetLanding;
    return NextResponse.redirect(url);
  }

  if (path.startsWith("/dos") || path.startsWith("/teacher")) {
    const url = request.nextUrl.clone();
    url.pathname = path.replace(/^\/(dos|teacher)/, "/admin");
    return NextResponse.redirect(url);
  }

  if (path.startsWith("/pending") && targetLanding !== "/pending") {
    const url = request.nextUrl.clone();
    url.pathname = targetLanding;
    return NextResponse.redirect(url);
  }

  // Enforce role & department boundaries on /admin sub-routes
  if (path.startsWith("/admin")) {
    const canonicalRole = normalizeAccountRole(rawRole, rawSubject);
    const department = resolveRoleDepartment(rawRole, rawSubject);

    if (canonicalRole === "Class Teacher") {
      const teacherBlockedPrefixes = [
        "/admin/settings",
        "/admin/teachers",
        "/admin/invites",
        "/admin/upload",
        "/admin/activity",
        "/admin/dev-tools",
      ];
      if (teacherBlockedPrefixes.some((prefix) => path.startsWith(prefix))) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin";
        return NextResponse.redirect(url);
      }
    }

    if (department === "secular" && path.startsWith("/admin/theology-hub")) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }

    if (department === "theology" && path.startsWith("/admin/secular-hub")) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
