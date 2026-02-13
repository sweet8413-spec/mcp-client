"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MarkdownContent } from "@/components/chat/markdown-content";
import { ToolCallCard } from "@/components/chat/tool-call-card";
import { cn } from "@/lib/utils";
import { Bot, Check, Copy, User } from "lucide-react";
import type { Message } from "@/types/chat";
import type { Translations } from "@/lib/i18n";

interface MessageBubbleProps {
  message: Message;
  t: Translations;
  onApproveToolCall?: (messageId: string, toolCallId: string) => void;
  onDenyToolCall?: (messageId: string, toolCallId: string) => void;
  onApproveAllToolCalls?: (messageId: string) => void;
  onDenyAllToolCalls?: (messageId: string) => void;
}

export function MessageBubble({
  message,
  t,
  onApproveToolCall,
  onDenyToolCall,
  onApproveAllToolCalls,
  onDenyAllToolCalls,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const hasToolCalls =
    !isUser && message.toolCalls && message.toolCalls.length > 0;
  const hasContent = !!message.content;

  return (
    <div
      className={cn(
        "group flex items-start gap-3 px-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* 아바타 */}
      <Avatar className="mt-0.5 shrink-0">
        <AvatarFallback
          className={cn(
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
        </AvatarFallback>
      </Avatar>

      {/* 메시지 내용 */}
      <div
        className={cn(
          "flex max-w-[75%] flex-col gap-1",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* 텍스트 버블 (내용이 있을 때만) */}
        {hasContent && (
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
              isUser
                ? "bg-primary text-primary-foreground rounded-tr-sm"
                : "bg-muted text-foreground rounded-tl-sm"
            )}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap break-words">
                {message.content}
              </p>
            ) : (
              <MarkdownContent content={message.content} />
            )}
          </div>
        )}

        {/* 이미지 표시 (MCP 도구에서 반환된 이미지) */}
        {message.images && message.images.length > 0 && (
          <div className="flex flex-col gap-2">
            {message.images.map((img, idx) => (
              <div
                key={idx}
                className="overflow-hidden rounded-xl border"
                style={{ maxWidth: "min(100%, 400px)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:${img.mimeType};base64,${img.data}`}
                  alt={`생성된 이미지 ${idx + 1}`}
                  className="block h-auto w-full object-contain"
                />
              </div>
            ))}
          </div>
        )}

        {/* 도구 호출 카드 (AI 메시지에 toolCalls가 있을 때) */}
        {hasToolCalls && (
          <ToolCallCard
            toolCalls={message.toolCalls!}
            onApprove={(toolCallId) =>
              onApproveToolCall?.(message.id, toolCallId)
            }
            onDeny={(toolCallId) =>
              onDenyToolCall?.(message.id, toolCallId)
            }
            onApproveAll={() => onApproveAllToolCalls?.(message.id)}
            onDenyAll={() => onDenyAllToolCalls?.(message.id)}
            t={t}
          />
        )}

        {/* 시간 + 복사 버튼 */}
        <div className="flex items-center gap-1 px-1">
          <span className="text-muted-foreground text-xs">
            {formatTime(message.createdAt)}
          </span>
          {!isUser && message.content && <CopyButton text={message.content} />}
        </div>
      </div>
    </div>
  );
}

/** AI 메시지 복사 버튼 */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.warn("복사 실패");
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      onClick={handleCopy}
      className="text-muted-foreground hover:text-foreground opacity-0 transition-opacity group-hover:opacity-100"
    >
      {copied ? (
        <Check className="size-3 text-green-500" />
      ) : (
        <Copy className="size-3" />
      )}
      <span className="sr-only">복사</span>
    </Button>
  );
}

function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
