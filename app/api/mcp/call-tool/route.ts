import { mcpClientManager } from "@/lib/mcp-client-manager";

export async function POST(req: Request) {
  try {
    const { serverId, toolName, args } = await req.json();

    if (!serverId || !toolName) {
      return Response.json(
        { error: "serverId와 toolName이 필요합니다." },
        { status: 400 }
      );
    }

    const result = await mcpClientManager.callTool(
      serverId,
      toolName,
      args ?? {}
    );

    console.log("[call-tool] result keys:", Object.keys(result), "images count:", result.images?.length ?? 0);

    return Response.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "도구 실행 중 오류가 발생했습니다.";
    return Response.json({ error: message }, { status: 500 });
  }
}
