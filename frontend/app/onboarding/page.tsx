"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";

export default function OnboardingPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [major, setMajor] = useState("");
  const [interests, setInterests] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (step === 1) {
      if (!fullName.trim()) {
        setError("Please enter your full name.");
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!major.trim()) {
        setError("Please enter your field of study.");
        return;
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      setLoading(true);
      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const res = await fetch("http://localhost:8000/profile", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            full_name: fullName,
            major,
            interests: interests
              .split(",")
              .map((i) => i.trim())
              .filter(Boolean),
          }),
        });

        if (!res.ok) throw new Error("Failed to save profile");

        router.push("/dashboard");
      } catch (err) {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 bg-[#EAF4FB] overflow-hidden">
      {/* 🔥 Background Image */}
      <img
        src="/first.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ filter: "hue-rotate(200deg) saturate(0.7)", opacity: 0.05 }}
      />

      {/* Content */}
      <div className="relative z-10 w-full flex flex-col items-center">

        {/* Top pill */}
        <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1 text-xs font-medium text-blue-600">
          ✨ Let’s personalize your journey
        </span>

        <h1 className="text-3xl font-extrabold text-[#0A2540]">
          Welcome to CareerGPS
        </h1>
        <p className="text-sm text-slate-600 mt-1 mb-6 text-center">
          Tell us about yourself so we can create a personalized roadmap
        </p>

        {/* Steps */}
        <div className="flex items-center gap-6 mb-8 text-xs">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`flex flex-col items-center gap-1 font-medium ${
                step === n ? "text-blue-600" : "text-slate-400"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full ${
                  step === n
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {n}
              </span>
              {n === 1 ? "About You" : n === 2 ? "Your Field" : "Interests"}
            </div>
          ))}
        </div>

        {/* Card */}
        <div
          className="w-full max-w-xl rounded-2xl p-8 shadow-xl"
          style={{ backgroundColor: "#1F2A3A", color: "#EAF2FF" }}
        >
          <h2 className="text-lg font-semibold mb-1">✨ Let’s get started</h2>

          <form onSubmit={handleNext} className="space-y-4">
            {step === 1 && (
              <div>
                <label className="block text-xs mb-1 opacity-80">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-lg px-4 py-2 outline-none"
                  style={{ backgroundColor: "#F3F7FF", color: "#0A2540" }}
                />
              </div>
            )}

            {step === 2 && (
              <div>
                <label className="block text-xs mb-1 opacity-80">
                  Major / Field of Study
                </label>
                <input
                  type="text"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  placeholder="e.g. Computer Science, Business, Design"
                  className="w-full rounded-lg px-4 py-2 outline-none"
                  style={{ backgroundColor: "#F3F7FF", color: "#0A2540" }}
                />
              </div>
            )}

            {step === 3 && (
              <div>
                <label className="block text-xs mb-1 opacity-80">
                  Interests (comma separated)
                </label>
                <input
                  type="text"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="Web Dev, AI, UX/UI"
                  className="w-full rounded-lg px-4 py-2 outline-none"
                  style={{ backgroundColor: "#F3F7FF", color: "#0A2540" }}
                />
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-2 pt-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                  className="rounded-lg border px-4 py-2 text-sm"
                  style={{ borderColor: "#94A3B8", color: "#EAF2FF" }}
                >
                  ← Back
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 rounded-lg font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: "#2563EB" }}
              >
                {step < 3
                  ? "Continue →"
                  : loading
                  ? "Generating..."
                  : "Generate My Roadmap ✨"}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          💡 Your information helps us create a personalized learning path
        </p>
      </div>
    </div>
  );
}