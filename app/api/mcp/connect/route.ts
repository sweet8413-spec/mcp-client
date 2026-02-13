import { mcpClientManager } from "@/lib/mcp-client-manager";
import type { McpServerConfig } from "@/types/mcp";

export async function POST(req: Request) {
  try {
    const config: McpServerConfig = await req.json();

    if (!config.id || !config.transportType) {
      return Response.json(
        { error: "잘못된 서버 설정입니다." },
        { status: 400 }
      );
    }

    const result = await mcpClientManager.connect(config);
    return Response.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "연결 중 오류가 발생했습니다.";
    return Response.json({ error: message }, { status: 500 });
  }
}
