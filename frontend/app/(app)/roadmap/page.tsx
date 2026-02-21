"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { clearToken, getToken } from "@/lib/auth";
import { theme } from "@/styles/theme";
import { useRequireProfile } from "@/lib/useRequiredProfile";
import { markTaskComplete } from "@/lib/roadmapApi";
import confetti from "canvas-confetti";

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
  const isReady = mounted && roadmap;

  const parseRoadmap = (raw: any): Roadmap => {
    if (typeof raw === "string") return JSON.parse(raw);
    return raw;
  };
  
const loadRoadmap = async (silent = false) => {
  if (!silent) setLoading(true);
  setErrorMsg(null);

  const token = getToken();
  if (!token) {
    router.push("/login");
    return;
  }

  try {
    const results = await Promise.allSettled([
      fetch(`${API_BASE}/roadmap`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE}/roadmap/completed`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE}/roadmap/stats`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE}/roadmap/today`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    const roadmapRes   = results[0].status === "fulfilled" ? results[0].value : null;
    const completedRes = results[1].status === "fulfilled" ? results[1].value : null;
    const statsRes     = results[2].status === "fulfilled" ? results[2].value : null;
    const todayRes     = results[3].status === "fulfilled" ? results[3].value : null;

    // 🔒 Handle auth failure gracefully
    const authFailed = [roadmapRes, completedRes, statsRes, todayRes]
      .some(res => res && (res.status === 401 || res.status === 403));

    if (authFailed) {
      clearToken();
      router.push("/login");
      return;
    }

    if (roadmapRes?.ok) {
      const roadmapData = await roadmapRes.json();
      setRoadmap(parseRoadmap(roadmapData));
    }

    if (completedRes?.ok) {
      const completedData = await completedRes.json();
      setCompleted(completedData.completed || []);
    }

    if (statsRes?.ok) {
      const statsData = await statsRes.json();
      setStats(statsData);
    }

    if (todayRes?.ok) {
      const todayData = await todayRes.json();
      setToday(todayData);
    }

  } catch (err) {
    console.error("loadRoadmap failed:", err);
    setErrorMsg("Failed to load roadmap");
  } finally {
    if (!silent) setLoading(false);
  }
};

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted) return;
    loadRoadmap();
  }, [mounted]);


  const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const toggleComplete = async (title: string) => {
  const token = getToken();
  if (!token) {
    router.push("/login");
    return;
  }
 // ✅ instant UI update
    setCompleted((prev) =>
    prev.includes(title)
      ? prev.filter((t) => t !== title)
      : [...prev, title]
  );
  
    // 🔄 quiet refresh (no flicker)
  setTimeout(() => {
    loadRoadmap(true);   // 👈 silent refresh
  }, 300);

  try {
    await fetch(`${API_BASE}/roadmap/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: title.trim() }),
    });
  } catch (err) {
    console.error("Toggle complete failed:", err);
  }
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

  type StageKey = "foundation" | "core" | "advanced";

const normalizeStageFromPhase = (phaseName: string): StageKey | null => {
  const s = (phaseName || "").toLowerCase();

  // explicit labels (future-proof if backend prompt is fixed)
  if (s.includes("foundation")) return "foundation";
  if (s.includes("core")) return "core";
  if (s.includes("advanced")) return "advanced";

  // common AI formats
  // "Phase 1: Fundamentals..." / "Phase 2: ..." / "Phase 3: ..."
  const phaseNumMatch = s.match(/phase\s*(\d+)/i);
  if (phaseNumMatch) {
    const n = Number(phaseNumMatch[1]);
    if (n === 1) return "foundation";
    if (n === 2) return "core";
    if (n === 3) return "advanced";
  }

  // "Beginner / Intermediate / Advanced"
  if (s.includes("beginner") || s.includes("fundamentals") || s.includes("basics")) return "foundation";
  if (s.includes("intermediate")) return "core";
  if (s.includes("expert") || s.includes("senior")) return "advanced";

  return null;
};

const splitPhasesIntoStages = (phases: RoadmapPhase[] | undefined) => {
  const out: Record<StageKey, RoadmapPhase | null> = {
    foundation: null,
    core: null,
    advanced: null,
  };

  if (!phases || phases.length === 0) return out;

  // 1) Try explicit mapping per phase name
  for (const p of phases) {
    const k = normalizeStageFromPhase(p.phase);
    if (k && !out[k]) out[k] = p;
  }

  // 2) Fallback: if still missing and we have >= 3 phases, map by order
  if ((!out.foundation || !out.core || !out.advanced) && phases.length >= 3) {
    out.foundation ??= phases[0];
    out.core ??= phases[1];
    out.advanced ??= phases[2];
  }

  // 3) Fallback: if only 1–2 phases exist, distribute items (rare)
  // (keeps UI from being empty)
  if (phases.length === 1) {
    out.foundation ??= phases[0];
  }
  if (phases.length === 2) {
    out.foundation ??= phases[0];
    out.core ??= phases[1];
  }

  return out;
};


