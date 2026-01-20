"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [status, setStatus] = useState("Checking API...");

  useEffect(() => {
    fetch("http://localhost:8000/health")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setStatus("API: OK ✅");
        } else {
          setStatus("API: NOT OK ❌");
        }
      })
      .catch(() => {
        setStatus("API: ERROR ❌");
      });
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="p-6 rounded-2xl shadow">
        <h1 className="text-3xl font-bold">CareerGPS</h1>
        <p className="mt-2 text-lg">{status}</p>
      </div>
    </main>
  );
}
