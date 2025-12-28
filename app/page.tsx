"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import clsx from "clsx";

type Role = "user" | "assistant" | "system";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  pending?: boolean;
  createdAt: number;
};

const startMessage: ChatMessage = {
  id: "intro",
  role: "assistant",
  content:
    "नमस्ते! मैं आपका निजी AI सहायक हूँ। कुछ भी पूछिए—आइडियाज़, कोड, रणनीतियाँ या रोजमर्रा के सवाल। चलिए शुरू करते हैं!",
  createdAt: Date.now()
};

const quickPrompts = [
  "मुझे अपना स्टार्टअप आइडिया वैलिडेट करने में मदद करो।",
  "Next.js में रियल-टाइम चैट कैसे बनाऊँ?",
  "मेरे लिए एक 7 दिन का अध्ययन प्लान तैयार करो।",
  "AI एजेंट्स के साथ एजाइल टीम कैसे बनाएं?"
];

function useTypewriter(text: string, enabled: boolean) {
  const [display, setDisplay] = useState(enabled ? "" : text);

  useEffect(() => {
    if (!enabled) {
      setDisplay(text);
      return;
    }

    setDisplay("");
    let index = 0;
    const step = () => {
      index += Math.max(1, Math.round(text.length / 90));
      setDisplay(text.slice(0, index));
      if (index < text.length) {
        animation = requestAnimationFrame(step);
      }
    };
    let animation = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animation);
  }, [text, enabled]);

  return display;
}

function Avatar({ role }: { role: Role }) {
  return (
    <div
      className={clsx(
        "h-10 w-10 flex items-center justify-center rounded-full border",
        role === "assistant"
          ? "border-[#5f74ff]/60 bg-[#272b5f]"
          : "border-[#1f82ff]/70 bg-[#0f1f3a]"
      )}
    >
      {role === "assistant" ? "⚡️" : "🧑‍💻"}
    </div>
  );
}

function MessageBubble({ message, isLatestAssistant }: { message: ChatMessage; isLatestAssistant: boolean }) {
  const shouldType = message.role === "assistant" && isLatestAssistant && message.pending === false;
  const typed = useTypewriter(message.content, shouldType);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      className={clsx(
        "flex w-full gap-3",
        message.role === "user" ? "justify-end" : "justify-start"
      )}
    >
      {message.role !== "user" && <Avatar role={message.role} />}
      <div
        className={clsx(
          "max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg",
          message.role === "user"
            ? "bg-gradient-to-br from-[#2560ff] to-[#6a3aff] text-white"
            : "glass border-[#5f74ff]/30 text-[#f0f1ff]"
        )}
      >
        <div className="whitespace-pre-wrap">{typed}</div>
        {message.pending && (
          <div className="mt-2 flex items-center gap-1 text-[0.7rem] text-[#a8b0ff]/70">
            <span className="h-2 w-2 animate-ping rounded-full bg-[#a8b0ff]"></span>
            Generating…
          </div>
        )}
      </div>
      {message.role === "user" && <Avatar role={message.role} />}
    </motion.div>
  );
}

