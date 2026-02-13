import { mcpClientManager } from "@/lib/mcp-client-manager";

export const dynamic = "force-dynamic";

/**
 * GET /api/mcp/tools/all
 * 연결된 모든 MCP 서버의 도구를 한번에 조회합니다.
 * 각 도구에 serverId가 포함되어 어떤 서버의 도구인지 구분할 수 있습니다.
 */
export async function GET() {
  try {
    const allTools = await mcpClientManager.listAllTools();
    return Response.json({ servers: allTools });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "도구 목록 조회 중 오류가 발생했습니다.";
    return Response.json({ error: message }, { status: 500 });
  }
}
