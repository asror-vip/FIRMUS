"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Sparkles, Copy, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export function AiEmptyHero({
  greeting,
  compact = false,
}: {
  greeting: string;
  compact?: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="relative mb-4 flex items-center justify-center">
        <div
          className={`absolute rounded-full bg-gradient-to-tr from-indigo-500/30 via-violet-500/25 to-cyan-400/25 blur-xl animate-pulse ${
            compact ? "h-14 w-14" : "h-20 w-20"
          }`}
        />
        <div
          className={`ai-orb-float relative flex items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20 ${
            compact ? "h-10 w-10" : "h-12 w-12"
          }`}
        >
          <Sparkles className={compact ? "h-5 w-5" : "h-6 w-6"} />
        </div>
      </div>

      <h2
        className={`font-semibold tracking-tight text-foreground ${
          compact ? "text-base" : "text-xl sm:text-2xl"
        }`}
      >
        {greeting}
      </h2>
    </div>
  );
}

export function AiThinkingBubble() {
  return (
    <div className="flex items-start gap-2.5 max-w-[85%] animate-in fade-in duration-200">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-sm">
        <Sparkles className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: "2.8s" }} />
      </div>
      <div className="flex-1 space-y-2 py-1.5 min-w-[180px] sm:min-w-[240px]">
        <div className="h-2.5 w-4/5 rounded-full ai-shimmer-bar" />
        <div className="h-2.5 w-3/5 rounded-full ai-shimmer-bar" style={{ animationDelay: "0.18s" }} />
        <div className="h-2.5 w-2/5 rounded-full ai-shimmer-bar" style={{ animationDelay: "0.36s" }} />
      </div>
    </div>
  );
}

function renderInlineFormatting(line: string): React.ReactNode[] {
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)]+\))/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={match.index}
          className="rounded bg-background/80 border border-border/60 px-1 py-0.5 font-mono text-[11px]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("[")) {
      const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
      if (linkMatch) {
        parts.push(
          <a
            key={match.index}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 dark:text-indigo-400 underline underline-offset-2 hover:opacity-80"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        parts.push(token);
      }
    }
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }
  return parts;
}

function FormattedAiText({ text }: { text: string }) {
  const lines = useMemo(() => text.split("\n"), [text]);

  return (
    <div className="space-y-1.5 text-xs leading-relaxed text-foreground">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trimEnd();
        if (!line.trim()) {
          return <div key={idx} className="h-1" />;
        }
        if (/^#{1,3}\s+/.test(line)) {
          return (
            <div key={idx} className="font-semibold text-foreground pt-1">
              {renderInlineFormatting(line.replace(/^#{1,3}\s+/, ""))}
            </div>
          );
        }
        if (/^[-*•]\s+/.test(line.trimStart())) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500/80 shrink-0" />
              <div className="flex-1">{renderInlineFormatting(line.trimStart().replace(/^[-*•]\s+/, ""))}</div>
            </div>
          );
        }
        const numbered = line.trimStart().match(/^(\d+\.)\s+(.*)$/);
        if (numbered) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-0.5">
              <span className="font-semibold text-indigo-500 shrink-0">{numbered[1]}</span>
              <div className="flex-1">{renderInlineFormatting(numbered[2])}</div>
            </div>
          );
        }
        return <div key={idx}>{renderInlineFormatting(line)}</div>;
      })}
    </div>
  );
}

export function AiStreamingMessage({
  text,
  animate = false,
  stopSignal = 0,
  onTickScroll,
  onStreamDone,
  onRegenerate,
}: {
  text: string;
  animate?: boolean;
  stopSignal?: number;
  onTickScroll?: () => void;
  onStreamDone?: () => void;
  onRegenerate?: () => void;
}) {
  const [visibleLen, setVisibleLen] = useState<number>(animate ? 0 : text.length);
  const [isDone, setIsDone] = useState<boolean>(!animate);
  const [copied, setCopied] = useState(false);
  const tickScrollRef = React.useRef(onTickScroll);
  const streamDoneRef = React.useRef(onStreamDone);

  useEffect(() => {
    tickScrollRef.current = onTickScroll;
    streamDoneRef.current = onStreamDone;
  }, [onTickScroll, onStreamDone]);

  useEffect(() => {
    if (stopSignal > 0 && !isDone) {
      setIsDone(true);
      streamDoneRef.current?.();
    }
  }, [stopSignal, isDone]);

  useEffect(() => {
    if (!animate) {
      setVisibleLen(text.length);
      setIsDone(true);
      return;
    }

    setVisibleLen(0);
    setIsDone(false);

    const total = text.length;
    if (total === 0) {
      setIsDone(true);
      streamDoneRef.current?.();
      return;
    }

    // Finish smoothly in ~0.8s–1.8s regardless of length
    const targetTicks = Math.min(85, Math.max(20, Math.ceil(total / 8)));
    const step = Math.max(2, Math.ceil(total / targetTicks));
    let current = 0;

    const timer = window.setInterval(() => {
      current = Math.min(total, current + step);
      setVisibleLen(current);
      tickScrollRef.current?.();
      if (current >= total) {
        window.clearInterval(timer);
        setIsDone(true);
        streamDoneRef.current?.();
      }
    }, 18);

    return () => window.clearInterval(timer);
  }, [text, animate]);

  const shownText = isDone ? text.slice(0, visibleLen || text.length) : text.slice(0, visibleLen);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Nusxalab boʻlmadi");
    }
  };

  return (
    <div className="group space-y-1">
      <div className="relative">
        <FormattedAiText text={shownText} />
        {!isDone && (
          <span className="inline-block ml-0.5 h-3.5 w-1.5 align-middle bg-indigo-500 animate-pulse rounded-sm" />
        )}
      </div>

      {isDone && text.trim().length > 0 && (
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-0.5">
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted/70 transition-colors"
              title="Qayta javob olish"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Qayta</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted/70 transition-colors"
            title="Nusxalash"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? "Nusxalandi" : "Nusxa"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