export default function Page() {
  const [messages, setMessages] = useState<ChatMessage[]>([startMessage]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const latestAssistantId = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((msg) => msg.role === "assistant");
    return lastAssistant?.id;
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const submit = async () => {
    const trimmed = input.trim();
    if (!trimmed || status === "loading") return;

    const id = crypto.randomUUID();
    const userMessage: ChatMessage = {
      id,
      role: "user",
      content: trimmed,
      createdAt: Date.now()
    };

    const placeholderAssistant: ChatMessage = {
      id: `${id}-assistant`,
      role: "assistant",
      content: "",
      pending: true,
      createdAt: Date.now()
    };

    setMessages((prev) => [...prev, userMessage, placeholderAssistant]);
    setInput("");
    setStatus("loading");
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(({ role, content }) => ({
            role,
            content
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Response error: ${response.status}`);
      }

      const data: ChatMessage = await response.json();
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === placeholderAssistant.id
            ? {
                ...msg,
                content: data.content,
                pending: false
              }
            : msg
        )
      );
      setStatus("idle");
    } catch (err) {
      console.error(err);
      setError("कुछ गड़बड़ हो गई। दोबारा कोशिश करें।");
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === placeholderAssistant.id
            ? {
                ...msg,
                content: "मैं अभी जवाब देने में परेशानी महसूस कर रहा हूँ। थोड़ी देर बाद फिर कोशिश करें।",
                pending: false
              }
            : msg
        )
      );
      setStatus("error");
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const reset = () => {
    setMessages([startMessage]);
    setError(null);
    setInput("");
    setStatus("idle");
  };

  return (
    <div className="flex min-h-screen flex-col px-4 py-6 md:px-8 lg:px-16">
      <header className="mx-auto flex w-full max-w-5xl flex-col gap-3 py-6 text-center md:flex-row md:items-end md:justify-between md:text-left">
        <div>
          <h1 className="gradient-text text-3xl font-semibold md:text-4xl">Agentic GPT</h1>
          <p className="mt-2 text-sm text-[#b4bcff]/80 md:max-w-xl">
            AI साथी जो संदर्भ समझता है, रणनीति बनाता है और भाषा की बाधाओं के बिना काम करता है। बस सवाल पूछिए और तुरंत जानिए नए विचार, कोड टिप्स, या प्रोडक्ट प्लान।
          </p>
        </div>
        <div className="rounded-full border border-[#4c58b9]/40 bg-[#151931]/70 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#a8b0ff]">
          Always-On Agent Mode
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4">
        <section className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <motion.article
            layout
            className="glass relative flex h-[65vh] flex-col overflow-hidden rounded-3xl border border-[#3e4a9c]/30 p-0"
          >
            <ScrollArea.Root className="scroll-area flex-1">
              <ScrollArea.Viewport className="h-full w-full p-6 md:p-8">
                <div className="flex flex-col gap-6">
                  <AnimatePresence initial={false}>
                    {messages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isLatestAssistant={latestAssistantId === message.id}
                      />
                    ))}
                  </AnimatePresence>
                  <div ref={endRef} />
                </div>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar className="flex touch-none select-none bg-transparent p-1" orientation="vertical">
                <ScrollArea.Thumb className="flex-1 rounded-full bg-[#5f74ff]/40" />
              </ScrollArea.Scrollbar>
              <ScrollArea.Corner />
            </ScrollArea.Root>

            <div className="border-t border-[#3e4a9c]/40 bg-[#0c1124]/80 p-4 md:p-6">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        submit();
                      }
                    }}
                    placeholder="अपने AI साथी से कुछ भी पूछें…"
                    className="flex-1 rounded-2xl border border-[#3e4a9c]/40 bg-[#131834]/90 px-4 py-3 text-sm text-[#f0f1ff] shadow-inner outline-none transition focus:border-[#6c7bf9]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={submit}
                    disabled={status === "loading"}
                    className={clsx(
                      "rounded-2xl px-5 py-3 text-sm font-semibold uppercase tracking-wide transition",
                      status === "loading"
                        ? "cursor-not-allowed bg-[#273069] text-[#9ca6ff]"
                        : "bg-gradient-to-br from-[#5f74ff] to-[#8359ff] text-white hover:brightness-105"
                    )}
                  >
                    {status === "loading" ? "सोच रहा…" : "भेजें"}
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#99a7ff]/70">
                  <span>🔒 सुरक्षित सर्वर-साइड इंफरेंस · बहुभाषिक प्रतिक्रिया</span>
                  <button
                    onClick={reset}
                    className="rounded-full border border-transparent bg-[#1a2144] px-3 py-1 text-[0.68rem] uppercase tracking-[0.2em] text-[#9ca6ff] transition hover:border-[#4c58b9]/60 hover:text-white"
                  >
                    नई बातचीत
                  </button>
                </div>
                {error && (
                  <div className="rounded-xl border border-[#ff7b7b]/40 bg-[#361824]/80 p-3 text-xs text-[#ffbcbc]">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </motion.article>

          <motion.aside
            layout
            className="glass flex h-fit flex-col gap-4 rounded-3xl border border-[#3e4a9c]/30 p-6 lg:h-[65vh]"
          >
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#afb7ff]">
                टर्बो बूस्टर
              </h2>
              <p className="mt-2 text-sm text-[#b9c2ff]/70">
                इन सुझाओं पर क्लिक करें और Agentic GPT तुरंत आपके संदर्भ में सोचने लगेगा।
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleQuickPrompt(prompt)}
                  className="rounded-2xl border border-[#3e4a9c]/40 bg-[#111630]/90 px-4 py-3 text-left text-sm text-[#d4dbff] transition hover:border-[#6375ff]/60 hover:bg-[#18204a]"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="mt-auto rounded-2xl border border-[#3844a0]/30 bg-[#101733]/80 p-4 text-xs text-[#a8b0ff]/80">
              <p className="font-semibold text-[#ccd4ff]">एजेंट बुद्धिमत्ता</p>
              <ul className="mt-2 space-y-2">
                <li>• संदर्भ-संवेदी उत्तर और फॉलो-अप सुझाव</li>
                <li>• रणनीति, प्रोडक्ट, कोड और ग्रोथ के लिए प्रशिक्षित</li>
                <li>• बहुभाषिक चैट अनुभव</li>
              </ul>
            </div>
          </motion.aside>
        </section>
      </main>

      <footer className="mx-auto mt-6 w-full max-w-5xl border-t border-[#2b356e]/40 py-6 text-center text-xs text-[#818bda]">
        crafted for humans building with agents · deploy on vercel
      </footer>
    </div>
  );
}
