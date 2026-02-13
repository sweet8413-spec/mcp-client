"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { McpServerList } from "@/components/mcp/mcp-server-list";
import { McpServerDialog } from "@/components/mcp/mcp-server-dialog";
import { useMcpStatus } from "@/hooks/use-mcp-status";
import {
  loadMcpServers,
  saveMcpServer,
  deleteMcpServer,
  createMcpServer,
} from "@/lib/mcp-storage";
import type { McpServerConfig, McpTransportType } from "@/types/mcp";

export default function McpSettingsPage() {
  const router = useRouter();
  const [servers, setServers] = useState<McpServerConfig[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServerConfig | null>(
    null
  );

  const {
    getStatus,
    connect,
    disconnect,
    listTools,
  } = useMcpStatus();

  // 서버 목록 로드 (Supabase 비동기)
  useEffect(() => {
    loadMcpServers().then(setServers);
  }, []);

  // 서버 추가/수정 저장
  const handleSave = useCallback(
    (data: {
      name: string;
      transportType: McpTransportType;
      url?: string;
      headers?: Record<string, string>;
      command?: string;
      args?: string[];
      env?: Record<string, string>;
    }) => {
      if (editingServer) {
        const updated: McpServerConfig = {
          ...editingServer,
          ...data,
          updatedAt: new Date().toISOString(),
        };
        void saveMcpServer(updated);
        setServers((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s))
        );
      } else {
        const newServer = createMcpServer(data);
        void saveMcpServer(newServer);
        setServers((prev) => [newServer, ...prev]);
      }
      setEditingServer(null);
    },
    [editingServer]
  );

  // 서버 활성화/비활성화 토글 + 자동 connect/disconnect
  const handleToggleEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      let updatedServer: McpServerConfig | undefined;
      setServers((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const updated = {
            ...s,
            enabled,
            updatedAt: new Date().toISOString(),
          };
          void saveMcpServer(updated);
          updatedServer = updated;
          return updated;
        })
      );

      if (updatedServer) {
        if (enabled) {
          await connect(updatedServer);
        } else {
          await disconnect(id);
        }
      }
    },
    [connect, disconnect]
  );

  // 서버 삭제 + 연결 해제
  const handleDelete = useCallback(
    async (id: string) => {
      await disconnect(id);
      void deleteMcpServer(id);
      setServers((prev) => prev.filter((s) => s.id !== id));
    },
    [disconnect]
  );

  // 수정 다이얼로그 열기
  const handleEdit = useCallback((server: McpServerConfig) => {
    setEditingServer(server);
    setDialogOpen(true);
  }, []);

  // 추가 다이얼로그 열기
  const handleAdd = useCallback(() => {
    setEditingServer(null);
    setDialogOpen(true);
  }, []);

  // 서버 연결
  const handleConnect = useCallback(
    async (server: McpServerConfig) => {
      await connect(server);
    },
    [connect]
  );

  // 서버 연결 해제
  const handleDisconnect = useCallback(
    async (serverId: string) => {
      await disconnect(serverId);
    },
    [disconnect]
  );

  return (
    <>
      {/* 상단 헤더 */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => router.push("/")}
          className="text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          <span className="sr-only">돌아가기</span>
        </Button>
        <div>
          <h1 className="text-lg font-semibold">MCP 서버 설정</h1>
          <p className="text-muted-foreground text-sm">
            MCP 서버 연결 정보를 관리합니다.
          </p>
        </div>
      </div>

      <Separator className="my-6" />

      {/* 서버 추가 버튼 */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium">
          서버 목록{" "}
          <span className="text-muted-foreground">({servers.length})</span>
        </p>
        <Button size="sm" onClick={handleAdd} className="gap-1.5">
          <Plus className="size-3.5" />
          서버 추가
        </Button>
      </div>

      {/* 서버 목록 */}
      <McpServerList
        servers={servers}
        getStatus={getStatus}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleEnabled={handleToggleEnabled}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        listTools={listTools}
      />

      {/* 추가/수정 다이얼로그 */}
      <McpServerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        server={editingServer}
        onSave={handleSave}
      />
    </>
  );
}
