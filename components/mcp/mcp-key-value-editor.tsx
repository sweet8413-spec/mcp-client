"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface KeyValuePair {
  key: string;
  value: string;
}

interface McpKeyValueEditorProps {
  label: string;
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export function McpKeyValueEditor({
  label,
  pairs,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
}: McpKeyValueEditorProps) {
  const handleAdd = () => {
    onChange([...pairs, { key: "", value: "" }]);
  };

  const handleRemove = (index: number) => {
    onChange(pairs.filter((_, i) => i !== index));
  };

  const handleChange = (
    index: number,
    field: "key" | "value",
    newValue: string
  ) => {
    const updated = pairs.map((pair, i) =>
      i === index ? { ...pair, [field]: newValue } : pair
    );
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAdd}
          className="h-7 gap-1 text-xs"
        >
          <Plus className="size-3" />
          추가
        </Button>
      </div>

      {pairs.length === 0 && (
        <p className="text-muted-foreground text-xs">
          항목이 없습니다. &quot;추가&quot; 버튼을 눌러 추가하세요.
        </p>
      )}

      <div className="space-y-2">
        {pairs.map((pair, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              placeholder={keyPlaceholder}
              value={pair.key}
              onChange={(e) => handleChange(index, "key", e.target.value)}
              className="h-8 flex-1 text-sm"
            />
            <Input
              placeholder={valuePlaceholder}
              value={pair.value}
              onChange={(e) => handleChange(index, "value", e.target.value)}
              className="h-8 flex-1 text-sm"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => handleRemove(index)}
              className="text-muted-foreground hover:text-destructive shrink-0"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
