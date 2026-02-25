"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getToken } from "@/lib/auth";
import SubslugContinuationLayout from "@/components/SubslugContinuationLayout";
import AiSidePanel from "@/components/AiSidePanel";
import { getSubslugComplete, setSubslugComplete, SubslugType } from "@/lib/subslugCompletion";

const API_BASE = "http://127.0.0.1:8000";

type TopicData = {
  title: string;
  phase: string;
  explanation: string;
  checklist: string[];
};

export default function TopicSubpage({ type }: { type: SubslugType }) {
  const router = useRouter();
  const params = useParams();
  const slug = decodeURIComponent(params.slug as string);

  const titleFromSlug = useMemo(() => slug.replace(/-/g, " "), [slug]);

  const [topic, setTopic] = useState<TopicData | null>(null);

  const [pageTitle, setPageTitle] = useState("");
  const [explanation, setExplanation] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAI, setShowAI] = useState(false);

  const [isComplete, setIsComplete] = useState(false);

  const phase = topic?.phase?.toLowerCase() || "";
  const phaseLabel =
    phase.includes("core") ? "Core Skills" : phase.includes("advanced") ? "Advanced" : "Foundation";

  const typeLabel =
    type === "learn" ? "Learn" : type === "projects" ? "Projects" : "Portfolio";

  useEffect(() => {
    setIsComplete(getSubslugComplete(slug, type));

    const onChange = () => setIsComplete(getSubslugComplete(slug, type));
    window.addEventListener("cgps-subslug-complete-changed", onChange);
    return () => window.removeEventListener("cgps-subslug-complete-changed", onChange);
  }, [slug, type]);

  useEffect(() => {
    const load = async () => {
      const token = getToken();
      if (!token) return router.push("/login");

      try {
        setLoading(true);

        // 1) topic detail for phase + canonical title
        const topicRes = await fetch(
          `${API_BASE}/roadmap/topic?title=${encodeURIComponent(titleFromSlug)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!topicRes.ok) throw new Error("Topic fetch failed");
        const topicData = await topicRes.json();
        setTopic(topicData);

        // 2) subpage content (cached AI)
        const res = await fetch(
          `${API_BASE}/roadmap/topic/content?slug=${encodeURIComponent(slug)}&type=${type}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Content fetch failed");
        const data = await res.json();

        setPageTitle(data.page_title);
        setExplanation(data.explanation);
        setItems(data.items || []);
      } catch {
        // keep minimal fallback
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug, type, router, titleFromSlug]);

  const toggleComplete = () => {
    const next = !isComplete;
    setIsComplete(next);
    setSubslugComplete(slug, type, next);
  };

  if (loading) return <div className="min-h-screen grid place-items-center">Loading…</div>;

  const topicTitle = topic?.title || titleFromSlug;

  return (
    <div className="w-full relative">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
        <motion.div
          animate={{
            marginRight: showAI ? "520px" : "0px",
            maxWidth: showAI ? "calc(100% - 520px)" : "100%",
          }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="mx-auto w-full max-w-[1600px] space-y-10 lg:col-span-11 px-4 md:px-8 pt-0"
        >
          {/* Header (continuation styling like slug page) */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <button
                onClick={() => router.push("/roadmap")}
                className="text-blue-600 hover:underline cursor-pointer"
              >
                ← Back to Roadmap
              </button>

              <p className="text-xs text-slate-500 mt-1">
                <span
                  onClick={() => router.push("/roadmap")}
                  className="cursor-pointer hover:underline text-slate-500"
                >
                  Roadmap
                </span>{" "}
                ›{" "}
                <span className="text-blue-600 font-medium">{phaseLabel}</span> ›{" "}
                <span
                  onClick={() => router.push(`/roadmap/${slug}`)}
                  className="cursor-pointer hover:underline text-slate-500"
                >
                  {topicTitle}
                </span>{" "}
                › <span className="text-blue-600 font-medium">{typeLabel}</span>
              </p>

              <div className="flex items-center gap-2 mt-2">
                <span className="inline-block text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-600">
                  {phaseLabel}
                </span>
                <span className="inline-block text-xs px-3 py-1 rounded-full bg-white border border-blue-200 text-blue-600">
                  {typeLabel}
                </span>
              </div>
            </div>

            {/* Circle complete toggle (new) */}
            <button
              onClick={toggleComplete}
              className="flex items-center gap-2 select-none"
              title="Mark this page complete"
            >
              <span
                className={`h-10 w-10 rounded-full border transition grid place-items-center
                  ${isComplete ? "bg-blue-600 border-blue-600" : "bg-white border-blue-300"}
                `}
              >
                {isComplete ? (
                  <img src="/whitetick.png" className="w-6 h-6" />
                ) : (
                  <span className="h-3 w-3 rounded-full bg-blue-200" />
                )}
              </span>
              <span className="text-sm font-semibold text-slate-700">
                {isComplete ? "Completed" : "Mark complete"}
              </span>
            </button>
          </div>

          <h1 className="text-4xl font-extrabold">{topicTitle}</h1>

          {/* Body */}
          <SubslugContinuationLayout
            pageTitle={pageTitle || topicTitle}
            explanation={explanation}
            items={items}
            onAskAI={() => setShowAI(true)}
            onMarkComplete={toggleComplete}
          />
        </motion.div>
      </div>

      {/* Shared AI side panel */}
      <AiSidePanel
        isOpen={showAI}
        onClose={() => setShowAI(false)}
        topicTitle={topicTitle}
      />
    </div>
  );
}