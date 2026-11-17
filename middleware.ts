import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { FEATURES } from "@/lib/config/features";
import { getRequestLocale } from "@/lib/i18n/server-locale";
import { getApiMessages } from "@/lib/i18n/domains/api-messages";

const ERP_ONLY_PREFIXES = [
  "/accounting",
  "/transactions",
  "/tax",
  "/ai-auditor",
  "/finance",
];

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token")
    );
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const { pathname } = request.nextUrl;

  const isPublicPage =
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/api/payments/") ||
    pathname === "/api/health";

  const isResetPasswordPage = pathname.startsWith("/reset-password");

  // Public, legal, webhook, health, and password recovery routes incur zero Supabase Auth latency
  if (isPublicPage || isResetPasswordPage) {
    return response;
  }

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password");

  const hasAuthCookie = hasSupabaseAuthCookie(request);

  // Auth pages without a Supabase auth cookie incur zero Supabase Auth RTT
  if (isAuthPage && !hasAuthCookie) {
    return response;
  }

  // Protected API routes: fail fast with localized 401 when cookie is missing;
  // otherwise let the API route handler perform the single authoritative getUser() check
  if (pathname.startsWith("/api/")) {
    if (!hasAuthCookie) {
      return NextResponse.json(
        { error: getApiMessages(getRequestLocale(request)).authRequired },
        { status: 401 }
      );
    }
    return response;
  }

  const isErpBlocked =
    !FEATURES.fullAccountingErp &&
    ERP_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  const isRscOrPrefetch =
    request.headers.get("rsc") === "1" ||
    request.headers.get("next-router-prefetch") === "1";

  // Client-side RSC navigations & prefetches with an active auth cookie skip remote getUser() RTT
  if (isRscOrPrefetch && hasAuthCookie && !isAuthPage) {
    if (isErpBlocked) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: getUser() authenticates the token against the Supabase Auth server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is unauthenticated and attempting to access protected HTML routes
  if (!user && !isAuthPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    if (pathname !== "/") {
      redirectUrl.searchParams.set("redirectedFrom", pathname);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // If user is already authenticated and visits login/register/forgot-password
  if (user && isAuthPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }

  // Gate full ERP routes when fullAccountingErp is disabled
  if (isErpBlocked) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Protect all app routes except static Next.js assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
