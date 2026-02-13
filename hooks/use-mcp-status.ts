"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  McpServerConfig,
  McpServerStatus,
  McpToolInfo,
} from "@/types/mcp";

const POLL_INTERVAL = 2000;

export function useMcpStatus() {
  const [statuses, setStatuses] = useState<McpServerStatus[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 상태 polling
  const fetchStatuses = useCallback(async () => {
    try {
      const res = await fetch("/api/mcp/status");
      if (res.ok) {
        const data = await res.json();
        setStatuses(data.statuses ?? []);
      }
    } catch {
      // polling 실패 시 무시
    }
  }, []);

  useEffect(() => {
    fetchStatuses();
    intervalRef.current = setInterval(fetchStatuses, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStatuses]);

  // 서버 연결
  const connect = useCallback(
    async (config: McpServerConfig): Promise<McpServerStatus> => {
      try {
        const res = await fetch("/api/mcp/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        });
        const data = await res.json();
        // 즉시 상태 갱신
        await fetchStatuses();
        return data;
      } catch {
        return { serverId: config.id, status: "error", error: "연결 요청 실패" };
      }
    },
    [fetchStatuses]
  );

  // 서버 연결 해제
  const disconnect = useCallback(
    async (serverId: string): Promise<void> => {
      try {
        await fetch("/api/mcp/disconnect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serverId }),
        });
        // 즉시 상태 갱신
        await fetchStatuses();
      } catch {
        // 실패 무시
      }
    },
    [fetchStatuses]
  );

  // 도구 목록 조회
  const listTools = useCallback(
    async (serverId: string): Promise<McpToolInfo[]> => {
      try {
        const res = await fetch(
          `/api/mcp/tools?serverId=${encodeURIComponent(serverId)}`
        );
        if (res.ok) {
          const data = await res.json();
          return data.tools ?? [];
        }
        return [];
      } catch {
        return [];
      }
    },
    []
  );

  // 특정 서버의 상태를 가져오는 헬퍼
  const getStatus = useCallback(
    (serverId: string): McpServerStatus => {
      return (
        statuses.find((s) => s.serverId === serverId) ?? {
          serverId,
          status: "disconnected",
        }
      );
    },
    [statuses]
  );

  return { statuses, getStatus, connect, disconnect, listTools, refresh: fetchStatuses };
}
