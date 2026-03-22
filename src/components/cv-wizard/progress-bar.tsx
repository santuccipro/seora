"use client";

import { motion } from "framer-motion";

const STEP_LABELS = [
  "Contact",
  "Profil",
  "Compétences",
  "Expériences",
  "Formation",
  "Langues",
  "Style",
];

interface ProgressBarProps {
  currentStep: number; // 0-indexed
  totalSteps: number;
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="w-full">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-indigo-600">
          Étape {currentStep + 1}/{totalSteps}
        </span>
        <span className="text-xs font-medium text-gray-400">
          {STEP_LABELS[currentStep] || ""}
        </span>
      </div>

      {/* Bar */}
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Dots */}
      <div className="flex justify-between mt-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <motion.div
            key={i}
            className={`h-2 w-2 rounded-full transition-colors ${
              i <= currentStep ? "bg-indigo-500" : "bg-gray-200"
            }`}
            animate={i === currentStep ? { scale: [1, 1.3, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
    </div>
  );
}
