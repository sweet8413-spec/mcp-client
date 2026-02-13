// MCP 서버 전송 방식: Streamable HTTP 또는 stdio
export type McpTransportType = "streamable-http" | "stdio";

export interface McpServerConfig {
  id: string;
  name: string; // 서버 이름 (사용자 지정)
  enabled: boolean; // 활성화 여부
  transportType: McpTransportType;
  // Streamable HTTP 전용
  url?: string;
  headers?: Record<string, string>;
  // stdio 전용
  command?: string; // 실행 명령어 (예: npx, node)
  args?: string[]; // 명령어 인자
  env?: Record<string, string>; // 환경변수
  createdAt: string;
  updatedAt: string;
}

// 연결 상태
export type McpConnectionStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "error";

export interface McpServerStatus {
  serverId: string;
  status: McpConnectionStatus;
  error?: string;
}

// 도구(tool) 정보
export interface McpToolInfo {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}
