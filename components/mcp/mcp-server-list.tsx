"use client";

import { Server } from "lucide-react";
import { McpServerCard } from "./mcp-server-card";
import type {
  McpServerConfig,
  McpServerStatus,
  McpToolInfo,
} from "@/types/mcp";

interface McpServerListProps {
  servers: McpServerConfig[];
  getStatus: (serverId: string) => McpServerStatus;
  onEdit: (server: McpServerConfig) => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onConnect: (server: McpServerConfig) => void;
  onDisconnect: (serverId: string) => void;
  listTools: (serverId: string) => Promise<McpToolInfo[]>;
}

export function McpServerList({
  servers,
  getStatus,
  onEdit,
  onDelete,
  onToggleEnabled,
  onConnect,
  onDisconnect,
  listTools,
}: McpServerListProps) {
  if (servers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <div className="bg-muted flex size-12 items-center justify-center rounded-full">
          <Server className="text-muted-foreground size-6" />
        </div>
        <h3 className="mt-4 text-sm font-semibold">등록된 서버가 없습니다</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          &quot;서버 추가&quot; 버튼을 눌러 MCP 서버를 등록하세요.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {servers.map((server) => {
        const status = getStatus(server.id);
        return (
          <McpServerCard
            key={server.id}
            server={server}
            connectionStatus={status.status}
            connectionError={status.error}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleEnabled={onToggleEnabled}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
            listTools={listTools}
          />
        );
      })}
    </div>
  );
}
