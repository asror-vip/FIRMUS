"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useAppState } from "@/lib/context/app-state";

const DynamicAiDrawer = dynamic(
  () => import("@/components/shell/ai-drawer").then((m) => m.AiDrawer),
  { ssr: false }
);

const DynamicCommandPalette = dynamic(
  () => import("@/components/shell/command-palette").then((m) => m.CommandPalette),
  { ssr: false }
);

export function AppOverlays() {
  const { isAiDrawerOpen, isSearchOpen } = useAppState();
  const [hasOpenedAi, setHasOpenedAi] = useState(false);

  useEffect(() => {
    if (isAiDrawerOpen) {
      setHasOpenedAi(true);
    }
  }, [isAiDrawerOpen]);

  return (
    <>
      {(isAiDrawerOpen || hasOpenedAi) && <DynamicAiDrawer />}
      {isSearchOpen && <DynamicCommandPalette />}
    </>
  );
}
