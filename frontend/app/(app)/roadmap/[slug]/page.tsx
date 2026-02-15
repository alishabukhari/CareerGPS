"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getToken } from "@/lib/auth";

const API_BASE = "http://127.0.0.1:8000";

type TopicData = {
  title: string;
  phase: string;
  why: string;
  explanation: string;
  checklist: string[];
};

export default function TopicDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = decodeURIComponent(params.slug as string);

  const [topic, setTopic] = useState<TopicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFetched = useRef(false); // 🔥 prevents double fetch bug

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
        setLoading(true);
        setError(null);

        const res = await fetch(
          `${API_BASE}/roadmap/topic?title=${encodeURIComponent(slug)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text);
        }

        const data = await res.json();
        setTopic(data);
      } catch (err) {
        console.error("❌ Topic fetch failed:", err);
        setError("Failed to load topic.");
      } finally {
        setLoading(false);
      }
    };

    loadTopic();
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

      router.push("/roadmap");
    } catch {
      alert("Failed to mark complete");
    } finally {
      setMarking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#D6E6F3]">
        <p className="text-[#000926] animate-pulse">Loading topic…</p>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#D6E6F3]">
        <button onClick={() => router.push("/roadmap")} className="text-[#0F52BA] underline">
          ← Back to roadmap
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#D6E6F3] px-8 py-12">
      <div className="max-w-4xl mx-auto">

        <button onClick={() => router.push("/roadmap")} className="mb-6 text-sm text-[#0F52BA] hover:underline">
          ← Back to roadmap
        </button>

        <motion.h1 className="text-4xl font-extrabold mb-2" style={{ color: "#000926" }}>
          📘 {topic.title}
        </motion.h1>

        <p className="mb-8 text-[#1E293B]">
          Phase: <span className="font-medium">{topic.phase}</span>
        </p>

        <div className="rounded-2xl p-6 mb-8 bg-[#000926] text-[#D6E6F3]">
          <h3 className="font-semibold mb-2">✨ Why this matters</h3>
          <p className="text-sm">{topic.why}</p>
        </div>

        <div className="rounded-2xl p-6 mb-8 bg-white">
          <h3 className="font-semibold mb-2">🤖 AI Explanation</h3>
          <p className="text-sm">{topic.explanation}</p>
        </div>

        <div className="rounded-2xl p-6 mb-8 bg-white">
          <h3 className="font-semibold mb-4">✅ Practice Checklist</h3>
          <ul className="space-y-2 text-sm">
            {topic.checklist.map((item, idx) => (
              <li key={idx}>• {item}</li>
            ))}
          </ul>
        </div>

        {/* Step 2.2 */}
        <div className="rounded-2xl p-6 mb-8 bg-[#0F52BA] text-white">
          <h3 className="font-semibold mb-1">🚀 Pro Tip</h3>
          <p className="text-sm">Don’t just read — build something tiny today.</p>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.03 }}
          onClick={markComplete}
          disabled={marking}
          className="w-full py-4 rounded-xl font-semibold text-white bg-[#0F52BA]"
        >
          {marking ? "Saving..." : "Mark Topic as Complete →"}
        </motion.button>

        {/* Step 2.3 */}
        <button
          onClick={() => router.push("/roadmap")}
          className="mt-4 text-sm text-[#0F52BA] hover:underline w-full text-center"
        >
          ← Back to Roadmap
        </button>
      </div>
    </div>
  );
}