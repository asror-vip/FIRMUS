"use client";

import React, { useRef, useEffect } from "react";
import { Paperclip, ArrowUp, Square, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getShellSharedDict } from "@/lib/i18n/domains/shell-shared";
import {
  AI_IMAGE_FORMAT_ERROR,
  compressImageForAi,
  inspectClipboardPaste,
  isSupportedAiImageFile,
  type CompressedImageResult,
} from "@/lib/utils/image-compression";

interface ChatImageInputBarProps {
  value: string;
  onChange: (val: string) => void;
  attachedImage: CompressedImageResult | null;
  onAttachImage: (img: CompressedImageResult | null) => void;
  isSending: boolean;
  isStreaming?: boolean;
  onSubmit: () => void;
  onStop?: () => void;
  placeholder?: string;
  compact?: boolean;
  maxDimension?: number;
  maxCompressedBytes?: number;
}

export function ChatImageInputBar({
  value,
  onChange,
  attachedImage,
  onAttachImage,
  isSending,
  isStreaming = false,
  onSubmit,
  onStop,
  placeholder,
  compact = false,
  maxDimension,
  maxCompressedBytes,
}: ChatImageInputBarProps) {
  const { locale } = useTranslation();
  const d = getShellSharedDict(locale);
  const cib = d.shared.chatImageInputBar;
  const resolvedPlaceholder = placeholder ?? cib.placeholder;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, compact ? 100 : 140)}px`;
  }, [value, compact]);

  const mapImageError = (raw?: string): string => {
    if (!raw || raw === AI_IMAGE_FORMAT_ERROR) return cib.invalidFormatError;
    if (raw.includes("25 MB")) return cib.maxSizeError;
    if (raw.includes("shikastlangan")) return cib.corruptError;
    if (raw.includes("oʻqib boʻlmadi")) return cib.readError;
    if (raw.includes("siqishda")) return cib.compressError;
    return raw;
  };

  const handleImageCandidate = async (file?: File | null) => {
    if (!file) return;
    if (!isSupportedAiImageFile(file)) {
      toast.error(cib.invalidFormatError);
      return;
    }
    try {
      const compressed = await compressImageForAi(file, {
        maxDimension,
        maxCompressedBytes,
      });
      onAttachImage(compressed);
    } catch (err: any) {
      toast.error(mapImageError(err?.message));
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const res = inspectClipboardPaste(e.clipboardData);
    if (res.kind === "image") {
      e.preventDefault();
      await handleImageCandidate(res.file);
    } else if (res.kind === "invalid_file") {
      e.preventDefault();
      toast.error(cib.invalidFormatError);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isSending && (value.trim() || attachedImage)) {
        onSubmit();
      }
    }
  };

  const isBusy = isSending || isStreaming;
  const canSend = !isBusy && Boolean(value.trim() || attachedImage);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isBusy && onStop) {
          onStop();
        } else if (canSend) {
          onSubmit();
        }
      }}
      className={cn(
        "rounded-2xl border border-border/80 bg-muted/35 focus-within:bg-background focus-within:border-indigo-500/60 focus-within:shadow-md transition-all",
        compact ? "px-2.5 py-2" : "px-3.5 py-2.5"
      )}
    >
      {attachedImage && (
        <div className="mb-2 inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/5 pl-1.5 pr-2 py-1 text-xs animate-in fade-in zoom-in-95 duration-150">
          <img
            src={attachedImage.dataUrl}
            alt={cib.attachedImageAlt}
            className="h-9 w-9 rounded-lg object-cover border border-border shrink-0"
          />
          <div className="min-w-0 max-w-[190px]">
            <div className="font-medium text-foreground truncate flex items-center gap-1 text-[11px]">
              <ImageIcon className="h-3 w-3 text-indigo-500 shrink-0" />
              <span className="truncate">{attachedImage.fileName}</span>
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              {Math.round(attachedImage.compressedBytes / 1024)} KB • {attachedImage.width}×{attachedImage.height}
            </div>
          </div>
          <button
            type="button"
            className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label={cib.removeImageLabel}
            onClick={() => onAttachImage(null)}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={async (e) => {
            const picked = e.target.files?.[0];
            e.target.value = "";
            await handleImageCandidate(picked);
          }}
        />

        <button
          type="button"
          disabled={isSending}
          title={cib.attachTooltip}
          aria-label={cib.attachAriaLabel}
          onClick={() => fileInputRef.current?.click()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          placeholder={resolvedPlaceholder}
          disabled={isSending}
          className="flex-1 resize-none bg-transparent py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60 leading-relaxed max-h-[140px]"
        />

        <button
          type="submit"
          disabled={isBusy ? !onStop : !canSend}
          aria-label={isBusy ? cib.stopLabel : cib.sendLabel}
          title={isBusy ? cib.stopLabel : cib.sendLabel}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-150",
            isBusy
              ? "bg-foreground text-background hover:opacity-85 shadow-sm"
              : canSend
              ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm hover:scale-105 active:scale-95"
              : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
          )}
        >
          {isBusy ? (
            <Square className="h-3 w-3 fill-current" />
          ) : (
            <ArrowUp className="h-4 w-4 stroke-[2.5]" />
          )}
        </button>
      </div>
    </form>
  );
}
