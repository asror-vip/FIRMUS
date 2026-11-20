"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/context/locale-context";
import { useAuthFormsDict } from "@/lib/i18n/domains/use-auth-forms-dict";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { language: locale } = useLocale();
  const d = useAuthFormsDict(locale).resetPassword;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { toast } = await import("sonner");
    if (!password || !confirmPassword) {
      toast.error(d.missingFieldsToast);
      return;
    }
    if (password.length < 8) {
      toast.error(d.passwordMinToast);
      return;
    }
    if (password !== confirmPassword) {
      toast.error(d.passwordMismatchToast);
      return;
    }

    setIsLoading(true);
    try {
      const { supabase } = await import("@/lib/supabase/client");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setIsSuccess(true);
      toast.success(d.successToast);
    } catch (err: any) {
      console.error("Update password error:", err);
      toast.error(err?.message || d.errorToast);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-2">
          <div className="relative inline-flex items-center justify-center mb-1">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 opacity-50 blur-lg" />
            <img
              src="/brand/firmus-f.jpg"
              alt="FIRMUS"
              className="relative h-14 w-14 rounded-2xl object-cover shadow-2xl border border-violet-400/40"
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
            {d.title}
          </h1>
          <p className="text-xs text-muted-foreground">{d.subtitle}</p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.18)] p-6 space-y-4 text-xs">
          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  {d.newPasswordLabel}
                </label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    placeholder={d.newPasswordPlaceholder}
                    className="pl-8 text-xs h-9"
                    minLength={8}
                    required
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{d.passwordHint}</p>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  {d.confirmPasswordLabel}
                </label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    type="password"
                    placeholder={d.confirmPasswordPlaceholder}
                    className="pl-8 text-xs h-9"
                    minLength={8}
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
                    {d.savingBtn}
                  </>
                ) : (
                  <>
                    {d.submitBtn} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 className="h-10 w-10 text-violet-600 dark:text-violet-400 mx-auto" />
              <h3 className="font-bold text-sm text-foreground">{d.successTitle}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {d.successDesc}
              </p>
              <Button
                type="button"
                onClick={() => {
                  router.push("/");
                  router.refresh();
                }}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white text-xs h-9 font-semibold shadow-sm transition-all"
              >
                {d.goToAppBtn} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <div className="pt-2 text-center">
            <Link
              href="/login"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" /> {d.backToLogin}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
