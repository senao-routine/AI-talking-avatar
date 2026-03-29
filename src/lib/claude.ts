import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const SYSTEM_PROMPT = `あなたは親しみやすいAIアシスタントです。
ユーザーとリアルタイムで音声会話をしています。

以下のルールに従ってください：
- 回答は簡潔に、1-2文で返してください
- 自然な会話口調で話してください
- 句読点（、。）で文を区切ってください
- 専門用語は避け、わかりやすい言葉を使ってください`;

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export async function* streamChatResponse(
  messages: ConversationMessage[],
  systemPrompt?: string
): AsyncGenerator<string> {
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    system: systemPrompt || SYSTEM_PROMPT,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  let sentenceBuffer = "";

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      sentenceBuffer += event.delta.text;

      // Yield on sentence enders only — keep full sentences for accurate kanji reading
      const splitter = /([。！？\n])/;
      while (splitter.test(sentenceBuffer)) {
        const match = sentenceBuffer.match(splitter);
        if (!match || match.index === undefined) break;

        const fragment = sentenceBuffer.slice(0, match.index + 1);
        sentenceBuffer = sentenceBuffer.slice(match.index + 1);

        if (fragment.trim()) {
          yield fragment.trim();
        }
      }
    }
  }

  if (sentenceBuffer.trim()) {
    yield sentenceBuffer.trim();
  }
}

export { anthropic };
