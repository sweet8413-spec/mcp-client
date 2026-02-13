"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Server, Settings, Globe, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadMcpServers } from "@/lib/mcp-storage";
import { useMcpStatus } from "@/hooks/use-mcp-status";
import type { McpServerConfig, McpConnectionStatus } from "@/types/mcp";

/** 연결 상태별 점 색상 */
function statusDotClass(status: McpConnectionStatus): string {
  switch (status) {
    case "connected":
      return "bg-emerald-500";
    case "connecting":
      return "bg-amber-400 animate-pulse";
    case "error":
      return "bg-red-500";
    default:
      return "bg-muted-foreground/40";
  }
}

/** 연결 상태 한글 텍스트 */
function statusLabel(status: McpConnectionStatus): string {
  switch (status) {
    case "connected":
      return "연결됨";
    case "connecting":
      return "연결 중...";
    case "error":
      return "오류";
    default:
      return "미연결";
  }
}

/** 연결 상태 텍스트 색상 */
function statusTextClass(status: McpConnectionStatus): string {
  switch (status) {
    case "connected":
      return "text-emerald-600";
    case "connecting":
      return "text-amber-600";
    case "error":
      return "text-red-500";
    default:
      return "text-muted-foreground";
  }
}

export function McpStatusIndicator() {
  const router = useRouter();
  const [servers, setServers] = useState<McpServerConfig[]>([]);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { getStatus } = useMcpStatus();

  // 서버 목록 로드 + 포커스 복귀 시 갱신 (Supabase 비동기)
  useEffect(() => {
    loadMcpServers().then(setServers);
    const handleFocus = () => {
      loadMcpServers().then(setServers);
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const enabledServers = servers.filter((s) => s.enabled);
  const connectedCount = enabledServers.filter(
    (s) => getStatus(s.id).status === "connected"
  ).length;
  const totalCount = servers.length;

  // 전체 상태를 대표하는 인디케이터 색상
  const hasError = enabledServers.some(
    (s) => getStatus(s.id).status === "error"
  );
  const hasConnecting = enabledServers.some(
    (s) => getStatus(s.id).status === "connecting"
  );
  const indicatorClass = hasError
    ? "bg-red-500"
    : hasConnecting
    ? "bg-amber-400 animate-pulse"
    : connectedCount > 0
    ? "bg-emerald-500"
    : "bg-muted-foreground/40";

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((prev) => !prev)}
        className="text-muted-foreground gap-1.5"
      >
        <span className="relative">
          <Server className="size-3.5" />
          {totalCount > 0 && (
            <span
              className={`absolute -right-1 -top-1 size-2 rounded-full ${indicatorClass}`}
            />
          )}
        </span>
        <span className="text-xs">
          {totalCount === 0
            ? "MCP"
            : `${connectedCount}/${enabledServers.length}`}
        </span>
      </Button>

      {open && (
        <div className="bg-popover border-border absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border shadow-md">
          {/* 헤더 */}
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-xs font-semibold">MCP 서버</span>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                setOpen(false);
                router.push("/settings/mcp");
              }}
              className="text-muted-foreground gap-1"
            >
              <Settings className="size-3" />
              설정
            </Button>
          </div>

          {/* 서버 목록 */}
          {totalCount === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-muted-foreground text-xs">
                등록된 서버가 없습니다.
              </p>
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  router.push("/settings/mcp");
                }}
                className="mt-1 h-auto p-0 text-xs"
              >
                서버 추가하기
              </Button>
            </div>
          ) : (
            <ul className="max-h-60 overflow-y-auto p-1">
              {servers.map((server) => {
                const serverStatus = getStatus(server.id);
                const status = server.enabled
                  ? serverStatus.status
                  : "disconnected";

                return (
                  <li
                    key={server.id}
                    className="flex items-center gap-2.5 rounded-md px-2.5 py-2"
                  >
                    {/* 상태 점 */}
                    <span
                      className={`size-2 shrink-0 rounded-full ${statusDotClass(status)}`}
                    />
                    {/* 아이콘 */}
                    {server.transportType === "streamable-http" ? (
                      <Globe className="text-muted-foreground size-3.5 shrink-0" />
                    ) : (
                      <Terminal className="text-muted-foreground size-3.5 shrink-0" />
                    )}
                    {/* 이름 + 정보 */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-xs font-medium ${
                          server.enabled
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {server.name}
                      </p>
                      <p className="text-muted-foreground truncate text-[11px]">
                        {server.transportType === "streamable-http"
                          ? server.url || "URL 없음"
                          : server.command || "명령어 없음"}
                      </p>
                    </div>
                    {/* 상태 텍스트 */}
                    <span
                      className={`shrink-0 text-[11px] ${statusTextClass(status)}`}
                    >
                      {server.enabled ? statusLabel(status) : "비활성"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
