"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getToken, clearToken } from "@/lib/auth";
import StudyCalendar from "@/components/StudyCalendar";


type Stats = {
  total: number;
  completed: number;
  percent: number;
};

type Today = {
  title?: string;
  phase?: string;
  why?: string;
  type?: string;
  estimated_weeks?: number;
};

export default function HomePage() {
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [today, setToday] = useState<Today | null>(null);
  const [roadmapTitle, setRoadmapTitle] = useState<string>("");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [name, setName] = useState<string | null>(
    () => localStorage.getItem("full_name")
  );

  const handleLogout = () => {
    clearToken();
    router.push("/login");
  };
  
  const makeSlug = (title?: string) => {
    if (!title) return "";
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    
      fetch("http://127.0.0.1:8000/profile", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          const serverName = data?.full_name || "";
          setName(serverName);
          localStorage.setItem("full_name", serverName); // keep cache fresh
          setProfileLoaded(true);
        })
        .catch(() => setProfileLoaded(true));
        const completed = stats?.completed ?? 0;
        const total = stats?.total ?? 0;
        const percent = stats?.percent ?? 0;

    fetch("http://127.0.0.1:8000/roadmap/stats", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setStats)
      .catch(() => {});

    fetch("http://127.0.0.1:8000/roadmap/today", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setToday)
      .catch(() => {});

    fetch("http://127.0.0.1:8000/roadmap", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setRoadmapTitle(data?.target_role || ""))
      .catch(() => {});
  }, [router]);
    
    
  const completed = stats?.completed ?? 0;
  const total = stats?.total ?? 0;
  const percent = stats?.percent ?? 0;

  
  return (
    <div className="max-w-[1200px] mx-auto py-10">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
        {/* LEFT */}
        <div className="space-y-10">
          {/* Greeting */}
          <div className="rounded-3xl bg-white p-8 shadow-lg">
            <h1 className="text-3xl font-bold text-[#0A2540] mb-1 flex items-center gap-2">
              Hello {name || "there"} <span className="wave">👋</span>
            </h1>
            <p className="text-slate-600">Ready to start your day?</p>
          </div>

          {/* Top Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Progress */}
            <div className="rounded-2xl bg-[#1F2A3A] text-white p-6 shadow">
              <p className="text-xs opacity-80">Overall Progress</p>
              <p className="text-2xl font-bold mt-1">
                {completed}/{total}
              </p>
              <div className="h-1 bg-white/20 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-1 bg-blue-500 rounded-full transition-all duration-700"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-xs mt-2 opacity-70">{percent}% complete</p>
              <p className="text-xs text-blue-400 mt-1">Great start 🚀</p>
            </div>

            {/* Streak (still UI-only for now) */}
            <div className="rounded-2xl bg-[#1F2A3A] text-white p-6 shadow">
              <p className="text-xs opacity-80">Current Streak</p>
              <p className="text-2xl font-bold mt-1">—</p>
              <p className="text-xs mt-2 opacity-70">Tracking coming soon 🔥</p>
            </div>

            {/* Weekly Focus */}
            <div className="rounded-2xl bg-[#1F2A3A] text-white p-6 shadow">
              <p className="text-xs opacity-80">Weekly Focus</p>
              <p className="font-semibold mt-1">
                {today?.title || "No focus yet"}
              </p>
              <p className="text-xs mt-2 opacity-70">{today?.phase || ""}</p>
            </div>
          </div>

          {/* Today's Focus */}
          <div className="rounded-3xl bg-[#2458E8] text-white p-10 shadow-lg relative overflow-hidden">
            <span className="inline-flex items-center gap-2 text-xs bg-white/20 px-3 py-1 rounded-full mb-3">
              🎯 Today’s Focus
            </span>

            <h2 className="text-2xl font-bold mb-2">
              {today?.title || "No task yet"}
            </h2>

            <p className="text-sm opacity-90 mb-6 max-w-xl">
              {today?.why || "Complete your next roadmap item to get started."}
            </p>

            <button
              onClick={() => {
                const slug = makeSlug(today?.title);
                if (!slug) return router.push("/roadmap");
                router.push(`/roadmap/${slug}`);
              }}
              className="bg-white text-blue-600 font-semibold px-5 py-2 rounded-lg transition hover:-translate-y-1 hover:shadow-lg"
            >
              Continue Learning →
            </button>

            <div className="absolute right-6 top-[22%] h-20 w-20 rounded-full bg-white/20 flex items-center justify-center animate-float-soft">
              <Image src="/book.png" alt="book" width={70} height={70} />
            </div>
          </div>

          {/* Bottom Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div
                onClick={() => {
                  const slug = makeSlug(today?.title);
                  if (!slug) return router.push("/roadmap");
                  router.push(`/roadmap/${slug}`);
                }}
                className="rounded-2xl bg-[#1F2A3A] text-white p-6 shadow cursor-pointer hover:opacity-90 transition"
              >
                <p className="text-xs opacity-80 mb-1">Continue Learning</p>
                <p className="text-blue-400 text-xs mb-1">{today?.phase || ""}</p>
                <p className="font-semibold flex justify-between">
                  {today?.title || "—"} <span>→</span>
                </p>
              </div>

              <div
                onClick={() => router.push("/roadmap")}
                className="rounded-2xl bg-[#1F2A3A] text-white p-6 shadow cursor-pointer"
              >
                <p className="text-xs opacity-80 mb-1">Your Roadmap</p>
                <p className="text-blue-400 text-xs mb-1">
                  {total} Topics
                </p>
                <p className="font-semibold flex justify-between">
                  {roadmapTitle || "View complete learning path"} <span>→</span>
                </p>
              </div>
            </div>
        </div>
        
        {/* RIGHT */}
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-4 shadow-xl">
            <Image
              src="/girl.png"
              alt="Learning"
              width={360}
              height={240}
              className="rounded-2xl object-cover"
              priority
            />
          </div>
          
           {/* Glass wrapper */}
          <div className="rounded-3xl bg-white/40 backdrop-blur-xl p-4 shadow-xl">
            <StudyCalendar />
          </div>
        </div>
      </div>

      <style jsx>{`
        .wave {
          display: inline-block;
          animation: wave 2s infinite;
          transform-origin: 70% 70%;
        }
        @keyframes wave {
          0% { transform: rotate(0deg); }
          15% { transform: rotate(14deg); }
          30% { transform: rotate(-8deg); }
          40% { transform: rotate(14deg); }
          50% { transform: rotate(-4deg); }
          60% { transform: rotate(10deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes float-soft {
          0% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-8px) translateX(4px); }
          100% { transform: translateY(0px) translateX(0px); }
        }
        .animate-float-soft {
          animation: float-soft 4.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}