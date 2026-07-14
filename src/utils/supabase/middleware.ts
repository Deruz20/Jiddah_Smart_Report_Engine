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

  const validRoles = [
    'admin', 'Admin',
    'DOS Secular', 'DOS Theology', 'Secular DOS', 'Theology DOS',
    'teacher', 'Class Teacher', 'Theology Instructor', 'Head Teacher',
    'Support Staff', 'Deputy Head Teacher'
  ];
  const role = user?.user_metadata?.role;
  const isValidRole = role && validRoles.includes(role);

  // protected routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    // If the user is authenticated but doesn't have a recognized role, we could deny,
    // but the sidebar simply filters what they see. Let's just ensure they are logged in.
  }
  
  // If they somehow navigate to /teacher, redirect them back to /admin
  if (request.nextUrl.pathname.startsWith('/teacher')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  // Redirect logged in users away from /login
  if (request.nextUrl.pathname.startsWith('/login') && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
