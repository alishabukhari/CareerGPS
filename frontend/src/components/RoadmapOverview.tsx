"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Target, Calendar, ChevronRight } from "lucide-react";
import { mockTopics, mockUserProgress } from "@/data/mockData";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function RoadmapOverview() {
  const progress = mockUserProgress;
  const progressPercentage = (progress.completedTopics / progress.totalTopics) * 100;
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progressPercentage);
    }, 300);
    return () => clearTimeout(timer);
  }, [progressPercentage]);

  const phases = [
    { name: "Foundation", topics: mockTopics.filter((t) => t.phase === "Foundation") },
    { name: "Core Skills", topics: mockTopics.filter((t) => t.phase === "Core Skills") },
    { name: "Advanced", topics: mockTopics.filter((t) => t.phase === "Advanced") },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-secondary mb-2">Your Learning Roadmap</h1>
        <p className="text-lg text-muted-foreground">
          A personalized path to achieve your career goals
        </p>
      </motion.div>

      {/* Overall Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        whileHover={{ scale: 1.01 }}
        className="bg-card text-card-foreground rounded-xl shadow-lg p-6 mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold">Overall Progress</h2>
            <p className="text-card-foreground/70 mt-1">
              {progress.completedTopics} of {progress.totalTopics} topics completed
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">{Math.round(progressPercentage)}%</p>
            <p className="text-sm text-card-foreground/70">Complete</p>
          </div>
        </div>
        <Progress value={animatedProgress} className="h-3 transition-all duration-1000 ease-out" />
      </motion.div>

      {/* Focus Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          whileHover={{ scale: 1.02, y: -4 }}
          className="bg-gradient-to-br from-primary to-accent rounded-xl shadow-lg p-6 text-white"
        >
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5" />
            <h3 className="font-semibold">Today's Focus</h3>
          </div>
          <p className="text-xl font-bold mb-2">{progress.todaysFocus}</p>
          <p className="text-white/80 text-sm">Keep your streak going! 🔥</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          whileHover={{ scale: 1.02, y: -4 }}
          className="bg-card text-card-foreground rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5" />
            <h3 className="font-semibold">Weekly Focus</h3>
          </div>
          <p className="text-xl font-bold mb-2">{progress.weeklyFocus}</p>
          <p className="text-card-foreground/70 text-sm">3 of 5 sessions completed this week</p>
        </motion.div>
      </div>

      {/* Learning Path */}
      <div className="space-y-8">
        {phases.map((phase, phaseIndex) => (
          <motion.div key={phase.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-white font-bold">
                {phaseIndex + 1}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{phase.name}</h2>
                <p className="text-muted-foreground">
                  {phase.topics.filter((t) => t.completed).length} of {phase.topics.length} completed
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-16">
              {phase.topics.map((topic) => (
                <Link
                  key={topic.id}
                  href={`/roadmap/topic/${topic.slug}`}
                  className="relative block bg-card text-card-foreground rounded-xl shadow-md transition-all duration-300 p-5 group hover:shadow-xl hover:shadow-primary/20 border-2 border-transparent hover:border-primary/30"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                        {topic.title}
                      </h3>
                      <p className="text-sm text-card-foreground/60 line-clamp-2">
                        {topic.description}
                      </p>
                    </div>
                    {topic.completed ? (
                      <CheckCircle2 className="w-7 h-7 text-primary ml-3" />
                    ) : (
                      <Circle className="w-7 h-7 text-card-foreground/30 ml-3" />
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-card-foreground/10">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-card-foreground/10">
                      {topic.completed ? "✓ Completed" : "Not Started"}
                    </span>
                    <span className="flex items-center gap-1 text-primary text-sm font-medium">
                      View <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}