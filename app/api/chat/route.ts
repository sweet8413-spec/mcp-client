import { GoogleGenAI } from "@google/genai";
import type { Content } from "@google/genai";

const MODEL = "gemini-2.0-flash";

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

/** 지연 유틸 */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "여기에_API_키_입력") {
    return Response.json(
      { error: "GEMINI_API_KEY가 설정되지 않았습니다. .env.local 파일을 확인해주세요." },
      { status: 500 }
    );
  }

  let body: { messages: { role: string; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { messages } = body;
  if (!messages || messages.length === 0) {
    return Response.json({ error: "메시지가 비어있습니다." }, { status: 400 });
  }

  // 마지막 메시지(유저)를 분리하고, 나머지를 히스토리로 변환
  const lastMessage = messages[messages.length - 1];
  const historyMessages = messages.slice(0, -1);

  // Gemini history 형식으로 변환 (role: "user" | "model")
  const history: Content[] = historyMessages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const ai = new GoogleGenAI({ apiKey });

  // 429 에러 시 최대 3번까지 자동 재시도 (대기 시간 점점 증가)
  const MAX_RETRIES = 3;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const chat = ai.chats.create({
        model: MODEL,
        history,
      });

      const response = await chat.sendMessageStream({
        message: lastMessage.content,
      });

      // ReadableStream으로 SSE 스트리밍 응답 생성
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            for await (const chunk of response) {
              const text = chunk.text ?? "";
              if (text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "스트리밍 중 오류 발생";
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
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
      // HTTP 에러 코드 추출
      const status =
        err instanceof Error && "status" in err
          ? (err as { status: number }).status
          : 500;

      // 429 에러이고 재시도 횟수가 남았으면 대기 후 재시도
      if (status === 429 && attempt < MAX_RETRIES) {
        const waitTime = (attempt + 1) * 2000; // 2초, 4초, 6초 대기
        await sleep(waitTime);
        continue;
      }

      const message = getErrorMessage(status);
      return Response.json({ error: message }, { status });
    }
  }

  // 여기까지 오면 안 되지만 안전장치
  return Response.json(
    { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
    { status: 429 }
  );
}
