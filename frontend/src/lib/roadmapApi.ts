import { getToken } from "@/lib/auth";

const API_BASE = "http://127.0.0.1:8000";

export async function markTaskComplete(title: string) {
  const token = getToken();
  if (!token) throw new Error("No token");

  const res = await fetch(`${API_BASE}/roadmap/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title: title.trim() }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw err;
  }

  return res.json();
}