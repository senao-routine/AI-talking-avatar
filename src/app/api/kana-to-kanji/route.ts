import { anthropic } from "@/lib/claude";

const SYSTEM_PROMPT = `あなたは日本語のひらがな・カタカナで書かれた文を、漢字交じりの自然な日本語に変換する専門家です。

厳密なルール：
- 入力のひらがな・カタカナ表記を、適切な漢字交じりの自然な日本語に変換してください
- 文の意味は絶対に変えないでください
- 入力にない語句を追加しないでください。省略もしないでください
- 句読点や改行は入力のまま維持してください
- 出力は変換後の日本語テキストだけ。説明・前置き・引用符は一切不要です

例：
入力: きょうは てんきが いいですね
出力: 今日は天気がいいですね

入力: にほんごを べんきょう しています
出力: 日本語を勉強しています`;

export async function POST(request: Request) {
  const { text } = await request.json().catch(() => ({}));
  if (typeof text !== "string" || !text.trim()) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }

  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
    });

    const converted = res.content
      .filter((c) => c.type === "text")
      .map((c) => (c as { type: "text"; text: string }).text)
      .join("")
      .trim();

    return Response.json({ text: converted || text });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[kana-to-kanji] error:", msg);
    return Response.json({ text, error: msg }, { status: 200 });
  }
}
