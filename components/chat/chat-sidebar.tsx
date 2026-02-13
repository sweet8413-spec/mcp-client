"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MessageSquarePlus, Pencil, Trash2, X, Check } from "lucide-react";
import type { Conversation } from "@/types/chat";
import type { Translations } from "@/lib/i18n";

interface ChatSidebarProps {
  open: boolean;
  conversations: Conversation[];
  activeId: string | null;
  onClose: () => void;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  t: Translations;
}

export function ChatSidebar({
  open,
  conversations,
  activeId,
  onClose,
  onNewChat,
  onSelect,
  onDelete,
  onRename,
  t,
}: ChatSidebarProps) {
  return (
    <>
      {/* 배경 오버레이 (모바일) */}
      {open && (
        <div
          className="bg-black/40 fixed inset-0 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={cn(
          "bg-background border-border flex shrink-0 flex-col border-r overflow-hidden transition-all duration-200",
          "fixed inset-y-0 left-0 z-50 w-72 md:relative md:z-auto",
          open
            ? "translate-x-0 md:w-72"
            : "-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 md:overflow-hidden"
        )}
      >
        {/* 상단: 타이틀 + 닫기 */}
        <div className="border-border flex h-14 shrink-0 items-center justify-between border-b px-3">
          <h2 className="text-sm font-semibold">{t.sidebarTitle}</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-muted-foreground"
          >
            <X className="size-4" />
            <span className="sr-only">{t.closeSidebar}</span>
          </Button>
        </div>

        {/* 새 대화 버튼 */}
        <div className="p-3">
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 w-full gap-2 font-semibold shadow-sm"
            onClick={onNewChat}
          >
            <MessageSquarePlus className="size-4" />
            {t.newChat}
          </Button>
        </div>

        {/* 대화 목록 */}
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-1 px-3 pb-3">
            {conversations.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-xs">
                {t.noHistory}
              </p>
            ) : (
              conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === activeId}
                  onSelect={() => onSelect(conv.id)}
                  onDelete={() => onDelete(conv.id)}
                  onRename={(title) => onRename(conv.id, title)}
                  t={t}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </aside>
    </>
  );
}

/** 대화 항목 (이름 변경 지원) */
function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onRename,
  t,
}: {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
  t: Translations;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const handleConfirm = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== conversation.title) {
      onRename(trimmed);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setEditValue(conversation.title);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="bg-accent flex items-center gap-1 rounded-lg px-2 py-1.5">
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConfirm();
            if (e.key === "Escape") handleCancel();
          }}
          onBlur={handleConfirm}
          className="bg-background min-w-0 flex-1 rounded px-2 py-1 text-sm outline-none"
        />
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleConfirm}
          className="text-green-500 shrink-0"
        >
          <Check className="size-3" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer",
        isActive
          ? "bg-accent text-accent-foreground"
          : "hover:bg-muted text-foreground"
      )}
      onClick={onSelect}
    >
      <div className="min-w-0 flex-1">
        <span className="block truncate">{conversation.title}</span>
        <span className="text-muted-foreground block text-xs">
          {formatDate(conversation.createdAt)}
        </span>
      </div>

      {/* 편집 + 삭제 버튼 */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            setEditValue(conversation.title);
            setEditing(true);
          }}
        >
          <Pencil className="size-3" />
          <span className="sr-only">{t.rename}</span>
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="size-3" />
          <span className="sr-only">{t.deleteChat}</span>
        </Button>
      </div>
    </div>
  );
}

/** 날짜 포맷: 오늘이면 시간, 올해면 월/일, 그 외 연/월/일 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const isThisYear = date.getFullYear() === now.getFullYear();

  if (isThisYear) {
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    });
  }

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
