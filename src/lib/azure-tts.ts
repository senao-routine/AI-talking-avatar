const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY!;
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || "japaneast";
const AZURE_VOICE = process.env.AZURE_VOICE || "ja-JP-NanamiNeural";

const TTS_URL = `https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

function buildSSML(text: string, style?: string): string {
  const escapedText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const content = style
    ? `<mstts:express-as style="${style}">${escapedText}</mstts:express-as>`
    : escapedText;

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="ja-JP"><voice name="${AZURE_VOICE}">${content}</voice></speak>`;
}

export async function* streamTTS(
  text: string,
  options: { style?: string } = {}
): AsyncGenerator<Buffer> {
  const ssml = buildSSML(text, options.style || "chat");

  const response = await fetch(TTS_URL, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "raw-16khz-16bit-mono-pcm",
      "User-Agent": "AIAvatarApp/1.0",
    },
    body: ssml,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[Azure TTS] Error:", response.status, errorBody);
    throw new Error(`Azure TTS error: ${response.status} - ${errorBody}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield Buffer.from(value);
  }
}
