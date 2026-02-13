import { GoogleGenAI } from "@google/genai";
import type { Content } from "@google/genai";
import { mcpClientManager } from "@/lib/mcp-client-manager";

const MODEL = "gemini-2.0-flash";

/* ------------------------------------------------------------------ */
/*  타입 정의                                                          */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  role: string;
  content: string;
  toolCalls?: {
    toolCallId: string;
    toolName: string;
    serverId: string;
    args: Record<string, unknown>;
  }[];
}

interface ToolResultInput {
  toolCallId: string;
  toolName: string;
  serverId: string;
  result: string;
  isError?: boolean;
}

interface RequestBody {
  messages: ChatMessage[];
  toolResults?: ToolResultInput[];
}

/* ------------------------------------------------------------------ */
/*  유틸 함수                                                          */
/* ------------------------------------------------------------------ */

/** 에러 코드별 사용자 친화적 메시지 */
function getErrorMessage(status: number): string {
  switch (status) {
    case 401:
    case 403:
      return "API 키가 올바르지 않습니다. .env.local 파일을 확인해주세요.";
    case 429:
      return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
    default:
      return "AI 응답 중 오류가 발생했습니다. 다시 시도해주세요.";
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ------------------------------------------------------------------ */
/*  MCP 도구 ↔ Gemini function calling 변환                            */
/* ------------------------------------------------------------------ */

/** 도구 이름 네임스페이스: mcp_{serverId}__{toolName}
 *  Gemini는 함수 이름이 반드시 문자 또는 언더스코어로 시작해야 함 */
function namespaceTool(serverId: string, toolName: string): string {
  return `mcp_${serverId}__${toolName}`;
}

function parseNamespacedTool(nsName: string) {
  // "mcp_" 접두사 제거
  const stripped = nsName.startsWith("mcp_") ? nsName.slice(4) : nsName;
  const idx = stripped.indexOf("__");
  if (idx < 0) return { serverId: "", toolName: stripped };
  return { serverId: stripped.slice(0, idx), toolName: stripped.slice(idx + 2) };
}

/** 연결된 모든 MCP 서버에서 도구 수집 → Gemini 함수 선언으로 변환 */
async function gatherGeminiTools() {
  const allServerTools = await mcpClientManager.listAllTools();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const declarations: any[] = [];
  const mapping = new Map<
    string,
    { serverId: string; originalName: string }
  >();

  for (const { serverId, tools } of allServerTools) {
    for (const tool of tools) {
      const nsName = namespaceTool(serverId, tool.name);
      declarations.push({
        name: nsName,
        description: tool.description ?? "",
        parameters: tool.inputSchema ?? { type: "object", properties: {} },
      });
      mapping.set(nsName, { serverId, originalName: tool.name });
    }
  }

  return { declarations, mapping };
}

/* ------------------------------------------------------------------ */
/*  메시지 → Gemini Content[] 변환                                     */
/* ------------------------------------------------------------------ */

function buildGeminiContents(
  messages: ChatMessage[],
  toolResults?: ToolResultInput[]
): Content[] {
  const contents: Content[] = [];

  for (const msg of messages) {
    if (msg.role === "user") {
      contents.push({
        role: "user",
        parts: [{ text: msg.content }],
      });
    } else if (msg.role === "assistant") {
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        // AI가 함수를 호출한 메시지 → functionCall parts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parts: any[] = [];
        if (msg.content) {
          parts.push({ text: msg.content });
        }
        for (const tc of msg.toolCalls) {
          parts.push({
            functionCall: {
              name: namespaceTool(tc.serverId, tc.toolName),
              args: tc.args,
            },
          });
        }
        contents.push({ role: "model", parts });
      } else {
        contents.push({
          role: "model",
          parts: [{ text: msg.content || " " }],
        });
      }
    }
  }

  // 도구 실행 결과 → functionResponse parts
  if (toolResults && toolResults.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = toolResults.map((tr) => ({
      functionResponse: {
        name: namespaceTool(tr.serverId, tr.toolName),
        response: { result: tr.result },
      },
    }));
    contents.push({ role: "user", parts });
  }

  return contents;
}

/* ------------------------------------------------------------------ */
/*  POST 핸들러                                                        */
/* ------------------------------------------------------------------ */

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "여기에_API_키_입력") {
    return Response.json(
      {
        error:
          "GEMINI_API_KEY가 설정되지 않았습니다. .env.local 파일을 확인해주세요.",
      },
      { status: 500 }
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch (e) {
    console.error("[chat] JSON parse error:", e);
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { messages, toolResults } = body;
  console.log("[chat] messages count:", messages?.length, "toolResults count:", toolResults?.length, "first msg role:", messages?.[0]?.role);
  if (!messages || messages.length === 0) {
    console.error("[chat] Empty messages");
    return Response.json({ error: "메시지가 비어있습니다." }, { status: 400 });
  }

  // 1. MCP 도구 수집 (연결된 서버가 없으면 빈 배열)
  const { declarations, mapping } = await gatherGeminiTools();
  console.log("[chat] tool declarations count:", declarations.length, "names:", declarations.map((d: { name: string }) => d.name));

  // 2. Gemini Content[] 구성
  const contents = buildGeminiContents(messages, toolResults);

  // 3. Gemini 설정 (도구가 있을 때만 tools 포함)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config: Record<string, any> = {};
  if (declarations.length > 0) {
    config.tools = [{ functionDeclarations: declarations }];
  }

  const ai = new GoogleGenAI({ apiKey });
  const MAX_RETRIES = 3;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContentStream({
        model: MODEL,
        contents,
        config,
      });

      // SSE 스트리밍 응답 생성
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const functionCalls: {
            name: string;
            args: Record<string, unknown>;
          }[] = [];

          try {
            for await (const chunk of response) {
              // 텍스트 스트리밍
              const text = chunk.text ?? "";
              if (text) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                );
              }

              // 함수 호출 감지
              if (chunk.functionCalls && chunk.functionCalls.length > 0) {
                for (const fc of chunk.functionCalls) {
                  functionCalls.push({
                    name: fc.name ?? "",
                    args: (fc.args as Record<string, unknown>) ?? {},
                  });
                }
              }
            }

            // 함수 호출이 감지되면 toolCalls 이벤트 전송
            if (functionCalls.length > 0) {
              const toolCalls = functionCalls.map((fc) => {
                const info = mapping.get(fc.name);
                const parsed = info
                  ? info
                  : parseNamespacedTool(fc.name);
                return {
                  id: crypto.randomUUID(),
                  name: "originalName" in parsed ? parsed.originalName : parsed.toolName,
                  serverId: parsed.serverId,
                  args: fc.args,
                };
              });
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ toolCalls })}\n\n`
                )
              );
            }

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "스트리밍 중 오류 발생";
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: message })}\n\n`
              )
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (err: unknown) {
      console.error("[chat] Gemini API error:", err);
      const status =
        err instanceof Error && "status" in err
          ? (err as { status: number }).status
          : 500;

      // 429 에러 시 재시도
      if (status === 429 && attempt < MAX_RETRIES) {
        await sleep((attempt + 1) * 2000);
        continue;
      }

      const message = getErrorMessage(status);
      return Response.json({ error: message }, { status });
    }
  }

  return Response.json(
    { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
    { status: 429 }
  );
}
