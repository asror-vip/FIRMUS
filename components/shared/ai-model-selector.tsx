"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/context/app-state";
import { AI_MODELS, type AiModelId } from "@/lib/config/plans";
import { Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function AiModelSelector({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { subscription, setPreferredAiModel } = useAppState();

  const handlePick = async (modelId: AiModelId) => {
    if (!subscription.limits.allowedModels.includes(modelId)) {
      toast.info(
        `${AI_MODELS[modelId].label} modeli Pro va Pro+ tariflarida ochiladi. Obunalar boʻlimidan 7 kunlik bepul sinovni yoqishingiz mumkin.`
      );
      router.push("/billing");
      return;
    }
    if (subscription.preferredModel === modelId) return;
    try {
      await setPreferredAiModel(modelId);
      toast.success(`Model tanlandi: ${AI_MODELS[modelId].label}`);
    } catch (err: any) {
      toast.error(err?.message || "Modelni almashtirib boʻlmadi");
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 pb-1.5">
      <div className="inline-flex items-center rounded-lg border border-border/80 bg-muted/40 p-0.5 text-[11px]">
        {(["gemini-3.8-flash", "gemini-4-hydrogen"] as AiModelId[]).map((mId) => {
          const meta = AI_MODELS[mId];
          const isSelected = subscription.preferredModel === mId;
          const isLocked = !subscription.limits.allowedModels.includes(mId);

          return (
            <button
              key={mId}
              type="button"
              onClick={() => handlePick(mId)}
              title={meta.description}
              className={cn(
                "inline-flex items-center gap-1 rounded-md font-medium transition-colors",
                compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
                isSelected
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isLocked ? (
                <Lock className="h-2.5 w-2.5 text-amber-500 shrink-0" />
              ) : (
                <Sparkles
                  className={cn(
                    "h-2.5 w-2.5 shrink-0",
                    isSelected ? "text-indigo-500" : "text-muted-foreground/70"
                  )}
                />
              )}
              <span>{compact ? meta.shortLabel : meta.label}</span>
            </button>
          );
        })}
      </div>

      {!compact && (
        <span className="text-[10px] text-muted-foreground hidden sm:inline truncate">
          {AI_MODELS[subscription.preferredModel].description}
        </span>
      )}
    </div>
  );
}
