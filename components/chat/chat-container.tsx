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
} from "@/lib/chat-storage";
import { loadMcpServers } from "@/lib/mcp-storage";
import {
  getTranslations,
  loadLanguage,
  saveLanguage,
  type Language,
} from "@/lib/i18n";
import type { Message, Conversation, ToolCallInfo, InlineImage } from "@/types/chat";

const MAX_TOOL_TURNS = 5;

/* ------------------------------------------------------------------ */
/*  유틸 헬퍼                                                          */
/* ------------------------------------------------------------------ */

function updateMessageInConv(
  conv: Conversation,
  messageId: string,
  updater: (m: Message) => Message
): Conversation {
  return {
    ...conv,
    messages: conv.messages.map((m) => (m.id === messageId ? updater(m) : m)),
    updatedAt: new Date().toISOString(),
  };
}

/** 메시지 배열을 API 전송 형식으로 변환 */
function toApiMessages(messages: Message[]) {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
    ...(m.toolCalls && m.toolCalls.length > 0
      ? {
          toolCalls: m.toolCalls.map((tc) => ({
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            serverId: tc.serverId,
            args: tc.args,
          })),
        }
      : {}),
  }));
}

/* ------------------------------------------------------------------ */
/*  컴포넌트                                                           */
/* ------------------------------------------------------------------ */

