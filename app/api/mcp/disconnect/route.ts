import { mcpClientManager } from "@/lib/mcp-client-manager";

export async function POST(req: Request) {
  try {
    const { serverId } = await req.json();

    if (!serverId) {
      return Response.json(
        { error: "serverId가 필요합니다." },
        { status: 400 }
      );
    }

    await mcpClientManager.disconnect(serverId);
    return Response.json({ serverId, status: "disconnected" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "연결 해제 중 오류가 발생했습니다.";
    return Response.json({ error: message }, { status: 500 });
  }
}
