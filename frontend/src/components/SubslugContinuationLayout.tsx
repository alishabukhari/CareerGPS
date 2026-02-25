"use client";

import { motion } from "framer-motion";
import { useState } from "react";

type Item = {
  id: string;
  title: string;
  content: {
    definition?: string;
    formula?: string;
    real_world?: string;
    example?: string;
    steps?: string;
    materials?: string;
    design?: string;
    code?: string;
    troubleshooting?: string;
    why?: string;
    examples?: string;
    templates?: string;
  };
};


export default function SubslugContinuationLayout({
  pageTitle,
  explanation,
  items,
  onAskAI,
  onMarkComplete,
}: {
  pageTitle: string;
  explanation: string;
  items: Item[];
  onAskAI: () => void;
  onMarkComplete: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  
  return (
    <div className="space-y-10">
      {/* AI Explanation */}
      <div className="relative overflow-hidden rounded-3xl p-8 
        bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 
        text-white shadow-[0_30px_80px_rgba(37,99,235,0.45)]">
        <h3 className="font-semibold mb-3 text-lg tracking-wide flex items-center gap-3">
          ✨ AI-Generated Explanation
        </h3>
        <p className="text-sm leading-relaxed text-blue-50/90 max-w-3xl">
          {explanation}
        </p>
      </div>

      {/* Dropdown Items */}
      <div className="rounded-2xl p-6 bg-[#000926] border border-blue-900/40 text-white shadow-[0_6px_16px_rgba(0,9,38,0.35)] space-y-3">
        {items.map((item) => {
          const isOpen = openId === item.id;

          return (
            <div
              key={item.id}
              className="border border-[#0F52BA] rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className="w-full flex justify-between items-center px-4 py-3 text-left hover:bg-[#0F52BA]/20 transition"
              >
                <span className="text-[#D6E6F3]">
                  ➜ {item.title}
                </span>
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="text-blue-400"
                >
                  ▾
                </motion.span>
              </button>

              {isOpen && (
                <div className="px-5 py-4 space-y-2 text-sm text-blue-100">
                  {item.content.definition && <p><b>Definition:</b> {item.content.definition}</p>}
                  {item.content.formula && <p><b>Formula:</b> {item.content.formula}</p>}
                  {item.content.real_world && <p><b>Real world:</b> {item.content.real_world}</p>}
                  {item.content.example && <p><b>Example:</b> {item.content.example}</p>}
                  {item.content.steps && <p><b>Steps:</b> {item.content.steps}</p>}
                  {item.content.materials && <p><b>Materials:</b> {item.content.materials}</p>}
                  {item.content.design && <p><b>Design:</b> {item.content.design}</p>}
                  {item.content.code && <p><b>Code:</b> {item.content.code}</p>}
                  {item.content.troubleshooting && <p><b>Troubleshooting:</b> {item.content.troubleshooting}</p>}
                  {item.content.why && <p><b>Why it matters:</b> {item.content.why}</p>}
                  {item.content.examples && <p><b>Examples:</b> {item.content.examples}</p>}
                  {item.content.templates && <p><b>Templates:</b> {item.content.templates}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="rounded-2xl bg-[#EAF4FF] p-6 border border-[#A6C5D7] flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm font-medium text-[#000926]">
          Finished this section?
        </p>

        <div className="flex gap-3">
          <button
            onClick={onMarkComplete}
            className="px-5 py-2 rounded-xl bg-white text-blue-600 border border-blue-300 hover:bg-[#000926] hover:text-white transition"
          >
            ✓ Mark as Complete
          </button>

          <button
            onClick={onAskAI}
            className="px-5 py-2 rounded-xl bg-white text-blue-600 border border-blue-300 hover:bg-[#000926] hover:text-white transition"
          >
            ✨ Ask AI for Help
          </button>
        </div>
      </div>
    </div>
  );
}