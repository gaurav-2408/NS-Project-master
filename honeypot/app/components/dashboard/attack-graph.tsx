// components/dashboard/attack-graph.tsx
"use client";

import { useState, useEffect } from "react";
import { getAllHoneypots, Honeypot } from "@/lib/api-client";

export default function AttackGraph() {
  const [honeypots, setHoneypots] = useState<Honeypot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getAllHoneypots();
        setHoneypots(data.filter((h) => h.status === "active"));
      } catch (error) {
        console.error("Failed to fetch attack data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="h-40 bg-gray-200 animate-pulse rounded"></div>
      </div>
    );
  }

  if (honeypots.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="text-center py-10 text-gray-500">
          No active honeypots to display attack data
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-end h-40 gap-3">
        {honeypots.map((honeypot) => {
          const height = Math.max(
            10,
            Math.min(100, honeypot.attack_count * 5 || 10)
          );

          return (
            <div
              key={honeypot.id}
              className="flex-1 flex flex-col items-center"
            >
              <div
                className="w-full bg-blue-500 rounded-t"
                style={{ height: `${height}px` }}
              ></div>
              <p className="text-xs mt-2 text-center truncate w-full">
                {honeypot.name}
              </p>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-center text-gray-500 mt-4">
        Attack distribution by honeypot
      </p>
    </div>
  );
}