// ✅ TS-safe item arrays
const stagePhases = useMemo(() => splitPhasesIntoStages(roadmap?.phases), [roadmap]);

const foundationPhase = stagePhases.foundation;
const corePhase = stagePhases.core;
const advancedPhase = stagePhases.advanced;

const foundationItems: RoadmapItem[] = foundationPhase?.items ?? [];
const coreItems: RoadmapItem[] = corePhase?.items ?? [];
const advancedItems: RoadmapItem[] = advancedPhase?.items ?? [];

// ✅ Completion + locking logic (no TS errors)
const foundationCompleted =
  foundationItems.length > 0 &&
  foundationItems.every((i) => completed.includes(i.title));


const coreCompleted =
  coreItems.length > 0 &&
  coreItems.every((i) => completed.includes(i.title));
  
const advancedCompleted =
  advancedItems.length > 0 &&
  advancedItems.every((i) => completed.includes(i.title));


  // 🎉 Confetti when completing a FULL section (Foundation / Core / Advanced)
useEffect(() => {
  if (foundationCompleted) {
    confetti({
      particleCount: 160,
      spread: 90,
      origin: { y: 0.6 },
    });
  }
}, [foundationCompleted]);

useEffect(() => {
  if (!coreLocked && coreCompleted) {
    confetti({
      particleCount: 160,
      spread: 90,
      origin: { y: 0.6 },
    });
  }
}, [coreCompleted]);

useEffect(() => {
  if (!advancedLocked && advancedCompleted) {
    confetti({
      particleCount: 160,
      spread: 90,
      origin: { y: 0.6 },
    });
  }
}, [advancedCompleted]);

