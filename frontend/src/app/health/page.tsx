"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";

type HealthState =
  | { status: "loading" }
  | { status: "success"; code: number; message: string }
  | { status: "error"; message: string };

export default function HealthPage() {
  const [health, setHealth] = useState<HealthState>({ status: "loading" });

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch(`${API_URL}/api/health`);
        if (!res.ok) {
          setHealth({ status: "error", message: `Received HTTP ${res.status}` });
          return;
        }
        const data = await res.json();
        setHealth({ status: "success", code: data.code, message: data.message });
      } catch {
        setHealth({ status: "error", message: "API unreachable" });
      }
    }

    checkHealth();
  }, []);

  const dotColor =
    health.status === "success"
      ? "bg-green-500"
      : health.status === "error"
        ? "bg-red-500"
        : "bg-zinc-400";

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 font-sans dark:bg-black">
      <div className="flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${dotColor}`} />
        <span className="text-lg font-medium text-black dark:text-zinc-50">
          {health.status === "loading" && "Checking backend..."}
          {health.status === "success" && `${health.message} (code ${health.code})`}
          {health.status === "error" && health.message}
        </span>
      </div>
    </div>
  );
}
