import type { Conversation, Message } from "@/types/chat";

const CONVERSATIONS_KEY = "chat-conversations";
const ACTIVE_ID_KEY = "chat-active-id";

// --- 대화 목록 관리 ---

/** 모든 대화 목록 불러오기 (최신순) */
export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Conversation[];
    return list.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch {
    console.warn("대화 목록 불러오기 실패");
    return [];
  }
}

/** 대화 저장 (새로 추가하거나 기존 업데이트) */
export function saveConversation(conversation: Conversation): void {
  try {
    const list = loadConversations();
    const idx = list.findIndex((c) => c.id === conversation.id);
    if (idx >= 0) {
      list[idx] = conversation;
    } else {
      list.unshift(conversation);
    }
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(list));
  } catch {
    console.warn("대화 저장 실패");
  }
}

/** 대화 삭제 */
export function deleteConversation(id: string): void {
  try {
    const list = loadConversations().filter((c) => c.id !== id);
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(list));
  } catch {
    console.warn("대화 삭제 실패");
  }
}

// --- 활성 대화 ID ---

/** 현재 활성 대화 ID 불러오기 */
export function loadActiveId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ID_KEY);
  } catch {
    return null;
  }
}

/** 현재 활성 대화 ID 저장 */
export function saveActiveId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_ID_KEY, id);
  } catch {
    console.warn("활성 대화 ID 저장 실패");
  }
}

// --- 헬퍼 ---

/** 새 대화 생성 */
export function createConversation(): Conversation {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "새 대화",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** 첫 번째 유저 메시지로 대화 제목 생성 */
export function generateTitle(messages: Message[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "새 대화";
  const text = first.content.trim();
  return text.length > 30 ? text.slice(0, 30) + "..." : text;
}

// --- 마이그레이션 (기존 단일 대화 → 새 구조) ---

export function migrateOldStorage(): void {
  try {
    const old = localStorage.getItem("chat-messages");
    if (!old) return;

    const messages = JSON.parse(old) as Message[];
    if (messages.length === 0) {
      localStorage.removeItem("chat-messages");
      return;
    }

    const conv = createConversation();
    conv.messages = messages;
    conv.title = generateTitle(messages);
    saveConversation(conv);
    saveActiveId(conv.id);
    localStorage.removeItem("chat-messages");
  } catch {
    console.warn("마이그레이션 실패");
  }
}
