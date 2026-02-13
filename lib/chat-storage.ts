import { supabase } from "@/lib/supabase";
import type { Conversation, Message, ToolCallInfo, InlineImage } from "@/types/chat";

const ACTIVE_ID_KEY = "chat-active-id";

// --- 대화 목록 관리 (Supabase) ---

/** 모든 대화 목록 불러오기 (최신순) */
export async function loadConversations(): Promise<Conversation[]> {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("*, messages(*)")
      .order("updated_at", { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map((conv) => ({
      id: conv.id as string,
      title: conv.title as string,
      messages: ((conv.messages as Record<string, unknown>[]) || [])
        .sort(
          (a, b) =>
            new Date(a.created_at as string).getTime() -
            new Date(b.created_at as string).getTime()
        )
        .map(
          (m): Message => ({
            id: m.id as string,
            role: m.role as "user" | "assistant",
            content: m.content as string,
            createdAt: m.created_at as string,
            ...(m.tool_calls
              ? { toolCalls: m.tool_calls as ToolCallInfo[] }
              : {}),
            ...(m.images ? { images: m.images as InlineImage[] } : {}),
          })
        ),
      createdAt: conv.created_at as string,
      updatedAt: conv.updated_at as string,
    }));
  } catch (err) {
    console.warn("대화 목록 불러오기 실패:", err);
    return [];
  }
}

/** 대화 저장 (새로 추가하거나 기존 업데이트) */
export async function saveConversation(
  conversation: Conversation
): Promise<void> {
  try {
    const { error: convError } = await supabase.from("conversations").upsert({
      id: conversation.id,
      title: conversation.title,
      created_at: conversation.createdAt,
      updated_at: conversation.updatedAt,
    });
    if (convError) throw convError;

    if (conversation.messages.length > 0) {
      const { error: msgError } = await supabase.from("messages").upsert(
        conversation.messages.map((m) => ({
          id: m.id,
          conversation_id: conversation.id,
          role: m.role,
          content: m.content,
          created_at:
            typeof m.createdAt === "string"
              ? m.createdAt
              : m.createdAt.toISOString(),
          tool_calls: m.toolCalls ?? null,
          images: m.images ?? null,
        }))
      );
      if (msgError) throw msgError;
    } else {
      // 메시지 배열이 비어있으면 해당 대화의 메시지 전체 삭제
      await supabase
        .from("messages")
        .delete()
        .eq("conversation_id", conversation.id);
    }
  } catch (err) {
    console.warn("대화 저장 실패:", err);
  }
}

/** 대화 삭제 (CASCADE로 메시지도 자동 삭제) */
export async function deleteConversation(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", id);
    if (error) throw error;
  } catch (err) {
    console.warn("대화 삭제 실패:", err);
  }
}

// --- 활성 대화 ID (브라우저 localStorage 유지) ---

export function loadActiveId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ID_KEY);
  } catch {
    return null;
  }
}

export function saveActiveId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_ID_KEY, id);
  } catch {
    console.warn("활성 대화 ID 저장 실패");
  }
}

// --- 헬퍼 ---

/** 새 대화 객체 생성 */
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
