"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getToken } from "@/lib/auth";
import { theme } from "@/styles/theme";
import { useRequireProfile } from "@/lib/useRequiredProfile";

const currentTheme = theme.experimental;

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
  const [stats, setStats] = useState<{ completed: number; total: number; percent: number } | null>(null);
  const [today, setToday] = useState<any>(null);


  const parseRoadmap = (raw: any): Roadmap => {
    if (typeof raw === "string") return JSON.parse(raw);
    return raw;
  };

  const loadRoadmap = async () => {
    setLoading(true);
    setErrorMsg(null);

    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const [roadmapRes, completedRes, statsRes, todayRes] = await Promise.all([
        fetch(`${API_BASE}/roadmap`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/roadmap/completed`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/roadmap/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/roadmap/today`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const roadmapData = await roadmapRes.json();
      const completedData = await completedRes.json();
      const statsData = await statsRes.json();
      const todayData = await todayRes.json();

      setRoadmap(parseRoadmap(roadmapData));
      setCompleted(completedData.completed || []);
      setStats(statsData);
      setToday(todayData);
    } catch (err) {
      console.error("Roadmap error:", err);
      setErrorMsg("Failed to load roadmap");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted) return;
    loadRoadmap();
  }, [mounted]);

  const toggleComplete = async (title: string) => {
    const token = getToken();
    if (!token) return;

    await fetch(`${API_BASE}/roadmap/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title }),
    });

    loadRoadmap();
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

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: currentTheme.bg }}>
        <p style={{ color: currentTheme.accent }}>Loading roadmap…</p>
      </div>
    );
  }

  if (errorMsg || !roadmap) return null;

  const weeklyTasks = allItems.slice(0, 4);
  const progress = stats?.percent ?? 0;

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* MAIN */}
        <div className="lg:col-span-8">
          <h1 className="text-4xl font-extrabold mb-2 text-[#000926]">
            🧭 {roadmap.target_role}
          </h1>

          <p className="mb-6 text-[#1E293B]">
            Your AI-powered learning system — structured, calm, and designed to compound over time.
          </p>

          {/* Progress */}
          <div className="mb-8">
            <p className="text-sm mb-2 text-[#1E293B]">Overall Progress</p>
            <div className="w-full h-2 rounded-full bg-[#A6C5D7] overflow-hidden">
              <div
                className="h-full transition-all bg-[#0F52BA]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs mt-2 text-[#1E293B]">
              {stats?.completed}/{stats?.total} completed • {stats?.percent ?? 0}%
            </p>
          </div>

          {/* Today */}
          <div className="rounded-2xl p-6 mb-10 bg-[#000926] text-[#D6E6F3] border border-[#0F52BA]">
            <h3 className="font-semibold mb-1">🔥 Today’s Focus</h3>
            <p className="text-sm">
              {today?.title
                ? <>Focus on <b>{today.title}</b> ({today.phase})</>
                : "You're all caught up 🎉"}
            </p>
          </div>

          {/* Weekly */}
          <h2 className="text-2xl font-bold mb-6 text-[#000926]">🗓 This Week’s Focus</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {weeklyTasks.map(({ phase, item, key }) => {
              const isDone = completed.includes(item.title);

              return (
                <motion.div
                  key={key}
                  className="rounded-2xl p-6 flex justify-between items-center bg-[#000926] border border-[#0F52BA]"
                >
                  <div>
                    <h3
                      className="text-lg font-semibold text-[#D6E6F3] cursor-pointer hover:underline"
                      onClick={() => router.push(`/roadmap/${encodeURIComponent(item.title)}`)}
                    >
                      📘 {item.title}
                    </h3>
                    <p className="text-xs mt-1 text-[#A6C5D7]">🧩 {phase}</p>
                  </div>

                  <button
                    onClick={() => toggleComplete(item.title)}
                    className="h-9 w-9 rounded-full border flex items-center justify-center text-[#D6E6F3]"
                    style={{
                      backgroundColor: isDone ? "#0F52BA" : "transparent",
                      borderColor: isDone ? "#0F52BA" : "#A6C5D7",
                    }}
                  >
                    ✓
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl p-6 bg-[#000926] text-[#D6E6F3] border border-[#0F52BA]">
            🧠 Consistency beats intensity. Do a little every day.
          </div>

          <div className="rounded-2xl p-6 bg-[#000926] text-[#D6E6F3] border border-[#0F52BA]">
            ✅ Step 1 done  
            <br />
            <span className="text-[#A6C5D7]">Next: persist progress + real tracking</span>
          </div>
        </aside>
      </div>
    </div>
  );
}