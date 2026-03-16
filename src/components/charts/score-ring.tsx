"use client";

import { useEffect, useState } from "react";

interface ScoreRingProps {
  score: number;
  size?: number;
  label?: string;
}

export function ScoreRing({ score, size = 140, label = "Score global" }: ScoreRingProps) {
  const [animated, setAnimated] = useState(0);
  const strokeWidth = 8;
  const r = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * r;

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const strokeDashoffset = circumference - (animated / 100) * circumference;

  let color = "#ef4444";
  let bgColor = "#fef2f2";
  if (score >= 80) {
    color = "#22c55e";
    bgColor = "#f0fdf4";
  } else if (score >= 60) {
    color = "#eab308";
    bgColor = "#fefce8";
  } else if (score >= 40) {
    color = "#f97316";
    bgColor = "#fff7ed";
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          className="-rotate-90"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill={bgColor}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
          />
        </svg>
        <div className="absolute text-center">
          <span className="text-3xl font-extrabold" style={{ color }}>
            {score}
          </span>
          <span className="text-sm text-gray-400">/100</span>
        </div>
      </div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
    </div>
  );
}
