"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getToken } from "@/lib/auth";

type RoadmapItem = {
  title: string;
  type: string;
  estimated_weeks: number;
  why: string;
};

type RoadmapPhase = {
  phase: string;
  description: string;
  items: RoadmapItem[];
};

type Roadmap = {
  target_role: string;
  phases: RoadmapPhase[];
};

const API_BASE = "http://127.0.0.1:8000";

export default function RoadmapPage() {
  const router = useRouter();

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);

  const parseRoadmap = (raw: any): Roadmap => {
    if (typeof raw === "string") {
      return JSON.parse(raw);
    }
    return raw;
  };

  const loadRoadmap = async () => {
  setLoading(true);
  setErrorMsg(null);

  const token = getToken();
  if (!token) {
    router.push("/login");
    setLoading(false);
    return;
  }

  try {
    const [roadmapRes, completedRes] = await Promise.all([
      fetch(`${API_BASE}/roadmap`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${API_BASE}/roadmap/completed`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    const roadmapData = await roadmapRes.json();
    const completedData = await completedRes.json();

    setRoadmap(roadmapData);
    setCompleted(completedData.completed || []);
  } catch (err: any) {
    console.error("Roadmap error:", err);
    setErrorMsg("Failed to load roadmap");
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    loadRoadmap();
  }, [mounted, router]);

  const toggleComplete = async (title: string) => {
  const token = getToken();
  if (!token) return;

  console.log("Sending title:", title); // 👈 add this log once

  const res = await fetch("http://localhost:8000/roadmap/complete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title }), // ✅ must be { title: "HTML & CSS Basics" }
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Complete error:", data);
    return;
  }

  setCompleted(data.completed);
};


  const allItems = useMemo(() => {
    if (!roadmap) return [];
    return roadmap.phases.flatMap((p) =>
      p.items.map((item) => ({
        phase: p.phase,
        item,
        key: `${p.phase}-${item.title}`,
      }))
    );
  }, [roadmap]);

  console.log("Roadmap state:", roadmap);
  console.log("Loading:", loading);
  console.log("Error:", errorMsg);

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F9FC] px-6">
        <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <p className="text-lg text-[#6B7280] animate-pulse">
            Preparing your dashboard…
          </p>
          <div className="mt-6 space-y-3">
            <div className="h-4 bg-gray-100 rounded w-5/6 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-4/6 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-3/6 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F9FC] px-6">
        <div className="w-full max-w-xl bg-white border border-red-200 rounded-2xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-[#1F2937] mb-2">
            Couldn’t load your roadmap
          </h2>
          <p className="text-[#6B7280] mb-6">{errorMsg}</p>

          <button
            onClick={loadRoadmap}
            className="px-5 py-3 rounded-xl bg-[#2563EB] text-white font-semibold hover:opacity-95"
          >
            Retry
          </button>

          <p className="text-xs text-[#6B7280] mt-4">
            Tip: confirm backend is running at {API_BASE} and CORS allows
            localhost:3000.
          </p>
        </div>
      </div>
    );
  }

  if (!roadmap) return null;

  const weeklyTasks = allItems.slice(0, 5);
  const totalItems = allItems.length;

  const completedCount = completed.length;

  const progress =
    totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

 return (
  <div className="min-h-screen bg-slate-50 px-8 py-12">
    <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">

      {/* MAIN CONTENT */}
      <div className="lg:col-span-8">
        {/* Title */}
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
          🧭 {roadmap.target_role}
        </h1>
        <p className="text-slate-600 max-w-3xl mb-10">
          Your AI-powered learning system — structured, calm, and designed to compound over time.
        </p>

        {/* Progress */}
        <div className="mb-10">
          <p className="text-sm text-slate-600 mb-2">Overall Progress</p>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">{progress}% completed</p>
        </div>

        {/* Today’s Focus */}
        <div className="rounded-2xl bg-sky-50 border border-sky-200 p-6 mb-12">
          <h3 className="font-semibold text-slate-900 mb-1">🔥 Today’s Focus</h3>
          {allItems[0] ? (
            <p className="text-sm text-slate-700">
              Focus on <span className="font-medium">{allItems[0].item.title}</span> ({allItems[0].phase})
            </p>
          ) : (
            <p className="text-sm text-slate-700">You’re all caught up 🎉</p>
          )}
        </div>

        {/* Weekly Focus */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">🗓 This Week’s Focus</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {weeklyTasks.map(({ phase, item, key }) => {
              const isDone = completed.includes(item.title);

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="rounded-2xl bg-white border border-slate-200 p-6 flex justify-between items-center hover:shadow-md transition"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      📘 {item.title}
                    </h3>
                    <p className="text-sm text-slate-600">🧩 {phase}</p>
                  </div>

                  {/* ✅ Chef’s kiss motion button */}
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => toggleComplete(item.title)}
                    className={`h-9 w-9 rounded-full flex items-center justify-center border transition ${
                      isDone
                        ? "bg-emerald-500 text-white border-emerald-500 shadow"
                        : "border-slate-300 text-slate-400 hover:bg-emerald-50 hover:border-emerald-300"
                    }`}
                  >
                    ✓
                  </motion.button>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Phases */}
        {roadmap.phases.map((phase) => (
          <section key={phase.phase} className="mb-20">
            <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              🧩 {phase.phase}
            </h2>
            <p className="text-slate-600 mb-6 max-w-3xl">
              {phase.description}
            </p>
          </section>
        ))}
      </div>

      {/* SIDEBAR */}
      <aside className="lg:col-span-4 space-y-8">
        <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-1">🧠 AI Tip</h3>
          <p className="text-sm text-slate-600">
            Consistency beats intensity. Do a little every day.
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6">
          <h3 className="font-semibold text-emerald-800 mb-1">✅ Step 1 done</h3>
          <p className="text-sm text-emerald-700">
            Next: persist progress + real completion tracking.
          </p>
        </div>
      </aside>
    </div>
  </div>
);
}
