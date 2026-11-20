import React from "react";
import { GuideTopBanner } from "@/components/shared/guide-top-banner";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <GuideTopBanner />
      <div className="flex-1">{children}</div>
    </div>
  );
}
