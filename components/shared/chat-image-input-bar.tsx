"use client";

import React, { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Paperclip, Send, Loader2, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
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
  onSubmit: () => void;
  placeholder?: string;
  compact?: boolean;
}

export function ChatImageInputBar({
  value,
  onChange,
  attachedImage,
  onAttachImage,
  isSending,
  onSubmit,
  placeholder = "Savol yozing, Ctrl+V qiling yoki skrepkadan rasm biriktiring...",
  compact = false,
}: ChatImageInputBarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageCandidate = async (file?: File | null) => {
    if (!file) return;
    if (!isSupportedAiImageFile(file)) {
      toast.error(AI_IMAGE_FORMAT_ERROR);
      return;
    }
    try {
      const compressed = await compressImageForAi(file);
      onAttachImage(compressed);
    } catch (err: any) {
      toast.error(err?.message || AI_IMAGE_FORMAT_ERROR);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const res = inspectClipboardPaste(e.clipboardData);
    if (res.kind === "image") {
      e.preventDefault();
      await handleImageCandidate(res.file);
    } else if (res.kind === "invalid_file") {
      e.preventDefault();
      toast.error(AI_IMAGE_FORMAT_ERROR);
    }
  };

  return (
    <div className="space-y-2">
      {attachedImage && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/5 px-2.5 py-1.5 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={attachedImage.dataUrl}
              alt="Biriktirilgan rasm"
              className="h-9 w-9 rounded object-cover border border-border shrink-0"
            />
            <div className="min-w-0">
              <div className="font-medium text-foreground truncate flex items-center gap-1">
                <ImageIcon className="h-3 w-3 text-indigo-500 shrink-0" />
                <span className="truncate">{attachedImage.fileName}</span>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">
                {Math.round(attachedImage.compressedBytes / 1024)} KB • {attachedImage.width}×{attachedImage.height}
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
            aria-label="Rasmni olib tashlash"
            onClick={() => onAttachImage(null)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex items-center gap-1.5"
      >
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
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={compact ? "h-9 w-9 shrink-0" : "h-9 w-9 shrink-0"}
          disabled={isSending}
          title="Faqat rasm biriktirish (PNG, JPG, WEBP)"
          aria-label="Rasm biriktirish"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          placeholder={placeholder}
          className="h-9 text-xs"
          disabled={isSending}
        />

        <Button
          type="submit"
          size="sm"
          disabled={isSending || (!value.trim() && !attachedImage)}
          className={compact ? "h-9 px-3 shrink-0" : "h-9 px-4 shrink-0 gap-1.5"}
        >
          {isSending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {!compact && <span>Yuborish</span>}
        </Button>
      </form>
    </div>
  );
}
