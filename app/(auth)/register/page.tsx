"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { User, Mail, Lock, Phone, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+998 ");
  const [password, setPassword] = useState("");

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Roʻyxatdan oʻtish muvaffaqiyatli! Onboarding bosqichiga yoʻnaltirilmoqda...");
    router.push("/onboarding");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-1">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-base shadow-sm mb-2">
            AU
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
            AUVRIO Hisobini Yaratish
          </h1>
          <p className="text-xs text-muted-foreground">
            14 kunlik bepul sinov davri (Karta talab etilmaydi)
          </p>
        </div>

        <Card className="shadow-lg border-border">
          <CardContent className="pt-6 space-y-3.5 text-xs">
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Toʻliq ism-sharifingiz:
                </label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alisher Rustamov"
                    className="pl-8 text-xs h-9"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Elektron pochta manzili:
                </label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="alisher@kompaniya.uz"
                    className="pl-8 text-xs h-9"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Telefon raqamingiz:
                </label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+998 90 123-45-67"
                    className="pl-8 text-xs h-9 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Parol oʻylab toping:
                </label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    placeholder="Kamida 8 ta belgi"
                    className="pl-8 text-xs h-9"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 font-semibold mt-2"
              >
                Roʻyxatdan oʻtish <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Profilingiz bormi?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Tizimga kirish
          </Link>
        </p>
      </div>
    </div>
  );
}
