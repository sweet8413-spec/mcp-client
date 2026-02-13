"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { McpToolInfo } from "@/types/mcp";

interface McpToolsListProps {
  serverId: string;
  isConnected: boolean;
  listTools: (serverId: string) => Promise<McpToolInfo[]>;
}

export function McpToolsList({
  serverId,
  isConnected,
  listTools,
}: McpToolsListProps) {
  const [open, setOpen] = useState(false);
  const [tools, setTools] = useState<McpToolInfo[]>([]);
  const [loading, setLoading] = useState(false);

  // 연결 해제 시 초기화
  useEffect(() => {
    if (!isConnected) {
      setTools([]);
      setOpen(false);
    }
  }, [isConnected]);

  const handleToggle = async () => {
    if (!open && tools.length === 0) {
      setLoading(true);
      const result = await listTools(serverId);
      setTools(result);
      setLoading(false);
    }
    setOpen((prev) => !prev);
  };

  if (!isConnected) return null;

  return (
    <div className="mt-2 border-t pt-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        className="text-muted-foreground h-7 w-full justify-start gap-1.5 px-1 text-xs"
      >
        {open ? (
          <ChevronDown className="size-3" />
        ) : (
          <ChevronRight className="size-3" />
        )}
        <Wrench className="size-3" />
        도구 목록
        {tools.length > 0 && (
          <span className="text-muted-foreground ml-auto">
            {tools.length}개
          </span>
        )}
      </Button>

      {open && (
        <div className="mt-1 space-y-1">
          {loading ? (
            <p className="text-muted-foreground px-1 text-[11px]">
              불러오는 중...
            </p>
          ) : tools.length === 0 ? (
            <p className="text-muted-foreground px-1 text-[11px]">
              사용 가능한 도구가 없습니다.
            </p>
          ) : (
            tools.map((tool) => (
              <div
                key={tool.name}
                className="bg-muted/50 rounded-md px-2 py-1.5"
              >
                <p className="text-xs font-medium">{tool.name}</p>
                {tool.description && (
                  <p className="text-muted-foreground mt-0.5 text-[11px] leading-tight">
                    {tool.description}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
