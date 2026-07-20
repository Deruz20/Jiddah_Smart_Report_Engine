import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseAnonKey } from "@/lib/supabase-env";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = getSupabaseAnonKey();

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This will refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch role from database (source of truth)
  let role = 'guest';

  if (user) {
    if (user.user_metadata?.role === 'admin') {
      role = 'admin'; // Bootstrap admin fallback
    }

    // DB query for actual role
    if (user.email) {
      const { data: teacherProfile } = await supabase
        .from('teachers')
        .select('role')
        .eq('email', user.email)
        .single();
      
      if (teacherProfile?.role) {
        role = teacherProfile.role;
      }
    }
  }

  // Explicit mapping of roles to landing paths
  let targetLanding = '/pending';
  
  if (role === 'admin' || role === 'Administrator' || role === 'Head Teacher') {
    targetLanding = '/admin';
  } else if (role === 'DOS' || (typeof role === 'string' && role.toUpperCase().includes('DOS'))) {
    targetLanding = '/dos';
  } else if (role === 'Class Teacher' || role === 'Theology Instructor' || role === 'teacher') {
    targetLanding = '/teacher';
  } else if (role === 'Support Staff' || role === 'Deputy Head Teacher') {
    targetLanding = '/pending';
  }

  const path = request.nextUrl.pathname;

  if (role === 'guest') {
    // Protect authenticated routes
    if (path.startsWith('/admin') || path.startsWith('/dos') || path.startsWith('/teacher') || path.startsWith('/pending') || path === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  } else {
    // If logged in and hitting login or root, go to target landing
    if (path === '/login' || path === '/') {
      const url = request.nextUrl.clone();
      url.pathname = targetLanding;
      return NextResponse.redirect(url);
    }

    // Protect role-specific routes from unauthorized access
    if (path.startsWith('/admin') && targetLanding !== '/admin') {
      const url = request.nextUrl.clone();
      url.pathname = targetLanding;
      return NextResponse.redirect(url);
    }
    if (path.startsWith('/dos') && targetLanding !== '/dos') {
      const url = request.nextUrl.clone();
      url.pathname = targetLanding;
      return NextResponse.redirect(url);
    }
    if (path.startsWith('/teacher') && targetLanding !== '/teacher') {
      const url = request.nextUrl.clone();
      url.pathname = targetLanding;
      return NextResponse.redirect(url);
    }
    if (path.startsWith('/pending') && targetLanding !== '/pending') {
      const url = request.nextUrl.clone();
      url.pathname = targetLanding;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
