# AI Avatar Assistant

リアルタイムでAIアバターと音声会話ができるWebアプリケーションです。
ユーザーが話しかけると、AIが音声で応答し、アバターがリップシンクしながら喋ります。

## 概要

ブラウザのマイクから音声を入力すると、以下のパイプラインがリアルタイムに動作します。

```
音声入力 → 音声認識(STT) → AI対話(LLM) → 音声合成(TTS) → アバター描画 + 音声再生
```

AI応答中はマイクを自動で一時停止し、応答完了後に自動再開するため、自然な交互の会話が可能です。

## 使用サービス

| レイヤー | サービス | 役割 |
|---------|---------|------|
| 音声認識 (STT) | Web Speech API | ブラウザ標準の日本語音声認識 |
| 対話AI (LLM) | Claude API (Anthropic) | ストリーミング応答生成 |
| 音声合成 (TTS) | ElevenLabs | 高品質な日本語音声合成 |
| アバター | Simli | WebRTCベースのリアルタイムリップシンクアバター |

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router, TypeScript)
- **スタイリング**: Tailwind CSS
- **通信**: Server-Sent Events (SSE), WebRTC
- **音声処理**: Web Audio API (PCM16再生、AnalyserNode)

## アーキテクチャ

```
Browser                           Server (Next.js API Routes)
┌──────────────────┐              ┌──────────────────────┐
│ Web Speech API   │─── text ───→│ /api/conversation     │
│ (STT)            │              │  ├─ Claude API (LLM) │
│                  │              │  └─ ElevenLabs (TTS) │
│ Simli Client     │←── SSE ─────│  → text + audio chunks│
│ (WebRTC Avatar)  │              └──────────────────────┘
│                  │              ┌──────────────────────┐
│ Web Audio API    │              │ /api/simli            │
│ (Fallback Audio) │              │  → Simli config       │
└──────────────────┘              └──────────────────────┘
```

### 処理フロー

1. **音声入力**: ブラウザのWeb Speech APIで日本語音声をリアルタイム認識
2. **無音検知 (800ms)**: 話し終わりを自動検知し、テキストをサーバーに送信
3. **LLM応答**: Claude APIが文単位でストリーミング応答を生成
4. **TTS変換**: 各文をElevenLabsでリアルタイムに音声変換
5. **アバター描画**: Simli ClientがPCM音声を受け取り、WebRTC経由でリップシンクアバターを描画
6. **エコー防止**: AI応答中はSTTを一時停止し、再生完了後に自動再開

## プロジェクト構造

```
src/
├── app/
│   ├── api/
│   │   ├── conversation/route.ts  # メインパイプライン (LLM → TTS → SSE)
│   │   ├── tts/route.ts           # 単体TTS API
│   │   └── simli/route.ts         # Simli設定API
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AvatarApp.tsx              # メインアプリ (状態管理・パイプライン統合)
│   ├── AvatarDisplay.tsx          # アバター表示 (Simli WebRTC video)
│   ├── ChatPanel.tsx              # チャット履歴パネル (トグル表示)
│   ├── ControlBar.tsx             # 操作バー (マイク・停止・チャット切替)
│   └── SpeechBubbles.tsx          # 吹き出しオーバーレイ
├── hooks/
│   ├── useAudioPlayer.ts          # PCM音声のギャップレス再生
│   ├── useConversation.ts         # 会話管理 + SSE受信
│   ├── useMicrophone.ts           # マイク入力管理
│   ├── useSimliAvatar.ts          # Simli WebRTC接続・音声送信
│   └── useSpeechRecognition.ts    # Web Speech API (一時停止/再開対応)
└── lib/
    ├── claude.ts                  # Claude API (文単位ストリーミング)
    ├── deepgram.ts                # Deepgram STT (将来拡張用)
    ├── elevenlabs.ts              # ElevenLabs TTS (ストリーミング)
    ├── azure-tts.ts               # Azure TTS (将来拡張用)
    └── simli.ts                   # Simli REST API
```

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集し、各APIキーを設定してください。

```env
# 必須
ANTHROPIC_API_KEY=sk-ant-...       # https://console.anthropic.com/
ELEVENLABS_API_KEY=...             # https://elevenlabs.io/
ELEVENLABS_VOICE_ID=...            # ElevenLabs Voices から取得

# アバター (任意 - なくても音声会話は動作)
SIMLI_API_KEY=...                  # https://app.simli.com/
SIMLI_FACE_ID=...                  # Simli Dashboard の Faces から取得
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 を開いてください。

## 使い方

1. **アバター接続**: 「Connect Avatar」ボタンをクリック (Simli設定済みの場合)
2. **マイクON**: 下部のマイクボタンをクリック
3. **話しかける**: 日本語で話すと、0.8秒の無音後に自動送信
4. **AI応答**: アバターがリップシンクしながら音声で応答
5. **連続会話**: 応答が終わるとマイクが自動再開し、そのまま次の発言が可能
6. **テキスト入力**: 下部のチャットアイコンからチャットパネルを開いてテキスト入力も可能

## UIレイアウト

```
┌─────────────────────────────────────┐
│           Header + Status            │
├──────────┬───────────┬──────────────┤
│ AI応答    │           │ ユーザー発言  │
│ 吹き出し   │  アバター   │  吹き出し    │
│ (左側)    │  (中央大)  │   (右側)     │
├──────────┴───────────┴──────────────┤
│  🗑  ⏹  🎤  💬  ⚙                  │
└─────────────────────────────────────┘
```

- **左カラム**: AIの応答が下から積み上がって流れる
- **中央**: Simliアバターが大きく表示
- **右カラム**: ユーザーの発言が下から積み上がって流れる
- **下部バー**: マイク操作、再生停止、チャットパネル切替

## APIキー取得先

| サービス | 取得URL | 無料枠 |
|---------|---------|--------|
| Anthropic (Claude) | https://console.anthropic.com/ | 初回$5クレジット |
| ElevenLabs | https://elevenlabs.io/ | 月10,000クレジット (~10分) |
| Simli | https://app.simli.com/ | $10 + 月50分 |
