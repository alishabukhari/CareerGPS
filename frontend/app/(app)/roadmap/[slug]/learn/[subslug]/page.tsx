"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import SubslugContinuationLayout from "@/components/SubslugContinuationLayout";

const API_BASE = "http://127.0.0.1:8000";

export default function LearnPage() {
  const { slug } = useParams();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [explanation, setExplanation] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const token = getToken();
      if (!token) return router.push("/login");

      const res = await fetch(
        `${API_BASE}/roadmap/topic/content?slug=${slug}&type=learn`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json();
      setTitle(data.page_title);
      setExplanation(data.explanation);
      setItems(data.items || []);
      setLoading(false);
    };

    load();
  }, [slug]);

  if (loading) return <div className="p-10">Loading…</div>;

  return (
    <div className="mx-auto max-w-[1600px] px-4 md:px-8 space-y-10">
      <button onClick={() => router.push(`/roadmap/${slug}`)} className="text-blue-600 hover:underline">
        ← Back to Topic
      </button>

      <h1 className="text-4xl font-extrabold">{title}</h1>

      <SubslugContinuationLayout
        pageTitle={title}
        explanation={explanation}
        items={items}
        onAskAI={() => router.push(`/roadmap/${slug}`)}
        onMarkComplete={() => alert("TODO: mark learn complete")}
      />
    </div>
  );
}