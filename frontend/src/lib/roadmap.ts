import { getToken } from "@/lib/auth";

export async function generateRoadmap() {
  const token = getToken();

  if (!token) {
    throw new Error("Not authenticated");
  }

  const res = await fetch("http://localhost:8000/roadmap/generate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to generate roadmap");
  }

  const data = await res.json();

  // backend returns { roadmap: string }
  return JSON.parse(data.roadmap);
}