const coreLocked = false;
const advancedLocked = false;

  if (errorMsg) return null;

  const weeklyTasks = allItems.slice(0, 4);
  const progress = stats?.percent ?? 0;

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-8">
        {/* MAIN */}
        <div className="mx-auto w-full max-w-[900px]">

          {/* Top Header Section */}
          <div className="mb-14 space-y-6">

            <h1 className="text-4xl font-extrabold text-[#000926]">
              🧭 {roadmap?.target_role || "Your Learning Roadmap"}
            </h1>

            <p className="text-[#1E293B] max-w-xl">
              Your AI-powered learning system — structured, calm, and designed to compound over time.
            </p>

            {/* Progress */}
              <div className="rounded-2xl bg-[#0B1220] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-white">Overall Progress</p>
                    <p className="text-xs text-slate-400">
                      {stats?.completed}/{stats?.total} topics completed
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#3B82F6]">
                      {stats?.percent ?? 0}%
                    </p>
                    <p className="text-xs text-slate-400">Complete</p>
                  </div>
                </div>

                <div className="w-full h-3 rounded-full bg-[#1E293B] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    className="h-full bg-gradient-to-r from-[#2563EB] to-[#60A5FA]"
                  />
                </div>
              </div>

            {/* Focus CTAs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Today */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="rounded-2xl p-6 bg-gradient-to-br from-[#0F52BA] to-[#4F83FF] text-white shadow-[0_0_40px_rgba(79,131,255,0.55)] hover:shadow-[0_0_55px_rgba(79,131,255,0.75)] transition-all duration-300"
              >
                <div className="flex items-center -gap-3 mb-2">
                  <img src="/interest.png" className="h-12 w-16 -ml-5" />
                  <h3 className="font-bold">Today’s Focus</h3>
                </div>

                <p className="text-sm">
                  {today?.title
                    ? <>Focus on <b>{today.title}</b> ({today.phase})</>
                    : "You're all caught up 🎉"}
                </p>
              </motion.div>

              {/* Weekly */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="rounded-2xl p-6 bg-[#0B1220] text-[#D6E6F3] shadow-[0_0_25px_rgba(15,82,186,0.25)] hover:shadow-[0_0_40px_rgba(15,82,186,0.45)] transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-2">
                  <img src="/calendar.png" className="h-10 w-10 -ml-2" />
                  <h3 className="font-bold">Weekly Focus</h3>
                </div>

                <p className="text-sm text-[#A6C5D7]">
                  Build consistency with small daily wins 🚀
                </p>
              </motion.div>

            </div>
          </div>

          {/* Learning Stages */}
            {[
              { id: 1, label: "Foundation", phase: foundationPhase },
              { id: 2, label: "Core Skills", phase: corePhase },
              { id: 3, label: "Advanced", phase: advancedPhase },
            ].map((section) => {
              const sectionItems =
                section.id === 1
                  ? foundationItems
                  : section.id === 2
                  ? coreItems
                  : advancedItems;

              return (
                <div key={section.id} className="relative mb-8 grid grid-cols-[1fr] gap-4">
                  {/* vertical line */}
                  <div
                      className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 h-6 w-[2px] rounded-full bg-gradient-to-b from-[#3B82F6] to-[#60A5FA] opacity-70
                      ${
                        (section.id === 2 && coreLocked) ||
                        (section.id === 3 && advancedLocked)
                          ? "bg-slate-300"
                          : "bg-blue-500"
                      }
                    `}
                  />

                    {/* Section Header */}
                      <div className="flex items-center gap-4 mb-3 relative z-10">
                            
                        <motion.div
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{
                            scale:
                              (section.id === 1 && foundationCompleted) ||
                              (section.id === 2 && !coreLocked) ||
                              (section.id === 3 && !advancedLocked)
                                ? 1.15
                                : 1,
                              opacity: 1,
                          }}
                              transition={{ delay: section.id * 0.15, type: "spring", stiffness: 160, damping: 14 }}
                              className={`h-10 w-10 rounded-full font-bold flex items-center justify-center shadow-lg transition
                                ${
                                  (section.id === 2 && coreLocked) ||
                                  (section.id === 3 && advancedLocked)
                                    ? "bg-slate-300 text-slate-500"
                                    : "bg-[#0F52BA] text-white shadow-[0_0_12px_rgba(15,82,186,0.6)]"
                                }
                              `}
                            >
                              {section.id}
                            </motion.div>

                              <div>
                                <h2 className="text-2xl font-bold text-[#000926]">
                                  {section.label}
                                </h2>

                                <p className="text-xs text-slate-500">
                                  {completed.filter(t => sectionItems.some(i => i.title === t)).length} of {sectionItems.length} completed
                                </p>
                              </div>
                            </div>
                            
                            {(section.label === "Core Skills" && coreLocked) && (
                              <p className="text-xs text-slate-500 -mt-2">
                                Complete Foundation to unlock Core Skills
                              </p>
                            )}

                            {(section.label === "Advanced" && advancedLocked) && (
                              <p className="text-xs text-slate-500 -mt-2">
                                Complete previous stages to unlock Advanced
                              </p>
                            )}

                  {/* cards */}
                  <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {(loading ? Array.from({ length: 4 }) : sectionItems).map((item: any, i: number) => {
                      if (loading) {
                        return (
                          <div
                            key={i}
                            className="rounded-2xl p-6 bg-[#000926] border border-[#0F52BA] animate-pulse"
                          >
                            <div className="h-4 w-2/3 bg-white/10 rounded mb-3" />
                            <div className="h-3 w-1/3 bg-white/10 rounded" />
                          </div>
                        );
                      }

                      const isDone = completed.includes(item.title);
                      const isLocked =
                        (section.id === 2 && coreLocked) ||
                        (section.id === 3 && advancedLocked);

                      return (
                        <motion.div
                          key={item.title}
                          whileHover={!isLocked ? { scale: 1.02 } : undefined}
                          title={isLocked ? "Complete previous stage to unlock" : undefined}
                          onClick={() => {
                            if (isLocked) return;
                            router.push(`/roadmap/${slugify(item.title)}`);
                          }}
                          
                          className={`rounded-2xl p-6 flex justify-between items-center transition relative cursor-pointer
                            ${
                              isLocked
                                ? "bg-[#000926] border border-[#0F52BA] opacity-50 blur-[0.5px] cursor-not-allowed"
                                : isDone
                                  ? "bg-[#081433] border-[#4F83FF] shadow-[0_0_0_1px_#4F83FF]"
                                  : "bg-[#000926] border border-[#0F52BA] hover:border-[#4F83FF] hover:shadow-[0_0_45px_rgba(79,131,255,0.6)] hover:scale-[1.02] group"
                            }`}
                        >
                          {isLocked && (
                            <div className="absolute top-3 right-3 h-7 w-7 rounded-full bg-white/90 text-slate-700 flex items-center justify-center shadow">
                              🔒
                            </div>
                          )}

                          <div>
                            <h3 className="text-lg text-[#D6E6F3] group-hover:text-blue-400 transition">
                              📘 {item.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-[#A6C5D7]">🧩 {section.label}</span>

                              {isDone ? (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30">
                                  ✓ Completed
                                </span>
                              ) : (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700/40 text-slate-300 border border-slate-600">
                                  Not Started
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isLocked) return;

                              const wasCompleted = completed.includes(item.title);

                              toggleComplete(item.title);

                              if (!wasCompleted) {
                                confetti({
                                  particleCount: 120,
                                  spread: 70,
                                  origin: { y: 0.6 },
                                });
                              }
                            }}
                            className={`h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200 hover:shadow-md cursor-pointer
                              ${
                                isDone
                                  ? "bg-[#4F83FF] text-white shadow-md scale-105"
                                  : "border border-[#A6C5D7] text-[#D6E6F3] hover:bg-[#0F52BA]/30 hover:scale-105"
                              }`}
                          >
                            ✓
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>

        {/* FINAL CTA – Bottom of page */}
          <div className="mt-24 text-center rounded-2xl bg-[#EAF4FF] p-10 border border-[#A6C5D7]">
            <h3 className="text-2xl font-bold text-[#0F52BA] mb-2">
              Keep Going! 🚀
            </h3>
            <p className="text-[#1E293B] max-w-xl mx-auto">
              Every topic you complete brings you one step closer to your dream career. Stay consistent, and you’ll be amazed at your progress!
            </p>
          </div>
      </div>
    </div>
  );
}