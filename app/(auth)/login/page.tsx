"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("dilnoza.bux@auvrio.uz");
  const [password, setPassword] = useState("••••••••••••");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Muvaffaqiyatli kirdingiz!");
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm space-y-5">
        {/* Brand */}
        <div className="text-center space-y-1">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-base shadow-sm mb-2">
            AU
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
            AUVRIO Platformasiga Kirish
          </h1>
          <p className="text-xs text-muted-foreground">
            Buxgalteriya va biznes boshqaruvi tizimi
          </p>
        </div>

        <Card className="shadow-lg border-border">
          <CardContent className="pt-6 space-y-4 text-xs">
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Elektron pochta (yoki telefon):
                </label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    className="pl-8 text-xs h-9"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-foreground">Parol:</label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] text-primary hover:underline"
                  >
                    Parolni unutdingizmi?
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
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 font-semibold"
              >
                Tizimga kirish <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-card px-2 text-muted-foreground">yoki</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full text-xs h-9 gap-2"
              onClick={() => {
                toast.success("E-IMZO moduli orqali kirish tasdiqlandi!");
                router.push("/");
              }}
            >
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              E-IMZO (ERI) orqali kirish
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Hisobingiz yoʻqmi?{" "}
          <Link href="/register" className="text-primary font-semibold hover:underline">
            Roʻyxatdan oʻtish
          </Link>
        </p>
      </div>
    </div>
  );
}
