"use client";

import React, { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Iltimos, elektron pochtangizni kiriting");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) throw error;

      setIsSent(true);
      toast.success("Parolni tiklash havolasi emailingizga yuborildi!");
    } catch (err: any) {
      console.error("Reset password error:", err);
      toast.error(err.message || "Parolni tiklash soʻrovida xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-1">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-base shadow-sm mb-2">
            F
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
            Parolni Qayta Tiklash
          </h1>
          <p className="text-xs text-muted-foreground">
            Roʻyxatdan oʻtgan elektron pochta manzilingizni kiriting
          </p>
        </div>

        <Card className="shadow-lg border-border">
          <CardContent className="pt-6 space-y-4 text-xs">
            {!isSent ? (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    Elektron pochta:
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      placeholder="buxgalter@kompaniya.uz"
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
                      Yuborilmoqda...
                    </>
                  ) : (
                    "Tiklash havolasini yuborish"
                  )}
                </Button>
              </form>
            ) : (
              <div className="text-center py-4 space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                <h3 className="font-bold text-sm text-foreground">Havola yuborildi!</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Iltimos, pochtangizni ({email}) tekshiring va koʻrsatilgan havola orqali yangi parol oʻrnating.
                </p>
              </div>
            )}

            <div className="pt-2 text-center">
              <Link
                href="/login"
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" /> Kirish sahifasiga qaytish
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
