"use client";

import React, { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getAuthLegalDict } from "@/lib/i18n/domains/auth-legal";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const { locale } = useTranslation();
  const d = getAuthLegalDict(locale).forgotPassword;

  const [email, setEmail] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error(d.missingEmailToast);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });

      if (error) throw error;

      setIsSent(true);
      toast.success(d.sentToast);
    } catch (err: any) {
      console.error("Reset password error:", err);
      toast.error(err.message || d.resetErrorToast);
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
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 opacity-50 blur-lg" />
            <img
              src="/brand/firmus-f.jpg"
              alt="FIRMUS"
              className="relative h-14 w-14 rounded-2xl object-cover shadow-2xl border border-blue-400/40"
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
            {d.title}
          </h1>
          <p className="text-xs text-muted-foreground">{d.subtitle}</p>
        </div>

        <Card className="shadow-lg border-border">
          <CardContent className="pt-6 space-y-4 text-xs">
            {!isSent ? (
              <form onSubmit={handleSubmit} className="space-y-3.5">
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
                      placeholder={d.emailPlaceholder}
                      className="pl-8 text-xs h-9"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 font-semibold"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      {d.sendingBtn}
                    </>
                  ) : (
                    d.submitBtn
                  )}
                </Button>
              </form>
            ) : (
              <div className="text-center py-4 space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                <h3 className="font-bold text-sm text-foreground">{d.sentTitle}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {d.sentSuccess.replace("{email}", email)}
                </p>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
