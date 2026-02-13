import { mcpClientManager } from "@/lib/mcp-client-manager";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const serverId = searchParams.get("serverId");

  if (!serverId) {
    return Response.json(
      { error: "serverId 쿼리 파라미터가 필요합니다." },
      { status: 400 }
    );
  }

  try {
    const tools = await mcpClientManager.listTools(serverId);
    return Response.json({ tools });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "도구 목록 조회 중 오류가 발생했습니다.";
    return Response.json({ error: message }, { status: 500 });
  }
}
