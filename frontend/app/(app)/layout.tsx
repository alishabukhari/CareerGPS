"use client";

import { useRouter, usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const isHome = pathname === "/home";
  const isRoadmap = pathname.startsWith("/roadmap");

  return (
    <div className="min-h-screen flex bg-[#EAF4FB]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0B1220] text-[#EAF2FF] p-6 flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-bold text-blue-400">CareerGPS</h2>
          <p className="text-xs text-slate-400 mb-8">Your AI Career Guide</p>

          <nav className="space-y-2">
            <button
              onClick={() => router.push("/home")}
              className={`w-full text-left px-3 py-2 rounded-lg ${
                isHome ? "bg-blue-600/20 text-blue-400" : "hover:bg-white/10"
              }`}
            >
              🏠 Home
            </button>

            <button
              onClick={() => router.push("/roadmap")}
              className={`w-full text-left px-3 py-2 rounded-lg ${
                isRoadmap ? "bg-blue-600/20 text-blue-400" : "hover:bg-white/10"
              }`}
            >
              🗺 Roadmap
            </button>
          </nav>
        </div>

        <button
          onClick={() => router.push("/login")}
          className="text-sm text-slate-400 hover:text-white"
        >
          ⎋ Sign Out
        </button>
      </aside>

      {/* Page Content */}
      <main className="flex-1 px-12 py-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}