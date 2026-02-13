"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "@/components/chat/message-bubble";
import { MessageSquare } from "lucide-react";
import type { Message } from "@/types/chat";
import type { Translations } from "@/lib/i18n";

interface ChatMessagesProps {
  messages: Message[];
  isLoading?: boolean;
  t: Translations;
  onApproveToolCall?: (messageId: string, toolCallId: string) => void;
  onDenyToolCall?: (messageId: string, toolCallId: string) => void;
  onApproveAllToolCalls?: (messageId: string) => void;
  onDenyAllToolCalls?: (messageId: string) => void;
}

export function ChatMessages({
  messages,
  isLoading = false,
  t,
  onApproveToolCall,
  onDenyToolCall,
  onApproveAllToolCalls,
  onDenyAllToolCalls,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 새 메시지가 추가되면 자동으로 맨 아래로 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // 메시지가 없을 때 빈 상태
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <div className="bg-muted flex size-12 items-center justify-center rounded-full">
          <MessageSquare className="text-muted-foreground size-6" />
        </div>
        <div className="text-center">
          <p className="text-foreground text-sm font-medium">
            {t.startChat}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t.startChatDesc}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-4 py-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              t={t}
              onApproveToolCall={onApproveToolCall}
              onDenyToolCall={onDenyToolCall}
              onApproveAllToolCalls={onApproveAllToolCalls}
              onDenyAllToolCalls={onDenyAllToolCalls}
            />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}

/** AI가 응답 중일 때 표시되는 타이핑 인디케이터 */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 px-4">
      <div className="bg-muted flex size-8 items-center justify-center rounded-full">
        <span className="text-muted-foreground text-xs">AI</span>
      </div>
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="bg-muted-foreground/60 size-1.5 animate-bounce rounded-full [animation-delay:0ms]" />
          <span className="bg-muted-foreground/60 size-1.5 animate-bounce rounded-full [animation-delay:150ms]" />
          <span className="bg-muted-foreground/60 size-1.5 animate-bounce rounded-full [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
