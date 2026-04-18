import { DeepgramClient } from "@deepgram/sdk";

const deepgram = new DeepgramClient({
  apiKey: process.env.DEEPGRAM_API_KEY!,
});

export interface TranscriptResult {
  text: string;
  isFinal: boolean;
  speechFinal: boolean;
}

export { deepgram };
