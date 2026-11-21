import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { sanitizeInternalRedirect } from "@/lib/utils/redirect";
import { isAdminEmail } from "@/lib/auth/admin-guard";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeInternalRedirect(requestUrl.searchParams.get("next"));

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const cookiesToApply: Array<{ name: string; value: string; options?: any }> = [];

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            cookiesToApply.push({ name, value, options });
          });
        },
      },
    });

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const targetPath =
        next === "/" && isAdminEmail(data.user?.email) ? "/admin" : next;
      const response = NextResponse.redirect(new URL(targetPath, requestUrl.origin));
      response.headers.set("Cache-Control", "private, no-store");
      cookiesToApply.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, options)
      );
      return response;
    }
    console.error("OAuth exchange code error:", error);
  }

  return NextResponse.redirect(
    new URL("/login?error=oauth_failed", requestUrl.origin)
  );
}
