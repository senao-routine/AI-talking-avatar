import { streamTTS } from "@/lib/elevenlabs";

export async function POST(request: Request) {
  const { text, voiceId } = await request.json();

  if (!text) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of streamTTS(text)) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    return new Response(new Uint8Array(audioBuffer), {
      headers: {
        "Content-Type": "audio/pcm",
        "X-Sample-Rate": "16000",
        "X-Bit-Depth": "16",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
