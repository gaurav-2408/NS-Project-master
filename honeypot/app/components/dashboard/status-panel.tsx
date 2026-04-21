// components/dashboard/status-panel.tsx
"use client";

import { useState, useEffect } from "react";
import { getAllHoneypots } from "@/lib/api-client";

export default function StatusPanel() {
  const [stats, setStats] = useState({
    totalHoneypots: 0,
    activeHoneypots: 0,
    totalAttacks: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const honeypots = await getAllHoneypots();

        const totalHoneypots = honeypots.length;
        const activeHoneypots = honeypots.filter(
          (h) => h.status === "active"
        ).length;
        const totalAttacks = honeypots.reduce(
          (sum, h) => sum + h.attack_count,
          0
        );

        setStats({ totalHoneypots, activeHoneypots, totalAttacks });
      } catch (error) {
        console.error("Failed to load stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <p className="text-sm text-gray-500">Total Attacks</p>
        {loading ? (
          <div className="h-8 bg-gray-200 animate-pulse rounded mt-2"></div>
        ) : (
          <p className="text-2xl font-bold">{stats.totalAttacks}</p>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <p className="text-sm text-gray-500">Active Honeypots</p>
        {loading ? (
          <div className="h-8 bg-gray-200 animate-pulse rounded mt-2"></div>
        ) : (
          <p className="text-2xl font-bold">
            {stats.activeHoneypots}
            <span className="text-sm text-gray-500">
              /{stats.totalHoneypots}
            </span>
          </p>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <p className="text-sm text-gray-500">System Status</p>
        {loading ? (
          <div className="h-8 bg-gray-200 animate-pulse rounded mt-2"></div>
        ) : (
          <p className="text-lg font-medium text-green-600">Online</p>
        )}
      </div>
    </div>
  );
}
