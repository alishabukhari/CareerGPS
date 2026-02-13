"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.detail || "Login failed");
        return;
      }

      // ✅ Store token
      saveToken(data.access_token);
      router.push("/dashboard");
    } catch (err) {
      setMessage("Backend not reachable");
    } finally {
      setLoading(false);
    }
  };

 return (
  <div
    className="min-h-screen flex items-center justify-center px-6"
    style={{ backgroundColor: "#D6E6F3" }}
  >
    <div
      className="w-full max-w-md rounded-2xl p-8 shadow-lg"
      style={{ backgroundColor: "#000026", color: "#EAF2FF" }}
    >
      <h1 className="text-2xl font-bold mb-2">Sign in to CareerGPS</h1>
      <p className="text-sm mb-6 opacity-80">
        Your personalized AI-powered career roadmap.
      </p>

      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg px-4 py-2 outline-none"
          style={{ backgroundColor: "#EAF2FF", color: "#000026" }}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg px-4 py-2 outline-none"
          style={{ backgroundColor: "#EAF2FF", color: "#000026" }}
          required
        />

        <button
          type="submit"
          className="w-full py-2 rounded-lg font-semibold text-white"
          style={{ backgroundColor: "#0F52BA" }}
        >
          Login
        </button>
      </form>
    </div>
  </div>
);
}
