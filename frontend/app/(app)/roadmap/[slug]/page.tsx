"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getToken } from "@/lib/auth";
import { markTaskComplete } from "@/lib/roadmapApi";
import confetti from "canvas-confetti";
import Link from "next/link";

const API_BASE = "http://127.0.0.1:8000";

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

type ChatSession = {
  id: string;
  preview_title: string | null;
  created_at: string;
  is_pinned?: boolean | null;
};

const groupSessionsByDate = (sessions: ChatSession[]) => {
  const groups: Record<string, ChatSession[]> = {};

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  // ✅ Sort pinned chats to top, then by date
  const sortedSessions = [...sessions].sort((a, b) => {
    const pinDiff = Number(!!b.is_pinned) - Number(!!a.is_pinned);
    if (pinDiff !== 0) return pinDiff;

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // ✅ Group AFTER sorting
  sortedSessions.forEach((s) => {
    const dateStr = new Date(s.created_at).toDateString();

    let label = "Older";
    if (dateStr === today) label = "Today";
    else if (dateStr === yesterday) label = "Yesterday";

    if (!groups[label]) groups[label] = [];
    groups[label].push(s);
  });

  return groups;
};

export default function TopicDetailPage() {
  const router = useRouter();
  const params = useParams();
  const rawSlug = decodeURIComponent(params.slug as string);
  const title = rawSlug.replace(/-/g, " ");
  const slug = decodeURIComponent(params.slug as string);
  const [copied, setCopied] = useState(false);

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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const groupedSessions = groupSessionsByDate(chatSessions);
  const pinnedCount = chatSessions.filter(s => s.is_pinned).length;
  const [roadmapItems, setRoadmapItems] = useState<{ title: string }[]>([]);
  const [nextTopic, setNextTopic] = useState<{ title: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const phase = topic?.phase?.toLowerCase() || "";

const phaseLabel = phase.includes("core")
  ? "Core Skills"
  : phase.includes("advanced")
  ? "Advanced"
  : "Foundation";

 useEffect(() => {  
  if (!roadmapItems.length || !topic?.title) return;  

  const index = roadmapItems.findIndex(  
    (item) => item.title.toLowerCase() === topic.title.toLowerCase()  
  );  

  if (index !== -1 && roadmapItems[index + 1]) {  
    setNextTopic(roadmapItems[index + 1]);  
  } else {  
    setNextTopic(null);  
  }  
}, [roadmapItems, topic]);

  useEffect(() => {
  const token = getToken();
  if (!token) {
    router.push("/login");
    return;
  }

  const loadTopic = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/roadmap/topic?title=${encodeURIComponent(title)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed topic fetch");
      const data = await res.json();
      setTopic(data);
    } catch {
      setError("Failed to load topic.");
    } finally {
      setLoading(false);
    }
  };

  const loadRoadmapItems = async () => {
    try {
      const res = await fetch(`${API_BASE}/roadmap`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;

      const data = await res.json();
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      const allItems = parsed.phases.flatMap((p: any) => p.items);
      setRoadmapItems(allItems);
    } catch {}
  };

  setTopic(null);
  setMessages([]);
  setActiveSessionId(null);

  loadTopic();
  loadRoadmapItems();
}, [slug]);



  // AUTO-SCROLL when messages change or streaming updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // AUTO-SCROLL when AI panel opens
  useEffect(() => {
    if (showAI) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 50);
    }
  }, [showAI]);

  useEffect(() => {
    const close = () => setOpenMenuId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const markComplete = async () => {
    const token = getToken();
    if (!token) return;

    try {
      setMarking(true);
      await markTaskComplete(slug);

        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.6 },
          colors: ["#2563EB", "#60A5FA", "#FFFFFF"],
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
    await fetch(`${API_BASE}/roadmap/topic/react`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        topic_title: title,
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
    let sessionId = activeSessionId;

    // 🔥 CREATE SESSION IF THIS IS A NEW CHAT
    if (!sessionId) {
      const res = await fetch(`${API_BASE}/roadmap/topic/chat/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic_title: title,               // topic
          preview_title: userMsg.content, // first user message as title
        }),
      });

      const data = await res.json();
      sessionId = data.session.id;
      setActiveSessionId(sessionId);

      // refresh history list
      loadChatSessions();
    }

    const res = await fetch(`${API_BASE}/roadmap/topic/ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        topic_title: title,
        session_id: sessionId,   // ✅ guaranteed now
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
            m.id === assistantId && !m.content.endsWith(data)
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
          ? { ...m, content: "⚠️ AI had a hiccup. Tap regenerate to try again." }
          : m
      )
    );
  } finally {
    setIsStreaming(false);
  }
};

  const loadChatSessions = async () => {
  const token = getToken();
  if (!token || !topic?.title) {
    console.warn("loadChatSessions skipped: topic not ready");
    return;
  }

  try {
    setLoadingSessions(true);

    const res = await fetch(
      `${API_BASE}/roadmap/topic/chat/sessions?topic_title=${encodeURIComponent(title)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) throw new Error("Sessions fetch failed");

    const data = await res.json();
    setChatSessions(data.sessions || []);
  } catch {
    setChatSessions([]);
  } finally {
    setLoadingSessions(false);
  }
};

const PRACTICE_IDEAS_BY_PHASE: Record<"foundation" | "core skills" | "advanced", string[]> = {
  foundation: [
    "Build a simple LED + resistor circuit on a breadboard",
    "Simulate Ohm’s Law using Tinkercad or Proteus",
    "Create a basic electromagnet using a coil and battery",
    "Measure voltage & current using a multimeter",
  ],
  "core skills": [
    "Design and simulate a rectifier circuit (AC → DC)",
    "Build a regulated power supply (7805 / buck module)",
    "Interface a sensor with a microcontroller (Arduino/STM32)",
    "Design and test an RC low-pass filter",
  ],
  advanced: [
    "Design a buck or boost converter",
    "Implement PWM motor speed control",
    "Create a custom PCB for a small sensor board",
    "Analyze EMI in a switching power circuit",
  ],
};

function renderMessage(content: string) {
  const parts = content.split(/CODE:|END CODE/);

  if (parts.length === 3) {
    const before = parts[0].trim();
    const code = "\n" + parts[1].trim() + "\n";
    const after = parts[2].trim();

    return (
      <div className="space-y-3">
        {before && <p>{before}</p>}

        <div className="relative rounded-xl overflow-hidden bg-slate-900">
          <button
            onClick={() => {
              navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
            className={`absolute top-2 right-2 text-[11px] px-2 py-1 rounded transition ${
              copied
                ? "bg-green-500 text-white"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {copied ? "Copied!" : "Copy"}
          </button>

          <pre className="text-slate-100 pt-8 pb-4 px-4 overflow-x-auto text-xs leading-relaxed">
            <code className="whitespace-pre-wrap leading-relaxed">{code}</code>
          </pre>
        </div>

        {after && <p>{after}</p>}
      </div>
    );
  }

  return <p className="whitespace-pre-wrap">{content}</p>;
}

return (
  <div className="w-full relative">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
      {/* LEFT DARK NAVY PANEL */}
      {/*<div className="hidden lg:block lg:col-span-1 bg-[#020617] rounded-2xl" />*/}

      {/* MAIN */}
      <motion.div
          animate={{
            marginRight: showAI ? "520px" : "0px",
            maxWidth: showAI ? "calc(100% - 520px)" : "100%",
          }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="mx-auto w-full max-w-[1600px] space-y-10 lg:col-span-11 px-4 md:px-8 pt-0"
        >

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
            ›{" "}
            <span className="text-blue-600 font-medium">
              {phaseLabel}
            </span>{" "}
            › {topic.title}
          </p>

          <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-600">
            {phaseLabel}
          </span>
        </div>

        <h1 className="text-4xl font-extrabold">{topic.title}</h1>

        {/* AI Explanation */}
        <div className="relative overflow-hidden rounded-3xl p-8 
          
          bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 
          text-white shadow-[0_30px_80px_rgba(37,99,235,0.45)]">
          <h3 className="font-semibold mb-3 text-lg tracking-wide flex items-center gap-3 relative z-10">
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

          <p className="text-sm leading-relaxed text-blue-50/90 max-w-3xl">
            {topic.explanation}
          </p>

          <button
            onClick={() => { setShowAI(true); setAiMode("chat"); loadChatSessions(); setActiveSessionId(null); setMessages([]); }}
            className="mt-6 bg-white text-blue-600 px-5 py-2.5 rounded-xl text-xs font-semibold
            border border-blue-200 transition-all duration-200
            hover:-translate-y-[2px] hover:shadow-md
            flex items-center gap-2"
          >
            <img src="/bluesparkle.png" className="w-6 h-6" />
            Ask AI a Question
          </button>
        </div>

        {/* What You'll Learn */}
        <div className="rounded-2xl p-6 bg-[#000926] border border-blue-900/40 text-white shadow-[0_6px_16px_rgba(0,9,38,0.35)]">
          <div 
            onClick={() => setOpenLearn(!openLearn)} 
            className="flex items-center justify-between cursor-pointer group transition-all duration-300
            hover:drop-shadow-[0_0_25px_rgba(79,131,255,0.45)]"
          >
            <h3 className="flex items-center gap-2">
              📘 What You’ll Learn
              <span className="text-xs text-blue-400 ml-2">
                {topic.checklist?.length || 0} items
              </span>
            </h3>
            <motion.span
              animate={{ rotate: openPractice ? 180 : 0 }}
              transition={{ duration: 0.25 }}
              className="text-[#A6C5D7] group-hover:text-[#4F83FF] transition"
            >
              ▾
            </motion.span>
          </div>

          {openLearn && (
            <ul className="mt-4 space-y-2">
              {(topic.checklist || []).map((item, i) => {
                // create a subslug from the item text
                const subslug = item
                  .toLowerCase()
                  .replace(/’/g, "")      // remove curly apostrophe
                  .replace(/'/g, "")      // remove normal apostrophe
                  .replace(/[^\w\s-]/g, "") // remove symbols like ×, =, etc.
                  .replace(/\s+/g, "-");  // spaces -> dashes

                return (
                  <Link
                    key={i}
                    href={`/roadmap/${slug}/learn/${subslug}`}
                    className="block"
                  >
                    <motion.li
                      whileHover={{ scale: 1.04 }}
                      className="bg-[#000926] border border-[#0F52BA] rounded-2xl px-4 py-3 cursor-pointer
                      transition-all duration-300 group
                      hover:border-[#4F83FF]
                      hover:shadow-[0_0_25px_rgba(79,131,255,0.45)]
                      hover:scale-[1.01]"
                    >
                      <span className="text-[#D6E6F3] group-hover:text-blue-400 transition">
                        ➜ {item}
                      </span>
                    </motion.li>
                  </Link>
                );
              })}
            </ul>
          )}
        </div>
        
        {/* Practice */}
        <div className="rounded-2xl p-6 bg-[#000926] border border-blue-900/40 text-white shadow-[0_6px_16px_rgba(0,9,38,0.35)]">
          <div className="flex justify-between cursor-pointer" onClick={() => setOpenPractice(!openPractice)}>
            <h3>💡 Practice Ideas & Mini Projects</h3>
            <motion.span
              animate={{ rotate: openPortfolio ? 180 : 0 }}
              transition={{ duration: 0.25 }}
              className="text-blue-400 group-hover:text-blue-300"
            >
              ▾
            </motion.span>
          </div>

          {openPractice && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {(PRACTICE_IDEAS_BY_PHASE[phaseLabel.toLowerCase() as "foundation" | "core skills" | "advanced"] || []).map(
                (idea, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.04 }}
                  className="bg-[#000926] border border-[#0F52BA] rounded-2xl p-5 flex gap-4
                  transition-all duration-300 group
                  hover:border-[#4F83FF]
                  hover:shadow-[0_6px_18px_rgba(79,131,255,0.35)]
                  hover:scale-[1.01]"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                    {i + 1}
                  </span>
                  <span className="text-[#D6E6F3] group-hover:text-blue-400 transition">
                    {idea}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Portfolio Tips */}
        <div className="rounded-2xl p-6 bg-[#000926] border border-blue-900/40 text-white shadow-[0_6px_16px_rgba(0,9,38,0.35)]">
          <div className="flex justify-between cursor-pointer" onClick={() => setOpenPortfolio(!openPortfolio)}>
            <h3>🎯 Portfolio Improvement Tips</h3>
            <motion.span
              animate={{ rotate: openLearn ? 180 : 0 }}
              transition={{ duration: 0.25 }}
              className="text-blue-400 group-hover:text-blue-300"
            >
              ▾
            </motion.span>
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
                  className="bg-[#000926] border border-[#0F52BA] rounded-2xl px-4 py-3 flex gap-3 items-center
                  transition-all duration-300 group
                  hover:border-[#4F83FF]
                  hover:shadow-[0_6px_16px_rgba(79,131,255,0.3)]
                  hover:scale-[1.005]"
                >
                  <span className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <img src="/whitetick.png" className="w-7 h-7" />
                  </span>
                  <span className="text-[#D6E6F3] group-hover:text-blue-400 transition">
                    {tip}
                  </span>
                </motion.li>
              ))}
            </ul>
          )}
        </div>

          <div className="rounded-2xl bg-blue-50 border border-blue-200 px-5 py-4 flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-blue-600 font-medium">Up Next in Your Journey</p>
              <p className="font-semibold text-slate-900">
                {nextTopic ? nextTopic.title : "You're all caught up 🎉"}
              </p>
            </div>

            <button
              onClick={() => {
                if (!nextTopic) return;

                const slugify = (s: string) =>
                  s
                    .toLowerCase()
                    .trim()
                    .replace(/['"]/g, "")
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, "");

                router.push(`/roadmap/${slugify(nextTopic.title)}`);
              }}
              className="text-blue-600 text-sm font-semibold hover:underline flex items-center gap-1"
            >
              Continue →
            </button>
          </div>

        {/* Bottom CTA */}
          <div className="rounded-2xl bg-[#EAF4FF] p-6 border border-[#A6C5D7]">
            <motion.button
              onClick={markComplete}
              className="w-full mb-3 py-3.5 rounded-xl bg-white text-blue-600 font-semibold
              border border-blue-300 transition-all duration-200
              hover:bg-[#000926] hover:text-white
              hover:-translate-y-[2px] hover:shadow-md
              flex items-center justify-center gap-3 group"
            >
              <img src="/bluetick.png" className="w-8 h-8 group-hover:hidden" />
              <img src="/whitetick.png" className="w-8 h-8 hidden group-hover:block" />
              Mark as Complete
            </motion.button>

            <button
              onClick={() => {
                setShowAI(true);
                setAiMode("chat");
                loadChatSessions();     // 🔥 this is what was missing
                setActiveSessionId(null);
                setMessages([]);
              }}
              className="w-full py-3.5 rounded-xl bg-white text-blue-600 font-semibold
              border border-blue-300 transition-all duration-200
              hover:bg-[#000926] hover:text-white
              hover:-translate-y-[2px] hover:shadow-md
              flex items-center justify-center gap-3 group"
            >
              <img src="/bluesparkle.png" className="w-8 h-8 group-hover:hidden" />
              <img src="/whitesparkle.png" className="w-8 h-8 hidden group-hover:block" />
              Ask AI for Help
            </button>
          </div>
          
      {/* AI CHATBOT */}
      <AnimatePresence>
        {showAI && (
          <motion.aside
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 80, opacity: 0 }}
            className="fixed -top-11 right-0 bottom-0 w-[520px] bg-[#EEF5FF] border-l border-blue-300 shadow-xl z-40 flex flex-col"
          >
            <div className="bg-blue-600 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.img
                    src="/whitebot.png"
                    className="w-14 h-14"
                    animate={{ y: [-4, 4, -4] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                  <div>
                    <p className="font-semibold text-white text-sm">
                      AI Learning Assistant
                    </p>
                    <p className="text-xs text-white/80">
                      Always here to help you learn
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => {
                      setShowHistory((v) => {
                        const next = !v;
                        if (next) loadChatSessions(); // 🔥 load when opening history
                        return next;
                      });
                    }}
                    className="text-white/90 hover:text-white text-xs border border-white/40 px-3 py-1 rounded-full hover:bg-white/20 transition"
                  >
                    {showHistory ? "Hide history ▲" : "Show history ▼"}
                  </button>

                  <button
                    onClick={async () => {
                      setActiveSessionId(null);
                      setMessages([]);
                      await loadChatSessions();
                    }}
                    className="text-white text-xs border border-white/40 px-3 py-1 rounded-full hover:bg-white/20 transition"
                  >
                    + New Chat
                  </button>

                  <button
                    onClick={() => setShowAI(false)}
                    className="text-white transition-transform duration-700 hover:rotate-90"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

              {showHistory && (
                <>
                {loadingSessions && (
                  <p className="text-xs text-slate-400">Loading chats…</p>
                )}

                {!loadingSessions && chatSessions.length === 0 && (
                  <p className="text-xs text-slate-400">No chats yet</p>
                )}
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-b border-blue-200 p-3 text-xs space-y-3 overflow-hidden bg-white/70 max-h-[240px] overflow-y-auto"
                >
                  <button
                    onClick={async () => {
                      const token = getToken();
                      if (!token) return;

                      const ok = confirm("Delete ALL chats for this topic? This cannot be undone.");
                      if (!ok) return;

                      await fetch(
                        `${API_BASE}/roadmap/topic/chat/sessions?topic_title=${encodeURIComponent(title)}`,
                        {
                          method: "DELETE",
                          headers: { Authorization: `Bearer ${token}` },
                        }
                      );

                      setActiveSessionId(null);
                      setMessages([]);
                      loadChatSessions();
                    }}
                    className="mb-2 text-[11px] text-red-600 hover:underline"
                  >
                    🗑️ Delete all chats for this topic
                  </button>

                  {Object.entries(groupedSessions).map(([label, sessions]) => (
                    <div key={label}>
                      <p className="font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        {label}
                      </p>

                      <div className="space-y-1">
                        {(sessions as ChatSession[]).map((s) => (
                          <div
                            key={s.id}
                            className={`group flex items-center justify-between w-full px-3 py-2 rounded-lg transition
                              ${activeSessionId === s.id ? "bg-blue-100" : "hover:bg-blue-100"}
                              ${s.is_pinned ? "border border-yellow-300/50 bg-yellow-50/40" : ""}`}
                          >
                            {/* LEFT: click to open chat */}
                            <button
                              onClick={async () => {
                                setActiveSessionId(s.id);

                                const token = getToken();
                                if (!token) return;

                                const res = await fetch(
                                  `${API_BASE}/roadmap/topic/chat?title=${encodeURIComponent(title)}&session_id=${s.id}`,
                                  { headers: { Authorization: `Bearer ${token}` } }
                                );

                                const data = await res.json();
                                setMessages(data.messages || []);
                              }}
                              className="flex-1 text-left"
                            >
                              <p className="font-medium text-slate-700 truncate flex items-center gap-2">
                                {s.preview_title || "Chat Session"}

                                {/* 📌 show pin icon ONLY if pinned */}
                                {s.is_pinned && (
                                  <img
                                    src="/pin.png"
                                    className="w-3.5 h-3.5 opacity-80"
                                    title="Pinned chat"
                                  />
                                )}
                              </p>

                              <p className="text-[10px] text-slate-400">
                                {new Date(s.created_at).toLocaleTimeString()}
                              </p>
                            </button>

                            {/* RIGHT: 3 dots menu */}
                            <div className="flex items-center gap-1 relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === s.id ? null : s.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-800 transition px-2"
                              >
                                ⋯
                              </button>

                              {openMenuId === s.id && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 top-7 z-50 w-40 bg-white rounded-lg shadow-lg border text-xs overflow-hidden"
                                >
                                  <button
                                    onClick={async () => {
                                      const token = getToken();
                                      if (!token) return;

                                      try {
                                        const res = await fetch(
                                          `${API_BASE}/roadmap/topic/chat/session/pin/${s.id}`,
                                          { method: "POST", headers: { Authorization: `Bearer ${token}` } }
                                        );

                                        if (!res.ok) {
                                          const data = await res.json();
                                          alert(data?.detail || "You can only pin up to 3 chats.");
                                          return;
                                        }

                                        setOpenMenuId(null);
                                        await loadChatSessions();
                                      } catch {
                                        alert("Pin failed. Try again.");
                                      }
                                    }}
                                    disabled={!s.is_pinned && pinnedCount >= 3}
                                    className={`flex items-center gap-2 w-full px-3 py-2 text-left
                                      ${!s.is_pinned && pinnedCount >= 3
                                        ? "opacity-40 cursor-not-allowed"
                                        : "hover:bg-blue-50"
                                      }
                                    `}
                                  >
                                    <img src={s.is_pinned ? "/unpin.png" : "/pin.png"} className="w-4 h-4" />
                                    {s.is_pinned ? "Unpin chat" : "Pin chat"}
                                  </button>

                                  {/* Delete */}
                                  <button
                                    onClick={async () => {
                                      const token = getToken();
                                      if (!token) return;

                                      await fetch(`${API_BASE}/roadmap/topic/chat/session/${s.id}`, {
                                        method: "DELETE",
                                        headers: { Authorization: `Bearer ${token}` },
                                      });

                                      setOpenMenuId(null);
                                      await loadChatSessions();

                                      if (activeSessionId === s.id) {
                                        setActiveSessionId(null);
                                        setMessages([]);
                                      }
                                    }}
                                    className="flex items-center gap-2 w-full px-3 py-2 hover:bg-red-50 text-red-600 text-left"
                                  >
                                    <img src="/bin.png" className="w-4 h-4" />
                                    Delete chat
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </motion.div>
              </>
              )}

            <motion.div
            layout
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex-1 p-4 pt-2 overflow-y-auto space-y-4 text-sm scroll-smooth"
          >
            {messages.map((m, i) => (
            <div
              key={m.id || `${m.role}-${i}`}
              className={`flex gap-3 items-start ${m.role === "user" ? "justify-end" : ""}`}
            >
              {/* Assistant avatar */}
              {m.role === "assistant" && (
                <span className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                  <img src="/bluebot.png" className="w-8 h-8" />
                </span>
              )}

              {/* Message + reactions column */}
              <div className="flex flex-col max-w-[85%]">
                {/* Message bubble */}
                <div
                  className={`px-4 py-3 rounded-2xl inline-block max-w-full break-words whitespace-pre-wrap leading-relaxed text-[13px] ${
                    m.role === "assistant"
                      ? "bg-blue-600 text-white"
                      : "bg-white border text-slate-800"
                  }`}
                  style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                >
                  {m.content
                    ? renderMessage(m.content)
                    : isStreaming && m.role === "assistant" && (
                        <div className="flex items-center gap-1 h-5">
                          <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                      )}
                </div>

                {/* Reactions BELOW the bubble */}
                {m.role === "assistant" && !isStreaming && (
                  <div className="flex gap-2 mt-2 ml-2">
                    <img
                      src="/copy.png"
                      title="Copy"
                      className="w-7 h-7 cursor-pointer opacity-50 hover:opacity-100 hover:scale-110 transition"
                      onClick={() => {
                        navigator.clipboard.writeText(m.content);
                        setShowCopied(true);
                        setTimeout(() => setShowCopied(false), 1200);
                      }}
                    />

                    <img
                      src="/like.png"
                      title="Like"
                      className="w-7 h-7 cursor-pointer opacity-50 hover:opacity-100 hover:scale-110 transition"
                      onClick={() => reactToMessage(m.content, "like")}
                    />

                    <img
                      src="/dislike.png"
                      title="Dislike"
                      className="w-7 h-7 cursor-pointer opacity-50 hover:opacity-100 hover:scale-110 transition"
                      onClick={() => reactToMessage(m.content, "dislike")}
                    />

                    <img
                      src="/regenerate.png"
                      title="Regenerate"
                      className="w-7 h-7 cursor-pointer opacity-50 hover:opacity-100 hover:scale-110 transition"
                      onClick={() =>
                        streamTopicAI(messages[messages.length - 2]?.content || "")
                      }
                    />
                  </div>
                )}
              </div>

              {/* User avatar */}
              {m.role === "user" && (
                <span className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                  <img src="/person.png" className="w-7 h-7" />
                </span>
              )}
            </div>
          ))}

            <div ref={messagesEndRef} />
          </motion.div>
            
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
    </motion.div>
    </div>
  </div>
)
}