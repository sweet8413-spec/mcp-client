"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SendHorizonal } from "lucide-react";
import type { Translations } from "@/lib/i18n";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  t: Translations;
}

export function ChatInput({ onSend, disabled = false, t }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setValue("");

    // 전송 후 입력창에 다시 포커스
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-border shrink-0 border-t p-4">
      <div className="bg-muted/50 flex items-end gap-2 rounded-xl border p-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.inputPlaceholder}
          disabled={disabled}
          className="min-h-10 max-h-40 flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          rows={1}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="shrink-0"
        >
          <SendHorizonal className="size-4" />
          <span className="sr-only">{t.send}</span>
        </Button>
      </div>
      <p className="text-muted-foreground mt-2 text-center text-xs">
        {t.inputHint}
      </p>
    </div>
  );
}
