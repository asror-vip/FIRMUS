import React from "react";
import { AppStateProvider } from "@/lib/context/app-state";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppStateProvider>{children}</AppStateProvider>;
}
