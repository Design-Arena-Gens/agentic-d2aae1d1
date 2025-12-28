# Agentic GPT

Agentic GPT is a ChatGPT-style conversational agent optimised for deployment on Vercel. It delivers fast, structured answers in Hinglish, supports multi-turn context, and falls back to an on-device heuristic brain when no OpenAI key is available.

## Stack

- Next.js 14 (App Router, TypeScript)
- React 18 with Framer Motion + Radix Scroll Area
- Optional OpenAI API (`gpt-4o-mini`)

## Getting Started

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to start chatting.

## Environment

Set `OPENAI_API_KEY` to unlock true LLM responses. Without it, the agent serves structured, offline insights so you always get productive guidance.

## Production Build

```bash
npm run lint
npm run build
npm run start
```

Deploy to Vercel with `vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-d2aae1d1`.

## Project Structure

```
app/
  api/chat/route.ts   # Chat completion endpoint with OpenAI + offline fallback
  layout.tsx          # Root layout and metadata
  page.tsx            # Chat UI + UI logic
  globals.css         # Neon glassmorphism styling
public/               # Static assets
```

## License

MIT — use, remix, and ship 🚀
