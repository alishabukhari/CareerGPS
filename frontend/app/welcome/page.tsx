"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WelcomePage() {
  const router = useRouter();

  // Prevent any scroll bounce / layout shifting
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-[#020617] overflow-hidden">
      {/* Spline Full Screen */}
      <iframe
        src="https://my.spline.design/r4xbot-t7DiFjF1aRXQVjE01VJPQsRL/"
        title="CareerGPS Robot"
        className="absolute inset-0 w-full h-full z-0"
        style={{ border: 0 }}
        // These don't hurt, and sometimes help with playback/interaction
        allow="fullscreen; autoplay"
      />

      {/* Skip */}
      <button
        onClick={() => router.push("/login")}
        className="absolute top-6 right-6 z-10 text-xs text-white/70 hover:text-white"
      >
        Skip
      </button>

      {/* Next Button */}
      <button
        onClick={() => router.push("/login")}
        className="absolute bottom-6 right-3 z-10 flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-12 py-4 text-white hover:bg-white/20 transition"
      >
        Next <span className="text-xl">→</span>
      </button>
    </div>
  );
}