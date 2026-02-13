import { supabase } from "@/lib/supabase";
import type { McpServerConfig, McpTransportType } from "@/types/mcp";

/** 모든 MCP 서버 목록 불러오기 (최신순) */
export async function loadMcpServers(): Promise<McpServerConfig[]> {
  try {
    const { data, error } = await supabase
      .from("mcp_servers")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map((s) => ({
      id: s.id as string,
      name: s.name as string,
      enabled: (s.enabled as boolean) ?? true,
      transportType: s.transport_type as McpTransportType,
      ...(s.url != null ? { url: s.url as string } : {}),
      ...(s.headers != null
        ? { headers: s.headers as Record<string, string> }
        : {}),
      ...(s.command != null ? { command: s.command as string } : {}),
      ...(s.args != null ? { args: s.args as string[] } : {}),
      ...(s.env != null ? { env: s.env as Record<string, string> } : {}),
      createdAt: s.created_at as string,
      updatedAt: s.updated_at as string,
    }));
  } catch (err) {
    console.warn("MCP 서버 목록 불러오기 실패:", err);
    return [];
  }
}

/** MCP 서버 저장 (새로 추가하거나 기존 업데이트) */
export async function saveMcpServer(server: McpServerConfig): Promise<void> {
  try {
    const { error } = await supabase.from("mcp_servers").upsert({
      id: server.id,
      name: server.name,
      enabled: server.enabled,
      transport_type: server.transportType,
      url: server.url ?? null,
      headers: server.headers ?? null,
      command: server.command ?? null,
      args: server.args ?? null,
      env: server.env ?? null,
      created_at: server.createdAt,
      updated_at: server.updatedAt,
    });
    if (error) throw error;
  } catch (err) {
    console.warn("MCP 서버 저장 실패:", err);
  }
}

/** MCP 서버 삭제 */
export async function deleteMcpServer(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("mcp_servers")
      .delete()
      .eq("id", id);
    if (error) throw error;
  } catch (err) {
    console.warn("MCP 서버 삭제 실패:", err);
  }
}

/** 새 MCP 서버 객체 생성 */
export function createMcpServer(partial: {
  name: string;
  transportType: McpTransportType;
  url?: string;
  headers?: Record<string, string>;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}): McpServerConfig {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    enabled: true,
    ...partial,
    createdAt: now,
    updatedAt: now,
  };
}
