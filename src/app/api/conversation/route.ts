import { streamChatResponse, type ConversationMessage } from "@/lib/claude";
import { streamTTS } from "@/lib/elevenlabs";

export async function POST(request: Request) {
  const { messages } = await request.json();

  if (!messages || !Array.isArray(messages)) {
    return Response.json({ error: "messages is required" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        for await (const fragment of streamChatResponse(messages)) {
          // Send text immediately
          send({ type: "text", content: fragment });

          // Stream TTS audio chunks as they arrive — don't wait for full audio
          try {
            for await (const audioChunk of streamTTS(fragment)) {
              send({
                type: "audio",
                content: Buffer.from(audioChunk).toString("base64"),
              });
            }
            // Mark this fragment's audio as complete
            send({ type: "fragment_end" });
          } catch (ttsError) {
            console.error("[API] TTS error:", ttsError);
          }
        }

        send({ type: "done" });
        controller.close();
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        send({ type: "error", content: msg });
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
}
