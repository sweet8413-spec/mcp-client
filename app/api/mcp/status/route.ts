import { mcpClientManager } from "@/lib/mcp-client-manager";

export const dynamic = "force-dynamic";

export async function GET() {
  const statuses = mcpClientManager.getAllStatuses();
  return Response.json({ statuses });
}
