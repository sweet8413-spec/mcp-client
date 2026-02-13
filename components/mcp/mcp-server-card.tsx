"use client";

import { Edit, Trash2, Globe, Terminal, Plug, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { McpToolsList } from "./mcp-tools-list";
import type {
  McpServerConfig,
  McpConnectionStatus,
  McpToolInfo,
} from "@/types/mcp";

/** 연결 상태 Badge 스타일 */
function connectionBadge(status: McpConnectionStatus) {
  switch (status) {
    case "connected":
      return { label: "연결됨", className: "bg-emerald-100 text-emerald-700 border-emerald-200" };
    case "connecting":
      return { label: "연결 중...", className: "bg-amber-100 text-amber-700 border-amber-200 animate-pulse" };
    case "error":
      return { label: "오류", className: "bg-red-100 text-red-700 border-red-200" };
    default:
      return { label: "미연결", className: "" };
  }
}

interface McpServerCardProps {
  server: McpServerConfig;
  connectionStatus: McpConnectionStatus;
  connectionError?: string;
  onEdit: (server: McpServerConfig) => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onConnect: (server: McpServerConfig) => void;
  onDisconnect: (serverId: string) => void;
  listTools: (serverId: string) => Promise<McpToolInfo[]>;
}

export function McpServerCard({
  server,
  connectionStatus,
  connectionError,
  onEdit,
  onDelete,
  onToggleEnabled,
  onConnect,
  onDisconnect,
  listTools,
}: McpServerCardProps) {
  const isHttp = server.transportType === "streamable-http";
  const badge = connectionBadge(connectionStatus);
  const isConnected = connectionStatus === "connected";
  const isConnecting = connectionStatus === "connecting";

  return (
    <Card className={server.enabled ? "" : "opacity-60"}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
              server.enabled ? "bg-primary/10" : "bg-muted"
            }`}
          >
            {isHttp ? (
              <Globe
                className={`size-4 ${
                  server.enabled ? "text-primary" : "text-muted-foreground"
                }`}
              />
            ) : (
              <Terminal
                className={`size-4 ${
                  server.enabled ? "text-primary" : "text-muted-foreground"
                }`}
              />
            )}
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate text-sm font-semibold">
              {server.name}
            </CardTitle>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="text-[11px] font-normal">
                {isHttp ? "Streamable HTTP" : "stdio"}
              </Badge>
              {server.enabled && connectionStatus !== "disconnected" && (
                <Badge
                  variant="outline"
                  className={`text-[11px] font-normal ${badge.className}`}
                >
                  {badge.label}
                </Badge>
              )}
              {!server.enabled && (
                <Badge variant="outline" className="text-[11px] font-normal">
                  비활성
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Switch
            checked={server.enabled}
            onCheckedChange={(checked) => onToggleEnabled(server.id, checked)}
            aria-label="서버 활성화 토글"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(server)}
            className="text-muted-foreground"
          >
            <Edit className="size-3.5" />
            <span className="sr-only">수정</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(server.id)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
            <span className="sr-only">삭제</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* 서버 정보 */}
        {isHttp ? (
          <div className="space-y-1">
            <p className="text-muted-foreground truncate text-xs">
              <span className="font-medium">URL:</span>{" "}
              {server.url || "설정되지 않음"}
            </p>
            {server.headers && Object.keys(server.headers).length > 0 && (
              <p className="text-muted-foreground text-xs">
                <span className="font-medium">헤더:</span>{" "}
                {Object.keys(server.headers).length}개
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-muted-foreground truncate text-xs">
              <span className="font-medium">명령어:</span>{" "}
              {server.command || "설정되지 않음"}
            </p>
            {server.args && server.args.length > 0 && (
              <p className="text-muted-foreground truncate text-xs">
                <span className="font-medium">인자:</span>{" "}
                {server.args.join(" ")}
              </p>
            )}
            {server.env && Object.keys(server.env).length > 0 && (
              <p className="text-muted-foreground text-xs">
                <span className="font-medium">환경변수:</span>{" "}
                {Object.keys(server.env).length}개
              </p>
            )}
          </div>
        )}

        {/* 에러 메시지 */}
        {connectionStatus === "error" && connectionError && (
          <p className="mt-2 text-xs text-red-500">{connectionError}</p>
        )}

        {/* 연결/해제 버튼 */}
        {server.enabled && (
          <div className="mt-3">
            {isConnected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDisconnect(server.id)}
                className="h-7 w-full gap-1.5 text-xs"
              >
                <Unplug className="size-3" />
                연결 해제
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => onConnect(server)}
                disabled={isConnecting}
                className="h-7 w-full gap-1.5 text-xs"
              >
                <Plug className="size-3" />
                {isConnecting ? "연결 중..." : "연결"}
              </Button>
            )}
          </div>
        )}

        {/* 도구 목록 */}
        <McpToolsList
          serverId={server.id}
          isConnected={isConnected}
          listTools={listTools}
        />
      </CardContent>
    </Card>
  );
}
