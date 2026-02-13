import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type {
  McpServerConfig,
  McpConnectionStatus,
  McpServerStatus,
  McpToolInfo,
} from "@/types/mcp";

interface ManagedClient {
  client: Client;
  transport: StreamableHTTPClientTransport | StdioClientTransport;
  status: McpConnectionStatus;
  error?: string;
  serverId: string;
}

class McpClientManager {
  private clients: Map<string, ManagedClient> = new Map();

  /** 서버에 연결 */
  async connect(config: McpServerConfig): Promise<McpServerStatus> {
    // 이미 연결 중이거나 연결된 경우 먼저 해제
    if (this.clients.has(config.id)) {
      await this.disconnect(config.id);
    }

    // connecting 상태 세팅
    const placeholder: ManagedClient = {
      client: null as unknown as Client,
      transport: null as unknown as StreamableHTTPClientTransport,
      status: "connecting",
      serverId: config.id,
    };
    this.clients.set(config.id, placeholder);

    try {
      const client = new Client(
        { name: "mcp-client-app", version: "1.0.0" },
        { capabilities: {} }
      );

      let transport: StreamableHTTPClientTransport | StdioClientTransport;

      if (config.transportType === "streamable-http") {
        if (!config.url) {
          throw new Error("URL이 설정되지 않았습니다.");
        }
        const url = new URL(config.url);
        transport = new StreamableHTTPClientTransport(url, {
          requestInit: config.headers
            ? { headers: config.headers }
            : undefined,
        });
      } else {
        if (!config.command) {
          throw new Error("명령어(command)가 설정되지 않았습니다.");
        }
        transport = new StdioClientTransport({
          command: config.command,
          args: config.args ?? [],
          env: config.env
            ? { ...process.env, ...config.env } as Record<string, string>
            : undefined,
        });
      }

      await client.connect(transport);

      const managed: ManagedClient = {
        client,
        transport,
        status: "connected",
        serverId: config.id,
      };
      this.clients.set(config.id, managed);

      return { serverId: config.id, status: "connected" };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "알 수 없는 연결 오류";

      const errorManaged: ManagedClient = {
        client: null as unknown as Client,
        transport: null as unknown as StreamableHTTPClientTransport,
        status: "error",
        error: errorMessage,
        serverId: config.id,
      };
      this.clients.set(config.id, errorManaged);

      return {
        serverId: config.id,
        status: "error",
        error: errorMessage,
      };
    }
  }

  /** 서버 연결 해제 */
  async disconnect(serverId: string): Promise<void> {
    const managed = this.clients.get(serverId);
    if (!managed) return;

    try {
      if (managed.client && managed.status === "connected") {
        await managed.client.close();
      }
    } catch {
      // 종료 오류 무시
    }

    this.clients.delete(serverId);
  }

  /** 개별 서버 상태 조회 */
  getStatus(serverId: string): McpServerStatus {
    const managed = this.clients.get(serverId);
    if (!managed) {
      return { serverId, status: "disconnected" };
    }
    return {
      serverId: managed.serverId,
      status: managed.status,
      error: managed.error,
    };
  }

  /** 전체 서버 상태 조회 */
  getAllStatuses(): McpServerStatus[] {
    return Array.from(this.clients.values()).map((m) => ({
      serverId: m.serverId,
      status: m.status,
      error: m.error,
    }));
  }

  /** 연결된 서버의 도구(tools) 목록 조회 */
  async listTools(serverId: string): Promise<McpToolInfo[]> {
    const managed = this.clients.get(serverId);
    if (!managed || managed.status !== "connected" || !managed.client) {
      return [];
    }

    try {
      const result = await managed.client.listTools();
      return result.tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema as Record<string, unknown> | undefined,
      }));
    } catch {
      return [];
    }
  }

  /** 연결된 모든 서버의 도구 목록 조회 (serverId 포함) */
  async listAllTools(): Promise<
    { serverId: string; tools: McpToolInfo[] }[]
  > {
    const results: { serverId: string; tools: McpToolInfo[] }[] = [];

    for (const [serverId, managed] of this.clients.entries()) {
      if (managed.status !== "connected" || !managed.client) continue;
      try {
        const result = await managed.client.listTools();
        results.push({
          serverId,
          tools: result.tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema as Record<string, unknown> | undefined,
          })),
        });
      } catch {
        // 개별 서버 실패 시 무시하고 계속
      }
    }

    return results;
  }

  /** 도구 실행 */
  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<{
    content: string;
    isError?: boolean;
    images?: { mimeType: string; data: string }[];
  }> {
    const managed = this.clients.get(serverId);
    if (!managed || managed.status !== "connected" || !managed.client) {
      return { content: "서버가 연결되어 있지 않습니다.", isError: true };
    }

    try {
      const result = await managed.client.callTool({
        name: toolName,
        arguments: args,
      });

      // MCP 도구 결과의 content 배열에서 텍스트와 이미지를 분리
      const contentArr = result.content as {
        type: string;
        text?: string;
        data?: string;
        mimeType?: string;
      }[];

      const textParts = contentArr
        .filter((c) => c.type === "text" && c.text)
        .map((c) => c.text!);

      const images = contentArr
        .filter((c) => c.type === "image" && c.data)
        .map((c) => ({
          mimeType: c.mimeType || (c.data!.startsWith("/9j/") ? "image/jpeg" : "image/png"),
          data: c.data!,
        }));

      return {
        content: textParts.join("\n") || (images.length > 0 ? "이미지가 생성되었습니다." : JSON.stringify(result.content)),
        isError: result.isError === true,
        ...(images.length > 0 ? { images } : {}),
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "도구 실행 중 알 수 없는 오류";
      return { content: message, isError: true };
    }
  }
}

// globalThis에 저장해서 Next.js 핫 리로드 시에도 유지
const globalForMcp = globalThis as unknown as {
  mcpClientManager?: McpClientManager;
};

export const mcpClientManager =
  globalForMcp.mcpClientManager ?? new McpClientManager();

if (process.env.NODE_ENV !== "production") {
  globalForMcp.mcpClientManager = mcpClientManager;
}
