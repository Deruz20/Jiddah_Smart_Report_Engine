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

  const role = user?.user_metadata?.role;
  const isDOS = role && role.startsWith('DOS');
  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher' || role === 'Class Teacher' || role === 'Theology Instructor' || role === 'Head Teacher';

  // protected routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    // Only Admin and DOS can access /admin
    if (!isAdmin && !isDOS) {
      const url = request.nextUrl.clone()
      url.pathname = '/teacher' // fallback
      return NextResponse.redirect(url)
    }
  }
  
  if (request.nextUrl.pathname.startsWith('/teacher')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    // Any authenticated user with a valid role can access teacher area (DOS, teacher, admin)
    // but typically admin might not need to. We'll allow all valid roles.
    if (!isAdmin && !isDOS && !isTeacher && role !== 'Support Staff' && role !== 'Deputy Head Teacher') {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }
  }

  if (request.nextUrl.pathname.startsWith('/login') && user) {
    const url = request.nextUrl.clone()
    if (isAdmin || isDOS) {
      url.pathname = '/admin'
    } else {
      url.pathname = '/teacher'
    }
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
