/** MCP 도구 호출 상태 */
export type ToolCallStatus =
  | "pending"    // 사용자 승인 대기
  | "approved"   // 승인됨 (실행 중)
  | "denied"     // 사용자 거부
  | "completed"  // 실행 완료
  | "error";     // 실행 오류

/** 개별 도구 호출 정보 */
export interface ToolCallInfo {
  toolCallId: string;
  toolName: string;
  serverId: string;
  serverName: string;
  args: Record<string, unknown>;
  status: ToolCallStatus;
  result?: string;
}

/** 인라인 이미지 데이터 */
export interface InlineImage {
  mimeType: string;
  data: string; // base64
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date | string;
  /** AI가 요청한 도구 호출 목록 (assistant 메시지에만 존재) */
  toolCalls?: ToolCallInfo[];
  /** AI가 생성한 이미지 목록 (assistant 메시지에만 존재) */
  images?: InlineImage[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}
