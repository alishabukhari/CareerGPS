"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveToken } from "@/lib/auth";
import { Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed");

      saveToken(data.access_token);
      router.push("/home");
    } catch (err: any) {
      setMessage(err.message || "Backend not reachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 bg-[#EAF4FB] overflow-hidden">

      {/* Background Illustration */}
      <img
        src="/first.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ filter: "hue-rotate(200deg) saturate(0.7)", opacity: 0.05 }}
      />

      <h1 className="text-3xl font-extrabold mb-1 text-[#0A2540] z-10">CareerGPS</h1>
      <p className="text-sm text-slate-600 mb-8 z-10">Welcome back! Ready to continue your journey?</p>

      <div className="w-full max-w-md rounded-2xl p-8 shadow-xl bg-[#1F2A3A] text-[#EAF2FF] z-10">
        <h2 className="text-xl font-semibold mb-6">Sign In</h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs mb-1 opacity-80">Email</label>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-[#F3F7FF]">
              <Mail size={18} className="text-slate-400" />
              <input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent outline-none text-[#0A2540]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1 opacity-80">Password</label>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-[#F3F7FF]">
              <Lock size={18} className="text-slate-400" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent outline-none text-[#0A2540]"
                required
              />
            </div>
          </div>

          {message && <p className="text-sm text-red-400">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg font-semibold text-white bg-blue-600 hover:opacity-90 transition"
          >
            {loading ? "Logging in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-4 text-xs text-center text-slate-400">
          Don’t have an account?{" "}
          <button onClick={() => router.push("/signup")} className="text-blue-400 hover:underline">
            Sign up
          </button>
        </p>
      </div>

      <p className="mt-8 text-xs text-slate-500 z-10">
        Your AI-powered career companion
      </p>
    </div>
  );
}