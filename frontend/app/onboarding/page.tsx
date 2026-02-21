"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { useRef } from "react";

export default function OnboardingPage() {
  const router = useRouter();
  const API_BASE = "http://127.0.0.1:8000";
  const [fullName, setFullName] = useState("");
  const [major, setMajor] = useState("");
  const [interests, setInterests] = useState("");
  const [role, setRole] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [customRole, setCustomRole] = useState<string>("");
  const customInterestRef = useRef<HTMLInputElement | null>(null);
  const customRoleRef = useRef<HTMLInputElement | null>(null);

  const ROLES = [
    "Frontend Engineer",
    "Backend Engineer",
    "Full Stack Engineer",
    "AI Engineer",
    "Embedded / Computer Engineer",
    "Electrical Engineer",
    "Civil Engineer",
    "Other",
  ];

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
      if (!role) {
        setError("Please select your target role.");
        return;
      }

      if (role === "Other" && !customRole.trim()) {
        setError("Please enter your field or career goal.");
        return;
      }

      const finalRole = role === "Other" ? customRole.trim() : role;

      setLoading(true);
      const token = getToken();

      if (!token) {
        router.push("/login");
        return;
      }

      try {
        // 1️⃣ Save profile
        const profileRes = await fetch("http://127.0.0.1:8000/profile", {
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

        if (!profileRes.ok) {
          const err = await profileRes.json();
          throw new Error(err.detail || "Failed to save profile");
        }
        console.log("✅ Profile saved");
        

        // 2️⃣ Initialize roadmap by role (AI)
          console.log("🚀 Calling /roadmap/init with role:", finalRole);

          const roadmapRes = await fetch(`${API_BASE}/roadmap/init`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ target_role: finalRole }),
          });


        // 3️⃣ Go to roadmap
        router.push("/roadmap");
      } catch (err: any) {
        setError(err.message || "Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 bg-[#EAF4FB] overflow-hidden">
      <img
        src="/first.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ filter: "hue-rotate(200deg) saturate(0.7)", opacity: 0.05 }}
      />

      <div className="relative z-10 w-full flex flex-col items-center">
        <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1 text-xs font-medium text-blue-600">
          ✨ Let’s personalize your journey
        </span>

        <h1 className="text-3xl font-extrabold text-[#0A2540]">
          Welcome to CareerGPS
        </h1>
        <p className="text-sm text-slate-600 mt-1 mb-6 text-center">
          Tell us about yourself so we can create a personalized roadmap
        </p>

        <div className="relative flex items-center justify-between mb-8 text-xs w-full max-w-md">
  
{/* Base line */}
<div className="absolute top-[19px] left-[22px] right-[22px] h-[3px] bg-slate-300/40 rounded-full" />

{/* Animated progress line */}
<motion.div
  className="absolute top-[19px] left-[22px] h-[3px] rounded-full will-change-[width]"
  style={{
    background: "linear-gradient(90deg, #3B82F6 0%, #2563EB 100%)",
    boxShadow: "none",
  }}
  animate={{
    width:
      step === 1 ? "0px" :
      step === 2 ? "calc(50% - 22px)" :
      "calc(100% - 35px)",
  }}
  transition={{ duration: 0.35, ease: "easeOut" }}
/>

          {[1, 2, 3].map((n) => {
            const isCompleted = step > n;
            const isActive = step === n;

            return (
              <div
                key={n}
                className={`relative z-10 flex flex-col items-center gap-1 font-medium ${
                  isActive || isCompleted ? "text-blue-600" : "text-slate-400"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                    isActive || isCompleted
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/40 scale-105"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {n}
                </span>
                {n === 1 ? "About You" : n === 2 ? "Your Field" : "Your Goal"}
              </div>
            );
          })}
        </div>
        
        <div
          className="w-full max-w-xl rounded-3xl p-10 backdrop-blur-xl relative shadow-[0_20px_60px_rgba(15,82,186,0.25)]"
          style={{
            backgroundColor: "#1F2A3A",   // solid navy (same as signup CTA)
            color: "#EAF2FF",
          }}
        >
          

          <AnimatePresence mode="wait">
            <motion.form
              key={step}
              onSubmit={handleNext}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="space-y-4"
            >

            {step === 1 && (
              <div className="space-y-1">
                {/* Header */}
                <div className="flex items-start gap-0 mb-4">
                  <img
                    src="/whitesparkle.png"
                    alt=""
                    className="w-16 h-16 -mt-3"
                  />

                  <div>
                    <h2 className="text-lg font-extrabold text-white leading-tight">
                      Let’s get started
                    </h2>
                    <p className="text-xs text-white/60 mt-0.5">
                      What should we call you?
                    </p>
                  </div>
                </div>

                <label className="block text-sm font-semibold mb-1 text-white">
                  Full Name
                </label>

                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-xl px-5 py-2 outline-none transition focus:ring-2 focus:ring-blue-500/60 focus:shadow-lg shadow-inner placeholder:text-slate-400"
                  style={{
                    background: "linear-gradient(180deg, #ffffff 0%, #ffffff 100%)",
                    color: "#0A2540",
                  }}
                />

                <p className="text-xs text-white/60 mt-2">
                  This helps us personalize your experience
                </p>
              </div>
            )}

              {step === 2 && (
              <div className="space-y-1">
                {/* Header */}
                <div className="flex items-start gap-0 mb-4 ">
                  <img
                    src="/onboarding1.png"
                    alt=""
                    className="w-16 h-16 -mt-3"
                  />

                  <div>
                    <h2 className="text-lg font-extrabold text-white leading-tight">
                      Your Background
                    </h2>
                    <p className="text-xs text-white/60 mt-0.5">
                      What's your field of study?
                    </p>
                  </div>
                </div>

                <label className="block text-sm font-semibold text-white mb-1">
                  Major / Field of Study
                </label>

                <input
                  type="text"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  placeholder="e.g. Computer Science, Business, Design"
                  className="w-full rounded-xl px-5 py-2 outline-none transition focus:ring-2 focus:ring-blue-500/60 focus:shadow-lg shadow-inner placeholder:text-slate-400"
                  style={{
                    background: "linear-gradient(180deg, #ffffff 0%, #ffffff 100%)",
                    color: "#0A2540",
                  }}
                />

                <p className="text-xs text-white/60 mt-2">
                  We'll tailor the roadmap to your background
                </p>
              </div>
            )}

          {step === 3 && (
            <div className="space-y-1">
              {/* Header */}
              <div className="flex items-start gap-0 mb-4 -ml-4">
            <img
              src="/interest.png"
              alt=""
              className="w-18 h-12 -mt-0.5 "
            />

            <div>
              <h2 className="text-lg font-extrabold text-white leading-tight">
                Your Interests
              </h2>
              <p className="text-xs text-white/60 mt-0.5">
                Select areas you want to explore
              </p>
            </div>
          </div>

            {/* Interests Title */}
            <p className="blcok text-sm font-semibold mb-1 text-white/80">
              Career Interests (Select all that apply)
            </p>

            {/* Interests Grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                "Web Development",
                "Mobile Development",
                "Data Science",
                "Machine Learning",
                "UX/UI Design",
                "Cloud Computing",
                "Cybersecurity",
                "DevOps",
              ].map((item) => {
                const interestArr = interests
                  ? interests.split(",").map((i) => i.trim()).filter(Boolean)
                  : [];

                const active = interestArr.includes(item);

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setInterests((prev) => {
                        const all = prev
                          ? prev.split(",").map((i) => i.trim()).filter(Boolean)
                          : [];

                        const presetList = [
                          "Web Development",
                          "Mobile Development",
                          "Data Science",
                          "Machine Learning",
                          "UX/UI Design",
                          "Cloud Computing",
                          "Cybersecurity",
                          "DevOps",
                        ];

                        const selectedPresets = all.filter((i) => presetList.includes(i));
                        const customOnes = all.filter((i) => !presetList.includes(i));

                        const updatedPresets = selectedPresets.includes(item)
                          ? selectedPresets.filter((i) => i !== item)
                          : [...selectedPresets, item];

                        const merged = [...updatedPresets, ...customOnes];

                        // 🚑 normalize + de-duplicate
                        const unique = Array.from(new Set(merged));

                        return unique.join(", ");
                      });
                    }}

                    className={`relative rounded-xl border px-4 py-2 text-[12px] font-medium text-left transition-all
                      ${
                        active
                          ? "border-blue-400 bg-blue-600/25 text-white shadow-[0_0_0_1px_rgba(59,130,246,0.6)]"
                          : "border-blue-500/30 bg-blue-600/10 text-white hover:bg-blue-600/20 hover:border-blue-400"
                      }
                    `}
                  >
                    {item}

                    {active && (
                      <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Interest */}
            <div className="pt-1">
              <p className="text-xs text-white/70 mb-1">
                Or add your own:
              </p>

              <div className="flex gap-2">
                <input
                  ref={customInterestRef}
                  type="text"
                  placeholder="Type a custom interest"
                  className="flex-1 rounded-lg px-3 py-2 text-sm outline-none bg-white text-[#0A2540] border border-blue-400/50 focus:ring-2 focus:ring-blue-500/40"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (!val) return;

                      setInterests((prev) => (prev ? `${prev}, ${val}` : val));
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => {
                    const input = customInterestRef.current;
                    if (!input) return;

                    const val = input.value.trim();
                    if (!val) return;

                    setInterests((prev) => (prev ? `${prev}, ${val}` : val));
                    input.value = "";
                  }}
                  className="rounded-lg border border-blue-500 px-4 py-2 text-sm text-blue-500 font-semibold transition hover:bg-blue-600 hover:text-white hover:border-blue-600"
                >
                  Add
                </button>
              </div>

              {interests && (
                <p className="text-xs text-blue-400 mt-1">
                  ✓ {interests.split(",").map((i) => i.trim()).filter(Boolean).length} interest selected
                </p>
              )}
            </div>
            {/* Target Role */}
            <div className="pt-4">
              <p className="block text-sm font-semibold mb-2 text-white/80">
                Target Role (Pick one)
              </p>

              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => {
                  const active = role === r;

                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`relative rounded-xl border px-4 py-2 text-[12px] font-medium text-left transition-all
                        ${
                          active
                            ? "border-blue-400 bg-blue-600/25 text-white shadow-[0_0_0_1px_rgba(59,130,246,0.6)]"
                            : "border-blue-500/30 bg-blue-600/10 text-white hover:bg-blue-600/20 hover:border-blue-400"
                        }
                      `}
                    >
                      {r}

                      {active && (
                        <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {role === "Other" && (
                <div className="mt-3">
                  <label className="block text-xs text-white/70 mb-1">
                    Enter your custom role
                  </label>

                  <div className="flex gap-2">
                    <input
                      ref={customRoleRef}
                      value={customRole}
                      onChange={(e) => setCustomRole(e.target.value)}
                      placeholder="e.g. Data Engineer, QA Engineer, Product Designer"
                      className="flex-1 rounded-lg px-3 py-2 text-sm outline-none bg-white text-[#0A2540] border border-blue-400/50 focus:ring-2 focus:ring-blue-500/40"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (!val) return;
                          setCustomRole(val);
                        }
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => {
                        const input = customRoleRef.current;
                        if (!input) return;
                        const val = input.value.trim();
                        if (!val) return;
                        setCustomRole(val);
                      }}
                      className="rounded-lg border border-blue-500 px-4 py-2 text-sm text-blue-500 font-semibold transition hover:bg-blue-600 hover:text-white hover:border-blue-600"
                    >
                      Add
                    </button>
                  </div>

                  {customRole && (
                    <p className="text-xs text-blue-400 mt-1">
                      ✓ Custom role set: {customRole}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        <div className="flex gap-2 pt-2">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              className="rounded-xl border px-4 py-2 text-sm transition hover:bg-white/10 hover:-translate-y-0.5"
              style={{ borderColor: "#94A3B8", color: "#EAF2FF" }}
            >
              ← Back
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 rounded-2xl font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
            style={{
              background: "linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)",
            }}
          >
            {step < 3
              ? "Next →"
              : loading
              ? "Generating your roadmap..."
              : "Generate My Roadmap ✨"}
          </button>
        </div>
          </motion.form>
          </AnimatePresence>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          💡 Your information helps us create a personalized learning path
        </p>
      </div>
    </div>
  );
}