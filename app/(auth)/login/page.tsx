"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { sanitizeInternalRedirect } from "@/lib/utils/redirect";
import { useLocale } from "@/lib/context/locale-context";
import { useAuthFormsDict } from "@/lib/i18n/domains/use-auth-forms-dict";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Mail, ArrowRight, Loader2 } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectedFrom = sanitizeInternalRedirect(searchParams.get("redirectedFrom"));
  const authError = searchParams.get("error");
  const { language: locale } = useLocale();
  const d = useAuthFormsDict(locale).login;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const shownOauthErrorRef = React.useRef(false);

  React.useEffect(() => {
    if (authError === "oauth_failed" && !shownOauthErrorRef.current) {
      shownOauthErrorRef.current = true;
      void import("sonner").then(({ toast }) => toast.error(d.oauthFailedToast));
    }
  }, [authError, d.oauthFailedToast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { toast } = await import("sonner");
    if (!email || !password) {
      toast.error(d.missingFieldsToast);
      return;
    }

    setIsLoading(true);
    try {
      const { supabase } = await import("@/lib/supabase/client");
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      toast.success(d.loginSuccessToast);
      window.location.assign(redirectedFrom);
    } catch (err: any) {
      console.error("Login error:", err);
      toast.error(err.message || d.invalidCredentialsToast);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { supabase } = await import("@/lib/supabase/client");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectedFrom)}`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;
    } catch (err: any) {
      console.error("Google login error:", err);
      const { toast } = await import("sonner");
      toast.error(err.message || d.googleErrorToast);
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-1.5">
          <Link href="/welcome" className="inline-flex items-center justify-center mb-1">
            <Image
              src="/brand/firmus-wordmark.png"
              alt="FIRMUS"
              width={160}
              height={40}
              priority
              className="h-10 w-auto object-contain dark:hidden"
            />
            <Image
              src="/brand/firmus-wordmark-dark.png"
              alt="FIRMUS"
              width={160}
              height={40}
              priority
              className="h-10 w-auto object-contain hidden dark:block"
            />
          </Link>
          <h1 className="text-sm font-medium text-muted-foreground">{d.subtitle}</h1>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.18)] p-6 space-y-4 text-xs">
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={handleGoogleLogin}
            className="w-full text-xs h-10 gap-2.5 font-semibold border-border/70 hover:border-violet-500/40 bg-muted/20 hover:bg-violet-500/5 transition-colors"
          >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              {d.googleBtn}
            </Button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-card px-2 text-muted-foreground">{d.orEmail}</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  {d.emailLabel}
                </label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    className="pl-8 text-xs h-9"
                    placeholder={d.emailPlaceholder}
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-foreground">{d.passwordLabel}</label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] text-primary hover:underline"
                  >
                    {d.forgotLink}
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    className="pl-8 text-xs h-9"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white text-xs h-9 font-semibold shadow-sm transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    {d.loadingBtn}
                  </>
                ) : (
                  <>
                    {d.submitBtn} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {d.noAccount}{" "}
          <Link href="/register" className="text-primary font-semibold hover:underline">
            {d.registerLink}
          </Link>
        </p>

        <p className="text-center text-[10px] text-muted-foreground/80">
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {d.privacyLink}
          </Link>
          {" • "}
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {d.termsLink}
          </Link>
        </p>
      </div>
    </div>
  );
}

function LoginSuspenseFallback() {
  const { language: locale } = useLocale();
  const d = useAuthFormsDict(locale).login;
  return (
    <div className="min-h-screen bg-background flex items-center justify-center text-xs text-muted-foreground">
      {d.suspenseLoading}
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<LoginSuspenseFallback />}>
      <LoginForm />
    </React.Suspense>
  );
}
