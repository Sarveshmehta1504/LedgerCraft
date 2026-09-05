"use client";

import { useEffect, useRef, useState } from "react";
import { Cell, Legend, Pie, PieChart, Tooltip } from "recharts";
import { formatMoney } from "@/lib/format";

/**
 * Committed budget split by analytic account. A pie is the right form here because
 * the question is "how is the committed total divided", which is genuinely a
 * share-of-whole — unlike planned-vs-achieved, which stays a bar comparison.
 *
 * The chart is sized from a measured box rather than recharts' ResponsiveContainer,
 * which reported a 14x14 canvas inside this grid track and rendered nothing.
 */

/** Palette drawn from the app's neutrals plus the accent, not a stock chart ramp. */
const SLICE_COLORS = ["#0f766e", "#3f3f46", "#5eead4", "#a1a1aa", "#134e4a", "#d4d4d8"];

const HEIGHT = 248;

interface Slice {
  name: string;
  value: number;
}

export function BudgetPie({ data }: { data: Slice[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const next = Math.floor(entries[0].contentRect.width);
      setWidth((current) => (current === next ? current : next));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const total = data.reduce((sum, slice) => sum + slice.value, 0);

  if (total <= 0) {
    return (
      <p className="px-5 py-8 text-center text-[13px] text-[var(--text-subtle)]">
        No committed budget to chart for this period.
      </p>
    );
  }

  return (
    <div ref={wrapRef} className="w-full min-w-0 px-2 py-4" style={{ height: HEIGHT }}>
      {width > 0 && (
        <PieChart width={width} height={HEIGHT}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="45%"
            innerRadius={54}
            outerRadius={86}
            paddingAngle={2}
            stroke="#ffffff"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {data.map((slice, index) => (
              <Cell key={slice.name} fill={SLICE_COLORS[index % SLICE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [formatMoney(Number(value)), String(name)]}
            contentStyle={{
              borderRadius: 6,
              border: "1px solid var(--line)",
              fontSize: 13,
              boxShadow: "0 12px 24px -16px rgba(24,24,27,0.35)",
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={28}
            formatter={(value: string) => (
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{value}</span>
            )}
          />
        </PieChart>
      )}
    </div>
  );
}
