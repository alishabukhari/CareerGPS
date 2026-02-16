"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getToken } from "@/lib/auth";

const API_BASE = "http://127.0.0.1:8000";
const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type TopicData = {
  title: string;
  phase: string;
  why: string;
  explanation: string;
  checklist: string[];
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function TopicDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = decodeURIComponent(params.slug as string);

  const [topic, setTopic] = useState<TopicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAI, setShowAI] = useState(false);
  const [aiMode, setAiMode] = useState<"chat" | "ideas" | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const [openLearn, setOpenLearn] = useState(true);
  const [openPractice, setOpenPractice] = useState(true);
  const [openPortfolio, setOpenPortfolio] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showCopied, setShowCopied] = useState(false);

  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const loadTopic = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/roadmap/topic?title=${encodeURIComponent(slug)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setTopic(data);
      } catch {
        setError("Failed to load topic.");
      } finally {
        setLoading(false);
      }
    };

    const loadChatHistory = async () => {
      try {
        const token = getToken();
        const res = await fetch(
          `${API_URL}/roadmap/topic/chat?title=${encodeURIComponent(slug)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch {
        setMessages([]);
      }
    };

    loadTopic();
    loadChatHistory();
  }, [slug, router]);

  const markComplete = async () => {
    const token = getToken();
    if (!token) return;

    try {
      setMarking(true);
      await fetch(`${API_BASE}/roadmap/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: slug }),
      });

      setCelebrate(true);
      setTimeout(() => {
        setCelebrate(false);
        router.push("/roadmap");
      }, 1600);
    } finally {
      setMarking(false);
    }
  };

  if (loading)
    return <div className="min-h-screen grid place-items-center">Loading…</div>;

  if (!topic || error)
    return (
      <div className="min-h-screen grid place-items-center">
        <button
          onClick={() => router.push("/roadmap")}
          className="underline text-blue-600"
        >
          ← Back to roadmap
        </button>
      </div>
    );

  const reactToMessage = async (message: string, reaction: "like" | "dislike") => {
  const token = getToken();
  if (!token) return;

  try {
    await fetch(`${API_URL}/roadmap/topic/react`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        topic_title: topic.title,
        message,
        reaction,
      }),
    });
  } catch {
    console.error("Reaction failed");
  }
};

  const streamTopicAI = async (userText: string) => {
    if (!userText.trim() || isStreaming) return;

    const token = getToken();
    if (!token) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: userText.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsStreaming(true);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch(`${API_URL}/roadmap/topic/ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic_title: topic.title,
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: userMsg.content },
          ],
        }),
      });

      if (!res.ok || !res.body) throw new Error("AI failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let buffer = "";
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        buffer += decoder.decode(value || new Uint8Array(), { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;

          const data = line.replace(/^data:\s?/, "");
          if (data === "[DONE]") break;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content + data }
                : m
            )
          );
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.role === "assistant" && m.content === ""
            ? { ...m, content: "⚠️ AI failed. Try again." }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

return (
  <div className="w-full relative">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

      {/* MAIN */}
      <div className="lg:col-span-8 space-y-8">

        <div>
          <button onClick={() => router.push("/roadmap")} className="text-blue-600 hover:underline cursor-pointer">
            ← Back to Roadmap
          </button>

          <p className="text-xs text-slate-500 mt-1">
            <span
              onClick={() => router.push("/roadmap")}
              className="cursor-pointer hover:underline text-slate-500"
            >
              Roadmap
            </span>{" "}
            › Foundation › {topic.title}
          </p>

          <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-600">
            Foundation
          </span>
        </div>

        <h1 className="text-4xl font-extrabold">{topic.title}</h1>

        {/* AI Explanation */}
        <div className="rounded-2xl p-6 bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-xl">
          <h3 className="font-semibold mb-2 flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-white/30 blur-md" />
              <motion.img
                src="/whitesparkle.png"
                className="w-10 h-10 relative"
                animate={{ y: [-4, 4, -4] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            </div>
            AI-Generated Explanation
          </h3>

          <p className="text-sm leading-relaxed">
            {topic.explanation}
          </p>

          <button
            onClick={() => { setShowAI(true); setAiMode("chat"); }}
            className="mt-4 bg-white text-blue-600 px-4 py-2 rounded-lg text-xs font-semibold hover:scale-[1.04] transition flex items-center gap-2"
          >
            <img src="/bluesparkle.png" className="w-6 h-6" />
            Ask AI a Question
          </button>
        </div>

        {/* What You'll Learn */}
        <div className="rounded-2xl p-6 bg-[#020617] border border-blue-900/30 text-white">
          <div className="flex justify-between cursor-pointer" onClick={() => setOpenLearn(!openLearn)}>
            <h3>📘 What You’ll Learn</h3>
            <span>{openLearn ? "▾" : "▸"}</span>
          </div>

          {openLearn && (
            <ul className="mt-4 space-y-2">
              {topic.checklist.map((item, i) => (
                <motion.li
                  key={i}
                  whileHover={{ scale: 1.04 }}
                  className="bg-[#0B254A]/70 border border-blue-900/30 rounded-lg px-4 py-2 cursor-pointer"
                >
                  ➜ {item}
                </motion.li>
              ))}
            </ul>
          )}
        </div>

        {/* Practice */}
        <div className="rounded-2xl p-6 bg-[#020617] border border-blue-900/30 text-white">
          <div className="flex justify-between cursor-pointer" onClick={() => setOpenPractice(!openPractice)}>
            <h3>💡 Practice Ideas & Mini Projects</h3>
            <span>{openPractice ? "▾" : "▸"}</span>
          </div>

          {openPractice && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {["Portfolio site", "Multi-page site", "Accessible form", "Landing page"].map((idea, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.04 }}
                  onClick={() => { setShowAI(true); setAiMode("ideas"); }}
                  className="bg-[#0B254A]/70 border border-blue-900/30 rounded-xl p-4 cursor-pointer flex gap-3"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                    {i + 1}
                  </span>
                  {idea}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Portfolio Tips */}
        <div className="rounded-2xl p-6 bg-[#020617] border border-blue-900/30 text-white">
          <div className="flex justify-between cursor-pointer" onClick={() => setOpenPortfolio(!openPortfolio)}>
            <h3>🎯 Portfolio Improvement Tips</h3>
            <span>{openPortfolio ? "▾" : "▸"}</span>
          </div>

          {openPortfolio && (
            <ul className="mt-4 space-y-2">
              {[
                "Showcase clean semantic HTML",
                "Follow WCAG accessibility standards",
                "Use SEO meta tags",
                "Document decisions in README",
              ].map((tip, i) => (
                <motion.li
                  key={i}
                  whileHover={{ scale: 1.04 }}
                  className="bg-[#0B254A]/70 border border-blue-900/30 rounded-lg px-4 py-2 flex gap-3 items-center"
                >
                  <span className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <img src="/whitetick.png" className="w-7 h-7" />
                  </span>
                  {tip}
                </motion.li>
              ))}
            </ul>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="rounded-2xl p-4 bg-blue-50 border border-blue-300 flex gap-4">
          <motion.button
            whileHover={{ scale: 1.03 }}
            onClick={markComplete}
            className="group flex-1 py-3 rounded-xl bg-white/80 text-[#0000FF] border border-blue-600 hover:bg-gradient-to-br hover:from-blue-600 hover:to-blue-500 hover:text-white transition flex items-center justify-center gap-3 font-semibold"
          >
            <img src="/bluetick.png" className="w-10 h-10 group-hover:hidden" />
            <img src="/whitetick.png" className="w-10 h-10 hidden group-hover:block" />
            Completed! Mark as Incomplete?
          </motion.button>

          <button
            onClick={() => { setShowAI(true); setAiMode("chat"); }}
            className="group flex-1 py-3 rounded-xl bg-white/80 text-[#0000FF] border border-blue-600 hover:bg-gradient-to-br hover:from-blue-600 hover:to-blue-500 hover:text-white transition flex items-center justify-center gap-3 font-semibold"
          >
            <img src="/bluesparkle.png" className="w-10 h-10 group-hover:hidden" />
            <img src="/whitesparkle.png" className="w-10 h-10 hidden group-hover:block" />
            Ask AI for Help
          </button>
        </div>
      </div>

      {/* AI CHATBOT */}
      <AnimatePresence>
        {showAI && (
          <motion.aside
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 80, opacity: 0 }}
            className="fixed right-0 top-0 h-screen w-[460px] bg-[#EEF5FF] border-l border-blue-300 shadow-xl z-40 flex flex-col"
          >
            <div className="bg-blue-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.img
                  src="/whitebot.png"
                  className="w-14 h-14"
                  animate={{ y: [-4, 4, -4] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
                <div>
                  <p className="font-semibold text-white text-sm">AI Learning Assistant</p>
                  <p className="text-xs text-white/80">Always here to help you learn</p>
                </div>
              </div>
              <button
                onClick={() => setShowAI(false)}
                className="text-white transition-transform duration-700 hover:rotate-90"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4 text-sm">
              {messages.map((m, i) => (
                <div
                  key={m.id || `${m.role}-${i}`}
                  className={`flex gap-3 items-start ${m.role === "user" ? "justify-end" : ""}`}
                >
                  {m.role === "assistant" && (
                    <span className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <img src="/bluebot.png" className="w-8 h-8" />
                    </span>
                  )}

                  <div className="flex flex-col max-w-[75%]">
                    <div
                      className={`px-4 py-2 rounded-2xl inline-block w-fit break-words ${
                        m.role === "assistant"
                          ? "bg-blue-600 text-white"
                          : "bg-white border text-slate-800"
                      }`}
                    >
                      {m.content}
                      {isStreaming && m.role === "assistant" && (
                        <span className="inline-block ml-1 animate-pulse">|</span>
                      )}
                    </div>

                    {m.role === "assistant" && !isStreaming && (
                      <div className="flex gap-2 mt-1 ml-1">
                        <img
                          src="/copy.png"
                          title="Copy"
                          className="w-8 h-8 cursor-pointer opacity-50 hover:opacity-100 hover:scale-110 active:scale-90 transition"
                          onClick={() => {
                          navigator.clipboard.writeText(m.content);
                          setShowCopied(true);
                          setTimeout(() => setShowCopied(false), 1200);
                         }}
                        />
                        <img
                          src="/like.png"
                          title="Like"
                          className="w-8 h-8 cursor-pointer opacity-50 hover:opacity-100 hover:scale-110 active:scale-90 transition"
                          onClick={() => reactToMessage(m.content, "like")}
                        />
                        <img
                          src="/dislike.png"
                          title="Dislike"
                          className="w-8 h-8 cursor-pointer opacity-50 hover:opacity-100 hover:scale-110 active:scale-90 transition"
                          onClick={() => reactToMessage(m.content, "dislike")}
                        />
                        <img
                          src="/share.png"
                          title="Share vis Gmail"
                          className="w-8 h-8 cursor-pointer opacity-50 hover:opacity-100 hover:scale-110 active:scale-90 transition"
                          onClick={() => {
                            const subject = encodeURIComponent(`CareerGPS – ${topic.title}`);
                            const body = encodeURIComponent(m.content);
                            window.open(
                              `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`,
                              "_blank"
                            );
                          }}
                        />
                  
                        <img
                          src="/regenerate.png"
                          title="Regenerate"
                          className="w-8 h-8 cursor-pointer opacity-50 hover:opacity-100 hover:scale-110 active:scale-90 transition"
                          onClick={() => streamTopicAI(messages[messages.length - 2]?.content ||"")}
                        />
                      </div>
                    )}
                  </div>

                  {m.role === "user" && (
                    <span className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                      <img src="/person.png" className="w-7 h-7" />
                    </span>
                  )}
                </div>
              ))}

              {isStreaming && (
                <div className="text-xs text-blue-600 animate-pulse">
                  AI is typing…
                </div>
              )}
            </div>
            
            {showCopied && (
              <div className="absolute bottom-16 right-6 bg-black/80 text-white text-xs px-3 py-1 rounded-full shadow-lg animate-pulse">
                Copied ✓
              </div>
            )}

            <div className="p-3 border-t border-blue-300 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") streamTopicAI(chatInput); }}
                className="flex-1 rounded-lg bg-white px-3 py-2 text-sm outline-none"
                placeholder="Ask me anything..."
                disabled={isStreaming}
              />
              <button
                onClick={() => streamTopicAI(chatInput)}
                disabled={isStreaming}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 rounded-lg transition"
              >
                ➤
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

    </div>
  </div>
);
}