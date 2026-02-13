"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { McpKeyValueEditor } from "./mcp-key-value-editor";
import type { McpServerConfig, McpTransportType } from "@/types/mcp";

interface KeyValuePair {
  key: string;
  value: string;
}

/** Record → KeyValuePair[] 변환 */
function recordToPairs(record?: Record<string, string>): KeyValuePair[] {
  if (!record) return [];
  return Object.entries(record).map(([key, value]) => ({ key, value }));
}

/** KeyValuePair[] → Record 변환 (빈 키 무시) */
function pairsToRecord(pairs: KeyValuePair[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const { key, value } of pairs) {
    const k = key.trim();
    if (k) record[k] = value;
  }
  return record;
}

interface McpServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: McpServerConfig | null; // null이면 신규 추가
  onSave: (data: {
    name: string;
    transportType: McpTransportType;
    url?: string;
    headers?: Record<string, string>;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
  }) => void;
}

export function McpServerDialog({
  open,
  onOpenChange,
  server,
  onSave,
}: McpServerDialogProps) {
  const isEdit = server !== null;

  const [name, setName] = useState("");
  const [transportType, setTransportType] =
    useState<McpTransportType>("streamable-http");

  // Streamable HTTP
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState<KeyValuePair[]>([]);

  // stdio
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [envVars, setEnvVars] = useState<KeyValuePair[]>([]);

  // 다이얼로그 열릴 때 폼 초기화
  useEffect(() => {
    if (open) {
      if (server) {
        setName(server.name);
        setTransportType(server.transportType);
        setUrl(server.url || "");
        setHeaders(recordToPairs(server.headers));
        setCommand(server.command || "");
        setArgs(server.args?.join(" ") || "");
        setEnvVars(recordToPairs(server.env));
      } else {
        setName("");
        setTransportType("streamable-http");
        setUrl("");
        setHeaders([]);
        setCommand("");
        setArgs("");
        setEnvVars([]);
      }
    }
  }, [open, server]);

  const handleSave = () => {
    if (!name.trim()) return;

    if (transportType === "streamable-http") {
      onSave({
        name: name.trim(),
        transportType,
        url: url.trim() || undefined,
        headers:
          headers.length > 0 ? pairsToRecord(headers) : undefined,
      });
    } else {
      const parsedArgs = args
        .trim()
        .split(/\s+/)
        .filter((a) => a.length > 0);

      onSave({
        name: name.trim(),
        transportType,
        command: command.trim() || undefined,
        args: parsedArgs.length > 0 ? parsedArgs : undefined,
        env: envVars.length > 0 ? pairsToRecord(envVars) : undefined,
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "MCP 서버 수정" : "MCP 서버 추가"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 서버 이름 */}
          <div className="space-y-2">
            <Label htmlFor="server-name">서버 이름 *</Label>
            <Input
              id="server-name"
              placeholder="예: Context7, Filesystem"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* 전송 방식 */}
          <div className="space-y-2">
            <Label>전송 방식</Label>
            <Select
              value={transportType}
              onValueChange={(v) => setTransportType(v as McpTransportType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="streamable-http">
                  Streamable HTTP
                </SelectItem>
                <SelectItem value="stdio">stdio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* 전송 방식별 설정 */}
          {transportType === "streamable-http" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="server-url">URL</Label>
                <Input
                  id="server-url"
                  placeholder="https://example.com/mcp"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <McpKeyValueEditor
                label="헤더 (Headers)"
                pairs={headers}
                onChange={setHeaders}
                keyPlaceholder="Header 이름"
                valuePlaceholder="Header 값"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="server-command">명령어 (Command)</Label>
                <Input
                  id="server-command"
                  placeholder="예: npx, node, python"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="server-args">
                  인자 (Args){" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    — 공백으로 구분
                  </span>
                </Label>
                <Input
                  id="server-args"
                  placeholder="예: -y @modelcontextprotocol/server-filesystem /path"
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                />
              </div>
              <McpKeyValueEditor
                label="환경변수 (Environment Variables)"
                pairs={envVars}
                onChange={setEnvVars}
                keyPlaceholder="변수 이름"
                valuePlaceholder="변수 값"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {isEdit ? "저장" : "추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
