"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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

  useEffect(() => {
    setMounted(true);
  }, []);

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
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          removeToken();
          router.push("/login");
          return;
        }

        if (res.status === 404) {
          router.push("/onboarding");
          return;
        }

        if (!res.ok) throw new Error("Profile fetch failed");

        const data: Profile = await res.json();

        if (!data.full_name || !data.major) {
          router.push("/onboarding");
          return;
        }

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

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading your profile…</p>
      </div>
    );
  }

  if (!profile) return null;

  const interestsArray =
    Array.isArray(profile.interests)
      ? profile.interests
      : typeof profile.interests === "string"
      ? profile.interests.split(",").map((i) => i.trim())
      : [];

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">

      {/* Background Image */}
      <Image
        src="/first.png"
        alt="Background"
        fill
        priority
        className="object-cover"
        style={{
          filter: "hue-rotate(200deg) saturate(0.7)",
          opacity: 0.05,
        }}
      />

      {/* Overlay content */}
      <div className="relative z-10 w-full max-w-3xl space-y-8">

        {/* Header Card */}
        <div
          className="rounded-2xl p-8 shadow-lg backdrop-blur-md"
          style={{ backgroundColor: "#000026", color: "#EAF2FF" }}
        >
          <h1 className="text-3xl font-bold mb-1">
            Welcome, {profile.full_name} 👋
          </h1>
          <p className="opacity-80">
            Let’s build your career step by step.
          </p>
        </div>

        {/* Profile Card */}
        <div
          className="rounded-2xl p-6 shadow-md space-y-2 backdrop-blur-md"
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
            onClick={() => router.push("/home")}
            className="px-6 py-3 rounded-xl font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: "#0F52BA" }}
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