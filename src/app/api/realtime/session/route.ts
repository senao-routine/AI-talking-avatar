const DEFAULT_INSTRUCTIONS = `あなたは親しみやすいAIアシスタントです。ユーザーと自然な日本語で音声会話をしています。

重要なルール：
- 必ず日本語で応答してください。英語は使わないでください。
- 【最重要】返答のテキストは必ずひらがなとカタカナのみで書いてください。漢字は絶対に一文字も使わないでください。
  例: 「今日は天気がいいですね」ではなく「きょうは てんきが いいですね」と書いてください。
  外来語や固有名詞はカタカナで書いてください。
  数字もすべて漢数字やアラビア数字ではなく「いち、に、さん」のようにひらがなで書いてください。
- 即座に返答してください。考え込まないでください。
- 返答は非常に短く、原則1文のみ。長くても2文までです。
- 自然でカジュアルな会話口調で話してください。
- 「えっと」「あのー」などの不要な間投詞は入れないでください。
- 質問されていない限り、自分から長く話さないでください。`;

const REALTIME_MODEL = "gpt-realtime";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is not set" },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const voice = typeof body.voice === "string" ? body.voice : "marin";
  const instructions =
    typeof body.instructions === "string"
      ? body.instructions
      : DEFAULT_INSTRUCTIONS;

  const res = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": "realtime=v1",
    },
    body: JSON.stringify({
      model: REALTIME_MODEL,
      voice,
      instructions,
      modalities: ["audio", "text"],
      input_audio_format: "pcm16",
      output_audio_format: "pcm16",
      input_audio_transcription: { model: "gpt-4o-transcribe", language: "ja" },
      turn_detection: {
        type: "semantic_vad",
        eagerness: "high",
        create_response: true,
        interrupt_response: true,
      },
      max_response_output_tokens: 150,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[realtime/session] OpenAI error:", res.status, errText);
    return Response.json(
      { error: "Failed to create realtime session", detail: errText },
      { status: res.status }
    );
  }

  const data = await res.json();
  return Response.json({ ...data, model: REALTIME_MODEL });
}
