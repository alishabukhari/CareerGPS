"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getToken } from "@/lib/auth";
import { theme } from "@/styles/theme";

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
      setLoading(false);
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

    const res = await fetch(`${API_BASE}/roadmap/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Complete error:", data);
      return;
    }

    setCompleted(data.completed);
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

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: currentTheme.bg }}>
        <p style={{ color: currentTheme.accent }}>Loading roadmap…</p>
      </div>
    );
  }

  if (errorMsg) {
    return <div style={{ color: "red" }}>{errorMsg}</div>;
  }

  if (!roadmap) return null;

  const weeklyTasks = allItems.slice(0, 5);
  const progress = stats?.percent ?? 0;

 return (
  <div
    className="min-h-screen px-8 py-12"
    style={{ backgroundColor: "#D6E6F3" }} // Ice Blue background
  >
    <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
      <div className="lg:col-span-8">
        <h1
          className="text-4xl font-extrabold tracking-tight mb-2"
          style={{ color: "#000926" }} // Deep Navy text
        >
          🧭 {roadmap.target_role}
        </h1>

        <p className="max-w-3xl mb-10" style={{ color: "#1E293B" }}>
          Your AI-powered learning system — structured, calm, and designed to compound over time.
        </p>

        {/* Progress */}
        <div className="mb-10">
          <p className="text-sm mb-2" style={{ color: "#1E293B" }}>
            Overall Progress
          </p>

          <div
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: "#A6C5D7" }} // Powder Blue track
          >
            <div
              className="h-full transition-all"
              style={{
                width: `${progress}%`,
                backgroundColor: "#0F52BA", // Sapphire progress
              }}
            />
          </div>

          <p className="text-xs mt-2" style={{ color: "#1E293B" }}>
            {stats?.completed}/{stats?.total} completed • {stats?.percent ?? 0}%
          </p>
        </div>

        {/* Today’s Focus */}
        <div
          className="rounded-2xl p-6 mb-12"
          style={{
            backgroundColor: "#000926", // Deep Navy card
            border: "1px solid #0F52BA",
            color: "#D6E6F3", // Ice Blue text
          }}
        >
          <h3 className="font-semibold mb-1">🔥 Today’s Focus</h3>

          {today?.title ? (
            <p className="text-sm" style={{ color: "#D6E6F3" }}>
              Focus on <span className="font-medium">{today.title}</span> ({today.phase})
            </p>
          ) : (
            <p className="text-sm" style={{ color: "#D6E6F3" }}>
              You’re all caught up 🎉
            </p>
          )}
        </div>

        {/* Weekly Focus */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold mb-6" style={{ color: "#000926" }}>
            🗓 This Week’s Focus
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {weeklyTasks.map(({ phase, item, key }) => {
              const isDone = completed.includes(item.title);

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="rounded-2xl p-6 flex justify-between items-center"
                  style={{
                    backgroundColor: "#000926", // Deep Navy cards
                    border: "1px solid #0F52BA",
                  }}
                >
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: "#D6E6F3" }}>
                      📘 {item.title}
                    </h3>
                    <p className="text-sm" style={{ color: "#A6C5D7" }}>
                      🧩 {phase}
                    </p>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => toggleComplete(item.title)}
                    className="h-9 w-9 rounded-full flex items-center justify-center border transition"
                    style={{
                      backgroundColor: isDone ? "#0F52BA" : "transparent", // Sapphire done
                      color: "#D6E6F3",
                      borderColor: isDone ? "#0F52BA" : "#A6C5D7",
                    }}
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
            <h2 className="text-2xl font-bold mb-2" style={{ color: "#000926" }}>
              🧩 {phase.phase}
            </h2>
            <p className="mb-6 max-w-3xl" style={{ color: "#1E293B" }}>
              {phase.description}
            </p>
          </section>
        ))}
      </div>

      {/* Sidebar */}
      <aside className="lg:col-span-4 space-y-8">
        <div
          className="rounded-2xl p-6 shadow-sm"
          style={{
            backgroundColor: "#000926",
            border: "1px solid #0F52BA",
            color: "#D6E6F3",
          }}
        >
          <h3 className="font-semibold mb-1">🧠 AI Tip</h3>
          <p className="text-sm" style={{ color: "#D6E6F3" }}>
            Consistency beats intensity. Do a little every day.
          </p>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: "#000926",
            border: "1px solid #0F52BA",
          }}
        >
          <h3 className="font-semibold mb-1" style={{ color: "#D6E6F3" }}>
            ✅ Step 1 done
          </h3>
          <p className="text-sm" style={{ color: "#A6C5D7" }}>
            Next: persist progress + real completion tracking.
          </p>
        </div>
      </aside>
    </div>
  </div>
);
}
