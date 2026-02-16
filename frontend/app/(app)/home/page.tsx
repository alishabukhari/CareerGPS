"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useRequireProfile } from "@/lib/useRequiredProfile";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="max-w-[1200px] mx-auto py-10">
      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
        
        {/* LEFT CONTENT */}
        <div className="space-y-10">

          {/* Greeting Card */}
          <div className="rounded-3xl bg-white p-8 shadow-lg">
            <h1 className="text-3xl font-bold text-[#0A2540] mb-1 flex items-center gap-2">
              Hello Alisha 
              <span className="wave">👋</span>
            </h1>
            <p className="text-slate-600">Ready to start your day?</p>
          </div>

          {/* Top Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Overall Progress",
                content: (
                  <>
                    <p className="text-2xl font-bold mt-1">2/7</p>
                    <div className="h-1 bg-white/20 rounded-full mt-3 overflow-hidden">
                      <div className="h-1 w-[29%] bg-blue-500 rounded-full transition-all duration-700" />
                    </div>
                    <p className="text-xs mt-2 opacity-70">29% complete</p>
                    <p className="text-xs text-blue-400 mt-1">Great start 🚀</p>
                  </>
                ),
              },
              {
                title: "Current Streak",
                content: (
                  <>
                    <p className="text-2xl font-bold mt-1">7 days</p>
                    <div className="flex gap-1 mt-3">
                      {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="h-5 w-8 rounded bg-blue-500" />
                      ))}
                    </div>
                    <p className="text-xs mt-2 opacity-70">You’re on fire 🔥</p>
                  </>
                ),
              },
              {
                title: "Weekly Focus",
                content: (
                  <>
                    <p className="font-semibold mt-1">JavaScript Fundamentals</p>
                    <p className="text-xs mt-2 opacity-70">3 of 5 sessions</p>
                    <div className="h-1 bg-white/20 rounded-full mt-3 overflow-hidden">
                      <div className="h-1 w-[60%] bg-blue-500 rounded-full" />
                    </div>
                  </>
                ),
              },
            ].map((card, i) => (
              <div
                key={i}
                className="rounded-2xl bg-[#1F2A3A] text-white p-6 shadow hover:-translate-y-1 hover:shadow-xl transition"
              >
                <p className="text-xs opacity-80">{card.title}</p>
                {card.content}
              </div>
            ))}
          </div>

          {/* Today's Focus */}
          <div className="rounded-3xl bg-[#2458E8] text-white p-10 shadow-lg relative overflow-hidden">
            <span className="inline-flex items-center gap-2 text-xs bg-white/20 px-3 py-1 rounded-full mb-3">
              🎯 Today’s Focus
            </span>

            <h2 className="text-2xl font-bold mb-2">
              Arrays and objects manipulation
            </h2>

            <p className="text-sm opacity-90 mb-6 max-w-xl">
              Master array methods like map, filter, and reduce. These are essential tools for working with data in JavaScript.
            </p>

            <button
              onClick={() => router.push("/roadmap")}
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
            <div className="rounded-2xl bg-[#1F2A3A] text-white p-6 shadow hover:-translate-y-1 hover:shadow-xl transition cursor-pointer">
              <p className="text-xs opacity-80 mb-1">Continue Learning</p>
              <p className="text-blue-400 text-xs mb-1">Foundation</p>
              <p className="font-semibold flex justify-between">
                JavaScript Fundamentals <span>→</span>
              </p>
            </div>

            <div
              onClick={() => router.push("/roadmap")}
              className="rounded-2xl bg-[#1F2A3A] text-white p-6 shadow hover:-translate-y-1 hover:shadow-xl transition cursor-pointer"
            >
              <p className="text-xs opacity-80 mb-1">Your Roadmap</p>
              <p className="text-blue-400 text-xs mb-1">7 Topics</p>
              <p className="font-semibold flex justify-between">
                View complete learning path <span>→</span>
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Illustration */}
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

          {/* Calendar Placeholder */}
          <div className="h-[220px] rounded-3xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-sm">
            Calendar coming here 📅
          </div>
        </div>
      </div>

      {/* Animations */}
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