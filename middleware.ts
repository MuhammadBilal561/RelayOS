import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const isDashboardRoute = request.nextUrl.pathname.startsWith("/overview") ||
    request.nextUrl.pathname.startsWith("/inbox") ||
    request.nextUrl.pathname.startsWith("/leads") ||
    request.nextUrl.pathname.startsWith("/knowledge-base") ||
    request.nextUrl.pathname.startsWith("/bookings") ||
    request.nextUrl.pathname.startsWith("/analytics") ||
    request.nextUrl.pathname.startsWith("/settings");

  const isAuthRoute = request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup";

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    console.error("Middleware auth check failed:", error);
    // On error, if it's a dashboard route, redirect to login
    if (isDashboardRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  if (isDashboardRoute && !user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && user) {
    const overviewUrl = new URL("/overview", request.url);
    return NextResponse.redirect(overviewUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/overview/:path*",
    "/inbox/:path*",
    "/leads/:path*",
    "/knowledge-base/:path*",
    "/bookings/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/login",
    "/signup",
  ],
};
