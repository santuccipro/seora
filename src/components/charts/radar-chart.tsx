"use client";

interface RadarChartProps {
  data: Record<string, number>;
  labels?: Record<string, string>;
  size?: number;
}

const DEFAULT_LABELS: Record<string, string> = {
  structure: "Structure",
  contenu: "Contenu",
  experiences: "Expériences",
  competences: "Compétences",
  orthographe: "Orthographe",
  impact: "Impact ATS",
};

export function RadarChart({
  data,
  labels = DEFAULT_LABELS,
  size = 280,
}: RadarChartProps) {
  const keys = Object.keys(data);
  const n = keys.length;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 40;

  function polarToCart(angle: number, r: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  const angleStep = 360 / n;

  // Grid circles
  const gridLevels = [20, 40, 60, 80, 100];

  // Data polygon
  const dataPoints = keys.map((key, i) => {
    const value = data[key] ?? 0;
    const r = (value / 100) * radius;
    return polarToCart(i * angleStep, r);
  });

  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid */}
        {gridLevels.map((level) => {
          const r = (level / 100) * radius;
          const points = keys
            .map((_, i) => {
              const p = polarToCart(i * angleStep, r);
              return `${p.x},${p.y}`;
            })
            .join(" ");
          return (
            <polygon
              key={level}
              points={points}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={level === 100 ? 1.5 : 0.5}
            />
          );
        })}

        {/* Axes */}
        {keys.map((_, i) => {
          const p = polarToCart(i * angleStep, radius);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke="#e5e7eb"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Data area */}
        <polygon
          points={dataPoints.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="url(#radarGradient)"
          stroke="#6366f1"
          strokeWidth={2}
          opacity={0.85}
        />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="#6366f1"
            stroke="white"
            strokeWidth={2}
          />
        ))}

        {/* Labels */}
        {keys.map((key, i) => {
          const p = polarToCart(i * angleStep, radius + 22);
          const value = data[key] ?? 0;
          return (
            <g key={key}>
              <text
                x={p.x}
                y={p.y - 6}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-gray-700 text-[10px] font-medium"
              >
                {labels[key] || key}
              </text>
              <text
                x={p.x}
                y={p.y + 7}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-indigo-600 text-[10px] font-bold"
              >
                {value}
              </text>
            </g>
          );
        })}

        <defs>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.15" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
