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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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

      if (!res.ok) {
        throw new Error("Failed to save profile");
      }

      // ✅ Profile updated → go to dashboard
      router.push("/dashboard");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow"
      >
        <h1 className="mb-1 text-2xl font-semibold">
          Complete your profile
        </h1>
        <p className="mb-6 text-sm text-gray-600">
          This helps CareerGPS personalize your career roadmap.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Full name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full rounded border px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Major / Field of study
          </label>
          <input
            type="text"
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            required
            className="w-full rounded border px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">
            Interests (comma separated)
          </label>
          <input
            type="text"
            placeholder="AI, Backend, Embedded Systems"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            className="w-full rounded border px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
          />
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 transition"
        >
          {loading ? "Saving..." : "Continue"}
        </button>
      </form>
    </div>
  );
}
