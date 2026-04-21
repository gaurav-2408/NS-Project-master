// components/dashboard/attack-monitor.tsx
"use client";

import { useState, useEffect } from "react";
import { Attack, subscribeToAttacks } from "@/lib/api-client";
import AttackTimelineChart from "./AttackTimelineChart";
import AttackDailyBarChart from "./AttackDailyChart";
import AttackSimulator from "./AttackSimulator";
import AIInsightsPanel from "./AIInsightsPanel";

interface AttackMonitorProps {
  limit?: number;
  honeypotId?: string;
  className?: string;
}

export default function AttackMonitor({
  limit = 5,
  honeypotId,
  className = "",
}: AttackMonitorProps) {
  const [attacks, setAttacks] = useState<Attack[]>([]);

  useEffect(() => {
    // Subscribe to real-time attacks
    const unsubscribe = subscribeToAttacks((attack) => {
      // Only add attacks for this honeypot if honeypotId is provided
      if (!honeypotId || attack.honeypot_id === honeypotId) {
        setAttacks((prev) => {
          // Add to beginning, maintain limit
          const newAttacks = [attack, ...prev];
          if (newAttacks.length > limit) {
            return newAttacks.slice(0, limit);
          }
          return newAttacks;
        });
      }
    });

    // Cleanup
    return () => {
      unsubscribe();
    };
  }, [honeypotId, limit]);

  return (
    <div className={`${className}`}>
      <div className="grid grid-cols-1 gap-4 mb-6">
        {/* Only use the timeline chart as requested */}
        <AttackTimelineChart honeypotId={honeypotId} refreshInterval={30} />
      </div>

    </div>
  );
}
