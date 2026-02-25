"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getToken } from "@/lib/auth";

const API_BASE = "http://127.0.0.1:8000";

type ChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
};

type ChatSession = {
  id: string;
  preview_title: string | null;
  created_at: string;
  is_pinned?: boolean | null;
};

function groupSessionsByDate(sessions: ChatSession[]) {
  const groups: Record<string, ChatSession[]> = {};

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  const sortedSessions = [...sessions].sort((a, b) => {
    const pinDiff = Number(!!b.is_pinned) - Number(!!a.is_pinned);
    if (pinDiff !== 0) return pinDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  sortedSessions.forEach((s) => {
    const dateStr = new Date(s.created_at).toDateString();
    let label = "Older";
    if (dateStr === today) label = "Today";
    else if (dateStr === yesterday) label = "Yesterday";
    if (!groups[label]) groups[label] = [];
    groups[label].push(s);
  });

  return groups;
}

function chatSessionStorageKey(topicTitle: string) {
  return `cgps:chatSession:${topicTitle.toLowerCase()}`;
}

export default function AiSidePanel({
  isOpen,
  onClose,
  topicTitle,
}: {
  isOpen: boolean;
  onClose: () => void;
  topicTitle: string;
}) {
  const [copied, setCopied] = useState(false);
  const [showCopied, setShowCopied] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const groupedSessions = useMemo(
    () => groupSessionsByDate(chatSessions),
    [chatSessions]
  );

  const pinnedCount = useMemo(
    () => chatSessions.filter((s) => s.is_pinned).length,
    [chatSessions]
  );

  // Close 3-dot menu on outside click
  useEffect(() => {
    const close = () => setOpenMenuId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Restore active chat session for this topic (so chat continues across pages)
  useEffect(() => {
    if (!isOpen) return;

    const stored = window.localStorage.getItem(chatSessionStorageKey(topicTitle));
    if (stored) setActiveSessionId(stored);
  }, [isOpen, topicTitle]);

  useEffect(() => {
    if (!activeSessionId) return;
    window.localStorage.setItem(chatSessionStorageKey(topicTitle), activeSessionId);
  }, [activeSessionId, topicTitle]);

  const loadChatSessions = async () => {
    const token = getToken();
    if (!token) return;

    try {
      setLoadingSessions(true);
      const res = await fetch(
        `${API_BASE}/roadmap/topic/chat/sessions?topic_title=${encodeURIComponent(topicTitle)}`,
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

  const loadActiveChatMessages = async (sessionId: string) => {
    const token = getToken();
    if (!token) return;

    const res = await fetch(
      `${API_BASE}/roadmap/topic/chat?title=${encodeURIComponent(topicTitle)}&session_id=${sessionId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    setMessages(data.messages || []);
  };

  // When panel opens: load sessions and load the active session messages if present
  useEffect(() => {
    if (!isOpen) return;

    loadChatSessions().then(async () => {
      const stored = window.localStorage.getItem(chatSessionStorageKey(topicTitle));
      if (stored) {
        setActiveSessionId(stored);
        await loadActiveChatMessages(stored);
      } else {
        setActiveSessionId(null);
        setMessages([]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, topicTitle]);

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
          topic_title: topicTitle,
          message,
          reaction,
        }),
      });
    } catch {}
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
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      let sessionId = activeSessionId;

      // Create session if none (shared across pages)
      if (!sessionId) {
        const res = await fetch(`${API_BASE}/roadmap/topic/chat/session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            topic_title: topicTitle,
            preview_title: userMsg.content,
          }),
        });

        const data = await res.json();
        sessionId = data.session.id;
        setActiveSessionId(sessionId);
        await loadChatSessions();
      }

      const res = await fetch(`${API_BASE}/roadmap/topic/ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic_title: topicTitle,
          session_id: sessionId,
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

  return (
    <AnimatePresence>
      {isOpen && (
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
                  <p className="font-semibold text-white text-sm">AI Learning Assistant</p>
                  <p className="text-xs text-white/80">Always here to help you learn</p>
                </div>
              </div>

              <div className="flex gap-2 items-center">
                <button
                  onClick={() => {
                    setShowHistory((v) => {
                      const next = !v;
                      if (next) loadChatSessions();
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
                    window.localStorage.removeItem(chatSessionStorageKey(topicTitle));
                    setMessages([]);
                    await loadChatSessions();
                  }}
                  className="text-white text-xs border border-white/40 px-3 py-1 rounded-full hover:bg-white/20 transition"
                >
                  + New Chat
                </button>

                <button
                  onClick={onClose}
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
                <p className="text-xs text-slate-400 px-4 pt-2">Loading chats…</p>
              )}

              {!loadingSessions && chatSessions.length === 0 && (
                <p className="text-xs text-slate-400 px-4 pt-2">No chats yet</p>
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
                      `${API_BASE}/roadmap/topic/chat/sessions?topic_title=${encodeURIComponent(topicTitle)}`,
                      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
                    );

                    setActiveSessionId(null);
                    window.localStorage.removeItem(chatSessionStorageKey(topicTitle));
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
                          <button
                            onClick={async () => {
                              setActiveSessionId(s.id);
                              await loadActiveChatMessages(s.id);
                            }}
                            className="flex-1 text-left"
                          >
                            <p className="font-medium text-slate-700 truncate flex items-center gap-2">
                              {s.preview_title || "Chat Session"}
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

                                    const res = await fetch(
                                      `${API_BASE}/roadmap/topic/chat/session/pin/${s.id}`,
                                      { method: "POST", headers: { Authorization: `Bearer ${token}` } }
                                    );

                                    if (!res.ok) {
                                      const data = await res.json();
                                      alert(data?.detail || "Pin failed.");
                                      return;
                                    }

                                    setOpenMenuId(null);
                                    await loadChatSessions();
                                  }}
                                  disabled={!s.is_pinned && pinnedCount >= 3}
                                  className={`flex items-center gap-2 w-full px-3 py-2 text-left
                                    ${!s.is_pinned && pinnedCount >= 3
                                      ? "opacity-40 cursor-not-allowed"
                                      : "hover:bg-blue-50"
                                    }`}
                                >
                                  <img
                                    src={s.is_pinned ? "/unpin.png" : "/pin.png"}
                                    className="w-4 h-4"
                                  />
                                  {s.is_pinned ? "Unpin chat" : "Pin chat"}
                                </button>

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
                                      window.localStorage.removeItem(chatSessionStorageKey(topicTitle));
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
                {m.role === "assistant" && (
                  <span className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <img src="/bluebot.png" className="w-8 h-8" />
                  </span>
                )}

                <div className="flex flex-col max-w-[85%]">
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
              onKeyDown={(e) => {
                if (e.key === "Enter") streamTopicAI(chatInput);
              }}
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
  );
}