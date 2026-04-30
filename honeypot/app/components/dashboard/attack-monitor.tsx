// components/dashboard/attack-monitor.tsx
"use client";

import AttackTimelineChart from "./AttackTimelineChart";

interface AttackMonitorProps {
  limit?: number;
  honeypotId?: string;
  className?: string;
}

export default function AttackMonitor({
  honeypotId,
  className = "",
}: AttackMonitorProps) {
  return (
    <div className={`${className}`}>
      <div className="grid grid-cols-1 gap-4 mb-6">
        {/* Only use the timeline chart as requested */}
        <AttackTimelineChart honeypotId={honeypotId} refreshInterval={30} />
      </div>

    </div>
  );
}
