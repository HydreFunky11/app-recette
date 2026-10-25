import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );

  // refreshing the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect internal routes if needed
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth') || request.nextUrl.pathname === '/login';
  const isPublicAsset = 
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/icons') ||
    request.nextUrl.pathname === '/manifest.json' ||
    request.nextUrl.pathname === '/favicon.ico';

  if (!user && !isAuthPage && !isPublicAsset && request.nextUrl.pathname !== '/') {
    // Optionally redirect unauthenticated users to /login
  }

  return supabaseResponse;
}
