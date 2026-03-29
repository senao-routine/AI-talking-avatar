const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";

const BASE_URL = "https://api.elevenlabs.io/v1";

export interface TTSOptions {
  voiceId?: string;
  modelId?: string;
  outputFormat?: string;
}

export async function* streamTTS(
  text: string,
  options: TTSOptions = {}
): AsyncGenerator<Buffer> {
  const {
    voiceId = VOICE_ID,
    modelId = "eleven_multilingual_v2",
    outputFormat = "pcm_16000",
  } = options;

  const response = await fetch(
    `${BASE_URL}/text-to-speech/${voiceId}/stream?output_format=${outputFormat}&optimize_streaming_latency=4`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: false,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[ElevenLabs] TTS error:", response.status, errorBody);
    throw new Error(`ElevenLabs TTS error: ${response.status} - ${errorBody}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield Buffer.from(value);
  }
}
