"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Lock } from "lucide-react";
import { saveToken } from "@/lib/auth";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("http://127.0.0.1:8000/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Signup failed");
      }

      if (data.access_token) {
        // 🔥 IMPORTANT: clear any old session first
        localStorage.removeItem("token");
        saveToken(data.access_token);   // ✅ save token for fresh user
        router.push("/onboarding");     // ✅ NEW USERS GO TO ONBOARDING
      } else {
        setMessage("⚠️ Please verify your email before logging in.");
        router.push("/onboarding");     // still send to onboarding
      }
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "#EAF4FB" }}
    >
      <img
        src="/first.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ filter: "hue-rotate(200deg) saturate(0.7)", opacity: 0.05 }}
      />
      {/* Header */}
      <h1 className="text-3xl font-extrabold mb-1 text-[#0A2540]">
        CareerGPS
      </h1>
      <p className="text-sm text-slate-600 mb-8">
        Create your account and start your journey 🚀
      </p>

      {/* Card */}
      <div
        className="w-full max-w-md rounded-2xl p-8 shadow-xl"
        style={{ backgroundColor: "#1F2A3A", color: "#EAF2FF" }}
      >
        <h2 className="text-xl font-semibold mb-6">Create Account</h2>

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs mb-1 opacity-80">
              Full Name
            </label>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-[#F3F7FF]">
              <User size={18} className="text-slate-400" />
              <input
                type="text"
                placeholder="Your name"
                className="w-full bg-transparent outline-none text-[#0A2540] placeholder:text-slate-400"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs mb-1 opacity-80">
              Email
            </label>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-[#F3F7FF]">
              <Mail size={18} className="text-slate-400" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent outline-none text-[#0A2540] placeholder:text-slate-400"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs mb-1 opacity-80">
              Password
            </label>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-[#F3F7FF]">
              <Lock size={18} className="text-slate-400" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent outline-none text-[#0A2540] placeholder:text-slate-400"
                required
              />
            </div>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 accent-blue-500"
              required
            />
            <span>
              I agree to the{" "}
              <span className="text-blue-400 hover:underline cursor-pointer">
                Terms of Service
              </span>{" "}
              and{" "}
              <span className="text-blue-400 hover:underline cursor-pointer">
                Privacy Policy
              </span>
            </span>
          </label>

          {/* Error / Message */}
          {message && (
            <p
              className={`text-sm ${
                message.startsWith("✅") ? "text-green-400" : "text-red-400"
              }`}
            >
              {message}
            </p>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: "#2563EB" }}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        {/* Footer inside card */}
        <p className="mt-4 text-xs text-center text-slate-400">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("access_token");
              router.replace("/login");
            }}
            className="text-blue-400 hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>

      {/* Page footer */}
      <p className="mt-8 text-xs text-slate-500">
        Your AI-powered career companion
      </p>
    </div>
  );
}