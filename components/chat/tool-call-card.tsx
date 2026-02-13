"use client";

import { useState } from "react";
import {
  Wrench,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ToolCallInfo } from "@/types/chat";
import type { Translations } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/*  개별 도구 호출 카드                                                  */
/* ------------------------------------------------------------------ */

interface ToolCallItemProps {
  toolCall: ToolCallInfo;
  onApprove?: (toolCallId: string) => void;
  onDeny?: (toolCallId: string) => void;
  t: Translations;
}

function ToolCallItem({ toolCall, onApprove, onDeny, t }: ToolCallItemProps) {
  const [argsOpen, setArgsOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);

  const hasArgs = Object.keys(toolCall.args).length > 0;
  const hasResult = !!toolCall.result;

  return (
    <div className="border-border bg-background rounded-lg border">
      {/* 헤더: 도구 이름 + 상태 */}
      <div className="flex items-center gap-2 px-3 py-2">
        <Wrench className="text-muted-foreground size-3.5 shrink-0" />
        <span className="text-sm font-medium">{toolCall.toolName}</span>

        {toolCall.serverName && (
          <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
            <Server className="size-2.5" />
            {toolCall.serverName}
          </span>
        )}

        <span className="ml-auto">
          <StatusBadge status={toolCall.status} t={t} />
        </span>
      </div>

      {/* 입력값 (args) - 접기/펼치기 */}
      {hasArgs && (
        <div className="border-border border-t">
          <button
            type="button"
            onClick={() => setArgsOpen((p) => !p)}
            className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 px-3 py-1.5 text-[11px] transition-colors"
          >
            {argsOpen ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
            {t.toolArgs}
          </button>
          {argsOpen && (
            <pre className="bg-muted/50 overflow-x-auto px-3 py-2 text-[11px] leading-relaxed">
              {JSON.stringify(toolCall.args, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* 결과 표시 */}
      {hasResult && (
        <div className="border-border border-t">
          <button
            type="button"
            onClick={() => setResultOpen((p) => !p)}
            className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 px-3 py-1.5 text-[11px] transition-colors"
          >
            {resultOpen ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
            {t.toolResult}
          </button>
          {resultOpen && (
            <pre className="bg-muted/50 max-h-60 overflow-auto whitespace-pre-wrap break-words px-3 py-2 text-[11px] leading-relaxed">
              {toolCall.result}
            </pre>
          )}
        </div>
      )}

      {/* 승인/거부 버튼 (pending 상태일 때만) */}
      {toolCall.status === "pending" && (
        <div className="border-border flex items-center gap-2 border-t px-3 py-2">
          <Button
            size="sm"
            variant="default"
            onClick={() => onApprove?.(toolCall.toolCallId)}
            className="h-7 gap-1 text-xs"
          >
            <Check className="size-3" />
            {t.toolApprove}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDeny?.(toolCall.toolCallId)}
            className="h-7 gap-1 text-xs"
          >
            <X className="size-3" />
            {t.toolDeny}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  상태 뱃지                                                          */
/* ------------------------------------------------------------------ */

function StatusBadge({
  status,
  t,
}: {
  status: ToolCallInfo["status"];
  t: Translations;
}) {
  switch (status) {
    case "pending":
      return (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
          {t.toolCallRequest}
        </span>
      );
    case "approved":
      return (
        <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
          <Loader2 className="size-3 animate-spin" />
          {t.toolRunning}
        </span>
      );
    case "completed":
      return (
        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
          <Check className="size-3" />
          {t.toolCompleted}
        </span>
      );
    case "denied":
      return (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
          {t.toolDenied}
        </span>
      );
    case "error":
      return (
        <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
          <AlertCircle className="size-3" />
          {t.toolError}
        </span>
      );
  }
}

/* ------------------------------------------------------------------ */
/*  도구 호출 그룹 카드 (여러 도구 호출을 하나의 카드로 묶어 표시)        */
/* ------------------------------------------------------------------ */

interface ToolCallCardProps {
  toolCalls: ToolCallInfo[];
  onApprove?: (toolCallId: string) => void;
  onDeny?: (toolCallId: string) => void;
  onApproveAll?: () => void;
  onDenyAll?: () => void;
  t: Translations;
}

export function ToolCallCard({
  toolCalls,
  onApprove,
  onDeny,
  onApproveAll,
  onDenyAll,
  t,
}: ToolCallCardProps) {
  const hasPending = toolCalls.some((tc) => tc.status === "pending");
  const multipleTools = toolCalls.length > 1;

  return (
    <div className="my-1 space-y-2">
      {/* 개별 도구 카드 */}
      {toolCalls.map((tc) => (
        <ToolCallItem
          key={tc.toolCallId}
          toolCall={tc}
          onApprove={onApprove}
          onDeny={onDeny}
          t={t}
        />
      ))}

      {/* 일괄 승인/거부 (2개 이상 도구가 pending 일 때) */}
      {hasPending && multipleTools && (
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="default"
            onClick={onApproveAll}
            className="h-7 gap-1 text-xs"
          >
            <Check className="size-3" />
            {t.toolApproveAll}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDenyAll}
            className="h-7 gap-1 text-xs"
          >
            <X className="size-3" />
            {t.toolDenyAll}
          </Button>
        </div>
      )}
    </div>
  );
}
