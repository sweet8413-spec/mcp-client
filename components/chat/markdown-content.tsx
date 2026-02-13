"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Components } from "react-markdown";

interface MarkdownContentProps {
  content: string;
}

/** 코드 블록 상단 바 + 복사 버튼 */
function CodeBlock({
  language,
  children,
}: {
  language: string;
  children: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.warn("코드 복사 실패");
    }
  };

  return (
    <div className="bg-background my-2 overflow-hidden rounded-lg border">
      {/* 상단 바: 언어 이름 + 복사 버튼 */}
      <div className="bg-muted/60 flex items-center justify-between px-3 py-1.5">
        <span className="text-muted-foreground text-xs font-medium">
          {language || "code"}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleCopy}
          className="text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <Check className="size-3 text-green-500" />
          ) : (
            <Copy className="size-3" />
          )}
          <span className="sr-only">코드 복사</span>
        </Button>
      </div>
      {/* 코드 본문 */}
      <pre className="overflow-x-auto p-3">
        <code className="text-xs leading-relaxed">{children}</code>
      </pre>
    </div>
  );
}

const components: Components = {
  // 코드 블록 (``` ```)은 pre > code로 렌더링됨
  pre({ children }) {
    // children이 <code> 요소인지 확인
    const codeElement = children as React.ReactElement<{
      className?: string;
      children?: string;
    }>;

    if (codeElement?.props) {
      const className = codeElement.props.className || "";
      const language = className.replace("language-", "");
      const code = String(codeElement.props.children || "").replace(/\n$/, "");

      return <CodeBlock language={language}>{code}</CodeBlock>;
    }

    // fallback
    return <pre className="my-2 overflow-x-auto rounded-lg border p-3">{children}</pre>;
  },
  // 인라인 코드 (`code`)
  code({ children }) {
    return (
      <code className="bg-background rounded border px-1.5 py-0.5 text-xs font-mono">
        {children}
      </code>
    );
  },
  // 단락
  p({ children }) {
    return <p className="mb-2 last:mb-0">{children}</p>;
  },
  // 제목
  h1({ children }) {
    return <h1 className="mb-2 mt-3 text-base font-bold first:mt-0">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="mb-2 mt-3 text-sm font-bold first:mt-0">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="mb-1 mt-2 text-sm font-semibold first:mt-0">{children}</h3>;
  },
  // 리스트
  ul({ children }) {
    return <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>;
  },
  li({ children }) {
    return <li className="leading-relaxed">{children}</li>;
  },
  // 링크
  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:opacity-80"
      >
        {children}
      </a>
    );
  },
  // 인용
  blockquote({ children }) {
    return (
      <blockquote className="border-primary/30 my-2 border-l-2 pl-3 italic opacity-80">
        {children}
      </blockquote>
    );
  },
  // 구분선
  hr() {
    return <hr className="border-border my-3" />;
  },
  // 테이블
  table({ children }) {
    return (
      <div className="my-2 overflow-x-auto">
        <table className="border-border w-full border-collapse text-xs">
          {children}
        </table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th className="border-border bg-background/50 border px-2 py-1 text-left font-semibold">
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td className="border-border border px-2 py-1">{children}</td>
    );
  },
  // 강조
  strong({ children }) {
    return <strong className="font-semibold">{children}</strong>;
  },
};

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="prose-sm max-w-none break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
