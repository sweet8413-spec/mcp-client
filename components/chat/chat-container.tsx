"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import {
  loadConversations,
  saveConversation,
  deleteConversation,
  loadActiveId,
  saveActiveId,
  createConversation,
  generateTitle,
  migrateOldStorage,
} from "@/lib/chat-storage";
import {
  getTranslations,
  loadLanguage,
  saveLanguage,
  type Language,
} from "@/lib/i18n";
import type { Message, Conversation } from "@/types/chat";

export function ChatContainer() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lang, setLang] = useState<Language>("ko");
  const abortRef = useRef<AbortController | null>(null);

  // 번역 데이터
  const t = getTranslations(lang);

  // 현재 활성 대화
  const activeConv = conversations.find((c) => c.id === activeId) ?? null;
  const messages = activeConv?.messages ?? [];

  // 초기화: 마이그레이션 + 대화 목록 로드 + 언어 로드
  useEffect(() => {
    migrateOldStorage();
    const list = loadConversations();
    setConversations(list);

    const savedId = loadActiveId();
    if (savedId && list.some((c) => c.id === savedId)) {
      setActiveId(savedId);
    } else if (list.length > 0) {
      setActiveId(list[0].id);
      saveActiveId(list[0].id);
    }

    setLang(loadLanguage());
  }, []);

  // 언어 변경
  const handleChangeLanguage = useCallback((newLang: Language) => {
    setLang(newLang);
    saveLanguage(newLang);
  }, []);

  // 대화 내용이 바뀔 때 localStorage 동기화
  const syncConversation = useCallback((conv: Conversation) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? conv : c))
    );
    saveConversation(conv);
  }, []);

  // 새 대화 시작
  const handleNewChat = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);

    const conv = createConversation();
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    saveConversation(conv);
    saveActiveId(conv.id);
  }, []);

  // 대화 선택
  const handleSelectChat = useCallback((id: string) => {
    abortRef.current?.abort();
    setIsLoading(false);
    setActiveId(id);
    saveActiveId(id);
  }, []);

  // 대화 삭제
  const handleDeleteChat = useCallback(
    (id: string) => {
      deleteConversation(id);
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);

      if (activeId === id) {
        if (remaining.length > 0) {
          setActiveId(remaining[0].id);
          saveActiveId(remaining[0].id);
        } else {
          // 남은 대화가 없으면 새 대화 생성
          const conv = createConversation();
          setConversations([conv]);
          setActiveId(conv.id);
          saveConversation(conv);
          saveActiveId(conv.id);
        }
      }
    },
    [conversations, activeId]
  );

  // 대화 이름 변경
  const handleRenameChat = useCallback(
    (id: string, newTitle: string) => {
      const conv = conversations.find((c) => c.id === id);
      if (!conv) return;
      const updated = { ...conv, title: newTitle };
      syncConversation(updated);
    },
    [conversations, syncConversation]
  );

  // 초기화 (현재 대화 메시지만 삭제)
  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);

    if (!activeConv) return;
    const updated: Conversation = {
      ...activeConv,
      messages: [],
      title: t.newChatTitle,
      updatedAt: new Date().toISOString(),
    };
    syncConversation(updated);
  }, [activeConv, syncConversation, t]);

  // 메시지 전송
  const handleSend = useCallback(
    async (content: string) => {
      // 활성 대화가 없으면 새로 생성
      let conv = activeConv;
      if (!conv) {
        conv = createConversation();
        setConversations((prev) => [conv!, ...prev]);
        setActiveId(conv.id);
        saveConversation(conv);
        saveActiveId(conv.id);
      }

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };

      const assistantId = crypto.randomUUID();
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      };

      // 유저 메시지 + 빈 AI 메시지 추가
      const withUser = [...conv.messages, userMessage];
      const withBoth = [...withUser, assistantMessage];

      const title =
        conv.title === "새 대화" || conv.title === t.newChatTitle
          ? generateTitle(withUser)
          : conv.title;

      let updated: Conversation = {
        ...conv,
        messages: withBoth,
        title,
        updatedAt: new Date().toISOString(),
      };
      syncConversation(updated);
      setIsLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const allMessages = withUser.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: allMessages }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "요청에 실패했습니다.");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("스트리밍을 시작할 수 없습니다.");

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.text) {
                accumulated += parsed.text;
                const currentText = accumulated;
                updated = {
                  ...updated,
                  messages: updated.messages.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: currentText }
                      : m
                  ),
                };
                syncConversation(updated);
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;

        const errorText =
          err instanceof Error
            ? err.message
            : "알 수 없는 오류가 발생했습니다.";

        updated = {
          ...updated,
          messages: updated.messages.map((m) =>
            m.id === assistantId ? { ...m, content: `⚠ ${errorText}` } : m
          ),
        };
        syncConversation(updated);
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [activeConv, syncConversation, t]
  );

  return (
    <div className="flex h-screen">
      <ChatSidebar
        open={sidebarOpen}
        conversations={conversations}
        activeId={activeId}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        onSelect={handleSelectChat}
        onDelete={handleDeleteChat}
        onRename={handleRenameChat}
        t={t}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ChatHeader
          onReset={handleReset}
          hasMessages={messages.length > 0}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          t={t}
          lang={lang}
          onChangeLanguage={handleChangeLanguage}
        />
        <ChatMessages messages={messages} isLoading={isLoading} t={t} />
        <ChatInput onSend={handleSend} disabled={isLoading} t={t} />
      </div>
    </div>
  );
}
