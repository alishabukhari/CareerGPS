"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, removeToken } from "@/lib/auth";

type Profile = {
  full_name: string | null;
  major: string | null;
  interests: string[] | string | null;
};

export default function DashboardPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ 1. Hydration safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ 2. Auth + profile check
  useEffect(() => {
    if (!mounted) return;

    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const checkProfile = async () => {
      try {
        const res = await fetch("http://localhost:8000/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // ❌ Invalid token
        if (res.status === 401) {
          removeToken();
          router.push("/login");
          return;
        }

        // 🆕 No profile yet → onboarding
        if (res.status === 404) {
          router.push("/onboarding");
          return;
        }

        if (!res.ok) {
          throw new Error("Profile fetch failed");
        }

        const data: Profile = await res.json();

        // Incomplete profile → onboarding
        if (!data.full_name || !data.major) {
          router.push("/onboarding");
          return;
        }

        // ✅ Profile OK
        setProfile(data);
      } catch (err) {
        console.error("Profile check failed:", err);
        removeToken();
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkProfile();
  }, [mounted, router]);

  // ✅ 3. Render guards
  if (!mounted) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading your profile…</p>
      </div>
    );
  }

  if (!profile) return null;

  // 🛡️ Safe interests handling
  const interestsArray =
    Array.isArray(profile.interests)
      ? profile.interests
      : typeof profile.interests === "string"
      ? profile.interests.split(",").map((i) => i.trim())
      : [];

 return (
  <div
    className="min-h-screen px-6 py-12"
    style={{ backgroundColor: "#D6E6F3" }} // Ice Blue page
  >
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Header Card */}
      <div
        className="rounded-2xl p-8 shadow-lg"
        style={{ backgroundColor: "#000026", color: "#EAF2FF" }} // Deep Navy card
      >
        <h1 className="text-3xl font-bold mb-1">
          Welcome, {profile.full_name}
        </h1>
        <p className="opacity-80">
          Let’s build your career step by step.
        </p>
      </div>

      {/* Profile Card */}
      <div
        className="rounded-2xl p-6 shadow-md space-y-2"
        style={{
          backgroundColor: "#000026",
          color: "#EAF2FF",
          border: "1px solid #A6C5D7",
        }}
      >
        <p>
          <span className="font-semibold">Major:</span>{" "}
          {profile.major}
        </p>

        <p>
          <span className="font-semibold">Interests:</span>{" "}
          {interestsArray.join(", ")}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={() => router.push("/roadmap")}
          className="px-6 py-3 rounded-xl font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: "#0F52BA" }} // Sapphire
        >
          View My Career Roadmap →
        </button>

        <button
          onClick={() => {
            removeToken();
            router.push("/login");
          }}
          className="px-6 py-3 rounded-xl font-semibold transition"
          style={{
            border: "1px solid #000026",
            color: "#000026",
            backgroundColor: "transparent",
          }}
        >
          Logout
        </button>
      </div>
    </div>
  </div>
);
}