export function ChatContainer() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(288);
  const [lang, setLang] = useState<Language>("ko");
  const [pendingToolMsgId, setPendingToolMsgId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const toolTurnRef = useRef(0);

  const t = getTranslations(lang);
  const activeConv = conversations.find((c) => c.id === activeId) ?? null;
  const messages = activeConv?.messages ?? [];

  /* ---- 초기화 (Supabase에서 비동기 로드) ---- */
  useEffect(() => {
    async function init() {
      const list = await loadConversations();
      setConversations(list);
      const savedId = loadActiveId();
      if (savedId && list.some((c) => c.id === savedId)) {
        setActiveId(savedId);
      } else if (list.length > 0) {
        setActiveId(list[0].id);
        saveActiveId(list[0].id);
      }
      setLang(loadLanguage());
    }
    init();
  }, []);

  const handleChangeLanguage = useCallback((l: Language) => {
    setLang(l);
    saveLanguage(l);
  }, []);

  const syncConversation = useCallback((conv: Conversation) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? conv : c))
    );
    void saveConversation(conv);
  }, []);

  /* ---- 대화 관리 ---- */
  const handleNewChat = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    setPendingToolMsgId(null);

    // 현재 대화가 비어있으면 새로 만들지 않음
    if (activeConv && activeConv.messages.length === 0) {
      return;
    }

    const conv = createConversation();
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    void saveConversation(conv);
    saveActiveId(conv.id);
  }, [activeConv]);

  const handleSelectChat = useCallback((id: string) => {
    abortRef.current?.abort();
    setIsLoading(false);
    setPendingToolMsgId(null);
    setActiveId(id);
    saveActiveId(id);
  }, []);

  const handleDeleteChat = useCallback(
    (id: string) => {
      void deleteConversation(id);
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);
      if (activeId === id) {
        if (remaining.length > 0) {
          setActiveId(remaining[0].id);
          saveActiveId(remaining[0].id);
        } else {
          const conv = createConversation();
          setConversations([conv]);
          setActiveId(conv.id);
          void saveConversation(conv);
          saveActiveId(conv.id);
        }
      }
    },
    [conversations, activeId]
  );

  const handleRenameChat = useCallback(
    (id: string, newTitle: string) => {
      const conv = conversations.find((c) => c.id === id);
      if (!conv) return;
      syncConversation({ ...conv, title: newTitle });
    },
    [conversations, syncConversation]
  );

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    setPendingToolMsgId(null);
    if (!activeConv) return;
    syncConversation({
      ...activeConv,
      messages: [],
      title: t.newChatTitle,
      updatedAt: new Date().toISOString(),
    });
  }, [activeConv, syncConversation, t]);

  /* ---- SSE 스트리밍 공통 로직 ---- */
  const streamToAssistant = useCallback(
    async (
      initialConv: Conversation,
      assistantId: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      body: Record<string, any>,
      controller: AbortController
    ): Promise<{ conv: Conversation; toolCalls: ToolCallInfo[] }> => {
      let conv = initialConv;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawToolCalls: any[] = [];

      while (true) {
        if (controller.signal.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);

            if (parsed.text) {
              accumulated += parsed.text;
              const text = accumulated;
              conv = updateMessageInConv(conv, assistantId, (m) => ({
                ...m,
                content: text,
              }));
              syncConversation(conv);
            }

            if (parsed.toolCalls) {
              rawToolCalls.push(...parsed.toolCalls);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      // 도구 호출이 감지되면 MCP 서버 이름 조회 후 메시지에 추가
      if (rawToolCalls.length > 0) {
        const allServers = await loadMcpServers();
        const toolCalls: ToolCallInfo[] = rawToolCalls.map((tc) => ({
          toolCallId: tc.id,
          toolName: tc.name,
          serverId: tc.serverId,
          serverName:
            allServers.find((s) => s.id === tc.serverId)?.name ??
            tc.serverId.slice(0, 8),
          args: tc.args,
          status: "pending" as const,
        }));

        conv = updateMessageInConv(conv, assistantId, (m) => ({
          ...m,
          toolCalls: toolCalls,
        }));
        syncConversation(conv);

        return { conv, toolCalls };
      }

      return { conv, toolCalls: [] };
    },
    [syncConversation]
  );

  /* ---- 메시지 전송 ---- */
  const handleSend = useCallback(
    async (content: string) => {
      let conv = activeConv;
      if (!conv) {
        conv = createConversation();
        setConversations((prev) => [conv!, ...prev]);
        setActiveId(conv.id);
        void saveConversation(conv);
        saveActiveId(conv.id);
      }

      toolTurnRef.current = 0;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };
      const assistantId = crypto.randomUUID();
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      };

      const withUser = [...conv.messages, userMsg];
      const withBoth = [...withUser, assistantMsg];

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
        const apiMessages = toApiMessages(withUser);
        const result = await streamToAssistant(
          updated,
          assistantId,
          { messages: apiMessages },
          controller
        );
        updated = result.conv;

        if (result.toolCalls.length > 0) {
          toolTurnRef.current++;
          setPendingToolMsgId(assistantId);
          setIsLoading(false);
          return; // 사용자 승인 대기
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const errorText =
          err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
        updated = updateMessageInConv(updated, assistantId, (m) => ({
          ...m,
          content: `⚠ ${errorText}`,
        }));
        syncConversation(updated);
      } finally {
        if (!pendingToolMsgId) setIsLoading(false);
        abortRef.current = null;
      }
    },
    [activeConv, syncConversation, streamToAssistant, t, pendingToolMsgId]
  );

  /* ---- 도구 실행 후 대화 계속 ---- */
  const continueAfterToolCalls = useCallback(
    async (conv: Conversation, toolMessageId: string) => {
      const toolMsg = conv.messages.find((m) => m.id === toolMessageId);
      if (!toolMsg?.toolCalls) return;

      setIsLoading(true);

      // 1. 승인된 도구 실행 (병렬)
      let updatedConv = conv;
      const collectedImages: InlineImage[] = [];
      const toolResults = await Promise.all(
        toolMsg.toolCalls.map(async (tc) => {
          if (tc.status === "denied") {
            return {
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              serverId: tc.serverId,
              result: "사용자가 이 도구 호출을 거부했습니다.",
            };
          }
          // status === "approved"
          try {
            const res = await fetch("/api/mcp/call-tool", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                serverId: tc.serverId,
                toolName: tc.toolName,
                args: tc.args,
              }),
            });
            const data = await res.json();
            const newStatus = data.isError ? "error" : "completed";
            const resultText = data.content ?? data.error ?? "";

            // 이미지 데이터 수집
            if (data.images && Array.isArray(data.images)) {
              collectedImages.push(...data.images);
            }

            updatedConv = updateMessageInConv(
              updatedConv,
              toolMessageId,
              (m) => ({
                ...m,
                toolCalls: m.toolCalls?.map((t) =>
                  t.toolCallId === tc.toolCallId
                    ? { ...t, status: newStatus as ToolCallInfo["status"], result: resultText }
                    : t
                ),
              })
            );
            syncConversation(updatedConv);

            return {
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              serverId: tc.serverId,
              result: resultText,
              isError: data.isError,
            };
          } catch (err) {
            const errMsg =
              err instanceof Error ? err.message : "도구 실행 오류";
            updatedConv = updateMessageInConv(
              updatedConv,
              toolMessageId,
              (m) => ({
                ...m,
                toolCalls: m.toolCalls?.map((t) =>
                  t.toolCallId === tc.toolCallId
                    ? { ...t, status: "error" as const, result: errMsg }
                    : t
                ),
              })
            );
            syncConversation(updatedConv);
            return {
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              serverId: tc.serverId,
              result: errMsg,
              isError: true,
            };
          }
        })
      );

      // 이미지가 있으면 현재 메시지에 추가
      if (collectedImages.length > 0) {
        updatedConv = updateMessageInConv(
          updatedConv,
          toolMessageId,
          (m) => ({
            ...m,
            images: [...(m.images ?? []), ...collectedImages],
          })
        );
        syncConversation(updatedConv);
      }

      // 2. 새 AI 메시지 생성 (응답 받을 자리)
      const newAssistantId = crypto.randomUUID();
      updatedConv = {
        ...updatedConv,
        messages: [
          ...updatedConv.messages,
          {
            id: newAssistantId,
            role: "assistant" as const,
            content: "",
            createdAt: new Date().toISOString(),
          },
        ],
      };
      syncConversation(updatedConv);

      // 3. 도구 결과와 함께 API 호출
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const apiMessages = toApiMessages(
          updatedConv.messages.filter((m) => m.id !== newAssistantId)
        );

        const result = await streamToAssistant(
          updatedConv,
          newAssistantId,
          { messages: apiMessages, toolResults },
          controller
        );
        updatedConv = result.conv;

        // 또 도구 호출이 오면 → 루프 제한 확인 후 대기
        if (
          result.toolCalls.length > 0 &&
          toolTurnRef.current < MAX_TOOL_TURNS
        ) {
          toolTurnRef.current++;
          setPendingToolMsgId(newAssistantId);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const errorText =
          err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
        updatedConv = updateMessageInConv(updatedConv, newAssistantId, (m) => ({
          ...m,
          content: `⚠ ${errorText}`,
        }));
        syncConversation(updatedConv);
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [syncConversation, streamToAssistant]
  );

  /* ---- 도구 호출 승인/거부 ---- */
  const handleApproveToolCall = useCallback(
    (messageId: string, toolCallId: string) => {
      const conv = conversations.find((c) => c.id === activeId);
      if (!conv) return;
      const updated = updateMessageInConv(conv, messageId, (m) => ({
        ...m,
        toolCalls: m.toolCalls?.map((tc) =>
          tc.toolCallId === toolCallId
            ? { ...tc, status: "approved" as const }
            : tc
        ),
      }));
      syncConversation(updated);
    },
    [conversations, activeId, syncConversation]
  );

  const handleDenyToolCall = useCallback(
    (messageId: string, toolCallId: string) => {
      const conv = conversations.find((c) => c.id === activeId);
      if (!conv) return;
      const updated = updateMessageInConv(conv, messageId, (m) => ({
        ...m,
        toolCalls: m.toolCalls?.map((tc) =>
          tc.toolCallId === toolCallId
            ? { ...tc, status: "denied" as const }
            : tc
        ),
      }));
      syncConversation(updated);
    },
    [conversations, activeId, syncConversation]
  );

  const handleApproveAllToolCalls = useCallback(
    (messageId: string) => {
      const conv = conversations.find((c) => c.id === activeId);
      if (!conv) return;
      const updated = updateMessageInConv(conv, messageId, (m) => ({
        ...m,
        toolCalls: m.toolCalls?.map((tc) =>
          tc.status === "pending" ? { ...tc, status: "approved" as const } : tc
        ),
      }));
      syncConversation(updated);
    },
    [conversations, activeId, syncConversation]
  );

  const handleDenyAllToolCalls = useCallback(
    (messageId: string) => {
      const conv = conversations.find((c) => c.id === activeId);
      if (!conv) return;
      const updated = updateMessageInConv(conv, messageId, (m) => ({
        ...m,
        toolCalls: m.toolCalls?.map((tc) =>
          tc.status === "pending" ? { ...tc, status: "denied" as const } : tc
        ),
      }));
      syncConversation(updated);
    },
    [conversations, activeId, syncConversation]
  );

  /* ---- 모든 도구 호출이 결정되면 자동 계속 ---- */
  useEffect(() => {
    if (!pendingToolMsgId || isLoading) return;

    const conv = conversations.find((c) => c.id === activeId);
    if (!conv) return;

    const msg = conv.messages.find((m) => m.id === pendingToolMsgId);
    if (!msg?.toolCalls || msg.toolCalls.length === 0) return;

    const allResolved = msg.toolCalls.every((tc) => tc.status !== "pending");
    if (!allResolved) return;

    // 모든 도구가 결정됨 → 계속 진행
    setPendingToolMsgId(null);
    void continueAfterToolCalls(conv, msg.id);
  }, [
    conversations,
    activeId,
    pendingToolMsgId,
    isLoading,
    continueAfterToolCalls,
  ]);

  /* ---- 렌더링 ---- */
  const inputDisabled = isLoading || pendingToolMsgId !== null;

  return (
    <div className="flex h-screen">
      <ChatSidebar
        open={sidebarOpen}
        conversations={conversations}
        activeId={activeId}
        width={sidebarWidth}
        onWidthChange={setSidebarWidth}
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
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          t={t}
          onApproveToolCall={handleApproveToolCall}
          onDenyToolCall={handleDenyToolCall}
          onApproveAllToolCalls={handleApproveAllToolCalls}
          onDenyAllToolCalls={handleDenyAllToolCalls}
        />
        <ChatInput onSend={handleSend} disabled={inputDisabled} t={t} />
      </div>
    </div>
  );
}
