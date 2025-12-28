import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai =
  process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

const SYSTEM_PROMPT =
  "You are Agentic GPT, a multilingual strategic copilot. Respond in Hinglish (friendly mix of Hindi + English) unless user language is clearly different. Provide concise, actionable answers with structure: (1) Insight, (2) Action Plan, (3) Next Steps. Keep tone energetic yet grounded. When providing code, use modern best practices.";

type Role = "user" | "assistant" | "system";

type IncomingMessage = {
  role: Role;
  content: string;
};

type RawMessage = {
  role?: string;
  content?: string;
};

function normalizeMessages(messages: RawMessage[]): IncomingMessage[] {
  return messages
    .filter((msg): msg is RawMessage & { content: string } => Boolean(msg && typeof msg.content === "string"))
    .map((msg): IncomingMessage => {
      const role: Role =
        msg.role === "assistant" || msg.role === "system" ? (msg.role as Role) : "user";
      return {
        role,
        content: msg.content.trim()
      };
    })
    .filter((msg) => msg.content.length > 0)
    .slice(-15);
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

function dedupe<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function generateOfflineResponse(messages: IncomingMessage[]) {
  const lastUserMessage =
    [...messages].reverse().find((msg) => msg.role === "user")?.content ??
    "मैं निर्देशन चाहूँगा।";

  const tokens = slugify(lastUserMessage);
  const keywords = dedupe(tokens.filter((token) => token.length > 4)).slice(0, 6);

  const focus = keywords[0] ?? "आइडिया";
  const second = keywords[1];

  const insight =
    second && focus !== second
      ? `तुम्हारा मुख्य फ़ोकस ${focus} है लेकिन ${second} भी बार-बार सामने आ रहा है।`
      : `तुम ${focus} पर डीप-ड्राइव करना चाहते हो—और मैं उसी पर ध्यान लगा रहा हूँ।`;

  const planHighlights = keywords.slice(0, 3).map((word, index) => {
    const label = index === 0 ? "Define" : index === 1 ? "Design" : "Deploy";
    return `• ${label}: ${word[0]?.toUpperCase()}${word.slice(1)} को actionable स्टेप्स में तोड़ो`;
  });

  const fallbackPlan =
    planHighlights.length > 0
      ? planHighlights.join("\n")
      : [
          "• Discover: लक्ष्यों को 3 measurable outcomes में बदलो",
          "• Design: solution sketch बनाओ और तुरंत feedback लो",
          "• Deploy: अगले 48 घंटों में एक छोटा सा टेस्ट रन सेट करो"
        ].join("\n");

  const followUp =
    keywords.length > 0
      ? `अगर तुम्हारे पास ${keywords[0]} से जुड़े constraints या deadlines हैं तो साझा करो, ताकि हम रणनीति fine-tune कर सकें।`
      : "अगर कोई specific constraint या deadline है तो बताओ ताकि हम strategy को sharp कर सकें।";

  return [
    `⚡️ Insight:\n${insight}`,
    `🛠️ Action Plan:\n${fallbackPlan}`,
    `🔁 Next Move:\n${followUp}`
  ].join("\n\n");
}

export async function POST(request: Request) {
  try {
    const { messages = [] } = (await request.json()) as {
      messages?: RawMessage[];
    };

    const sanitized = normalizeMessages(messages);

    if (sanitized.length === 0) {
      return NextResponse.json(
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "नमस्ते! बताओ आज किस मिशन पर निकलना है? Product, marketing, tech या कुछ totally अलग?"
        },
        { status: 200 }
      );
    }

    if (openai) {
      const response = await openai.responses.create({
        model: "gpt-4o-mini",
        input: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          ...sanitized
        ],
        max_output_tokens: 900,
        temperature: 0.6
      });

      const output = response.output_text?.trim();
      if (output && output.length > 0) {
        return NextResponse.json(
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: output
          },
          { status: 200 }
        );
      }
    }

    return NextResponse.json(
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: generateOfflineResponse(sanitized)
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Chat route error:", error);
    return NextResponse.json(
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "सर्वर अभी व्यस्त है लेकिन मैं हार नहीं मानता। कुछ सेकंड बाद फिर से ट्राय मारो!"
      },
      { status: 200 }
    );
  }
}
