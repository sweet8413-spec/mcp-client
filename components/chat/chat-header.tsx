"use client";

import { Bot, Globe, PanelLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { LANGUAGE_LABELS, type Language, type Translations } from "@/lib/i18n";
import { McpStatusIndicator } from "./mcp-status-indicator";

interface ChatHeaderProps {
  onReset: () => void;
  hasMessages: boolean;
  onToggleSidebar: () => void;
  t: Translations;
  lang: Language;
  onChangeLanguage: (lang: Language) => void;
}

export function ChatHeader({
  onReset,
  hasMessages,
  onToggleSidebar,
  t,
  lang,
  onChangeLanguage,
}: ChatHeaderProps) {
  const [langOpen, setLangOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 메뉴 바깥 클릭 시 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    if (langOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [langOpen]);

  return (
    <header className="border-border flex h-14 shrink-0 items-center gap-3 border-b px-4">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onToggleSidebar}
        className="text-muted-foreground"
      >
        <PanelLeft className="size-4" />
        <span className="sr-only">{t.toggleSidebar}</span>
      </Button>

      <div className="bg-primary/10 flex size-8 items-center justify-center rounded-lg">
        <Bot className="text-primary size-5" />
      </div>
      <div className="flex flex-col">
        <h1 className="text-sm font-semibold">AI Chat</h1>
        <p className="text-muted-foreground text-xs">gemini-2.0-flash</p>
      </div>

      <div className="ml-auto flex items-center gap-1">
        {/* 언어 선택 */}
        <div className="relative" ref={menuRef}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLangOpen((prev) => !prev)}
            className="text-muted-foreground gap-1.5"
          >
            <Globe className="size-3.5" />
            {LANGUAGE_LABELS[lang]}
          </Button>

          {langOpen && (
            <div className="bg-popover border-border absolute right-0 top-full z-50 mt-1 w-32 rounded-lg border p-1 shadow-md">
              {(Object.keys(LANGUAGE_LABELS) as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => {
                    onChangeLanguage(l);
                    setLangOpen(false);
                  }}
                  className={`w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                    l === lang
                      ? "bg-accent text-accent-foreground font-medium"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  {LANGUAGE_LABELS[l]}
                </button>
              ))}
            </div>
          )}
        </div>

        <McpStatusIndicator />

        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={!hasMessages}
          className="text-muted-foreground gap-1.5"
        >
          <RotateCcw className="size-3.5" />
          {t.reset}
        </Button>
      </div>
    </header>
  );
}
