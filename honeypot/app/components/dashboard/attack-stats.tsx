// components/dashboard/attack-stats.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  getAttackStats,
  AttackStats,
  getAllHoneypots,
  Honeypot,
} from "@/lib/api-client";
import {
  AlertTriangle,
  BarChart3,
  Target,
  Activity,
  FileText,
} from "lucide-react"; // Added relevant icons

interface AttackStatsProps {
  days?: number; // Number of days for stats (e.g., 7, 30)
}

// Helper to format large numbers (optional, but nice for > 1000)
const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

// Helper to format attack type string
const formatAttackType = (type: string): string => {
  if (!type) return "Unknown Type";
  return type
    .split(/[\s_]+/) // Split by space or underscore
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export default function AttackStatsComponent({ days = 7 }: AttackStatsProps) {
  const [stats, setStats] = useState<AttackStats | null>(null);
  const [honeypots, setHoneypots] = useState<Record<string, Honeypot>>({}); // Map ID -> Honeypot object
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null); // Clear previous errors
      try {
        // Fetch both in parallel for speed
        const [honeypotsData, statsData] = await Promise.all([
          getAllHoneypots(),
          getAttackStats(days),
        ]);

        // Create Honeypot Map for quick lookup
        const honeypotMap: Record<string, Honeypot> = {};
        honeypotsData.forEach((hp) => {
          honeypotMap[hp.id] = hp;
        });

        setHoneypots(honeypotMap);
        setStats(statsData);
      } catch (err: any) {
        console.error("Failed to load attack stats or honeypots:", err);
        setError(
          err.message || "Failed to load attack statistics or honeypot data"
        );
        // Clear data on error to avoid showing stale info
        setStats(null);
        setHoneypots({});
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [days]); // Reload if the 'days' prop changes

  // Memoize derived stats calculations to avoid recomputing on every render
  const derivedStats = useMemo(() => {
    if (!stats) return null;

    const sortedByType = Object.entries(stats.by_type).sort(
      ([, countA], [, countB]) => countB - countA
    );
    const sortedByHoneypot = Object.entries(stats.by_honeypot).sort(
      ([, countA], [, countB]) => countB - countA
    );
    const sortedDaily = Object.entries(stats.daily).sort(
      (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
    );

    const mostCommonAttack = sortedByType.length > 0 ? sortedByType[0] : null;
    const mostTargetedHoneypotEntry =
      sortedByHoneypot.length > 0 ? sortedByHoneypot[0] : null;
    const maxDailyCount = Math.max(0, ...Object.values(stats.daily)); // Ensure max is at least 0
    const maxTypeCount = sortedByType.length > 0 ? sortedByType[0][1] : 0; // Max count for type bars
    const maxHoneypotCount =
      sortedByHoneypot.length > 0 ? sortedByHoneypot[0][1] : 0; // Max count for honeypot bars

    return {
      sortedByType,
      sortedByHoneypot,
      sortedDaily,
      mostCommonAttack,
      mostTargetedHoneypotEntry,
      maxDailyCount,
      maxTypeCount,
      maxHoneypotCount,
      totalAttacks: stats.total,
    };
  }, [stats]);

  // Improved Honeypot Name Resolver
  const getHoneypotName = (id: string): string => {
    if (honeypots[id]) {
      return honeypots[id].name;
    }
    // Provide a more informative placeholder if honeypot is missing
    return `Deleted/Unknown (ID: ${id.substring(0, 6)}...)`;
  };

  // --- Loading State ---
  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        {/* Top Header Skeleton */}
        <div className="h-7 bg-slate-200 rounded w-1/4"></div>
        {/* Top 3 Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-slate-100 rounded-lg shadow-sm p-6 h-28">
              <div className="h-4 bg-slate-300 rounded w-1/2 mb-3"></div>
              <div className="h-6 bg-slate-300 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-slate-300 rounded w-1/4"></div>
            </div>
          ))}
        </div>
        {/* Daily Chart Skeleton */}
        <div className="bg-slate-100 rounded-lg shadow-sm p-6 h-72">
          <div className="h-5 bg-slate-300 rounded w-1/3 mb-4"></div>
          <div className="flex items-end h-4/5 space-x-2">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-slate-300 rounded-t"
                style={{ height: `${Math.random() * 70 + 10}%` }}
              ></div>
            ))}
          </div>
        </div>
        {/* Bottom 2 Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-slate-100 rounded-lg shadow-sm p-6 h-40">
              <div className="h-5 bg-slate-300 rounded w-1/3 mb-4"></div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {" "}
                  <div className="flex-grow h-2.5 bg-slate-300 rounded-full"></div>
                  <div className="h-4 w-16 bg-slate-300 rounded"></div>
                  <div className="h-4 w-8 bg-slate-300 rounded"></div>{" "}
                </div>
                <div className="flex items-center gap-3">
                  {" "}
                  <div className="flex-grow h-2.5 bg-slate-300 rounded-full"></div>
                  <div className="h-4 w-20 bg-slate-300 rounded"></div>
                  <div className="h-4 w-8 bg-slate-300 rounded"></div>{" "}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- Error State ---
  if (error || !stats || !derivedStats) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-lg p-6 text-center shadow-sm">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-rose-800 mb-1">
          Statistics Error
        </h3>
        <p className="text-sm text-rose-700">
          {error || "Could not load attack statistics data."}
        </p>
        {/* Optional: Add a retry button here if needed */}
      </div>
    );
  }

  // --- Main Content Rendering ---
  return (
    <div className="space-y-6">
      {" "}
      {/* Consistent spacing between sections */}
      <h2 className="text-2xl font-semibold text-slate-800">
        Attack Statistics
      </h2>
      {/* --- Top Stats Cards --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Attacks */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-100">
          <h3 className="text-sm font-medium text-slate-500 mb-1">
            Total Attacks
          </h3>
          <p className="text-3xl font-bold text-slate-900 mt-1">
            {formatNumber(derivedStats.totalAttacks)}
          </p>
          <p className="text-xs text-slate-500 mt-2">Last {days} days</p>
        </div>

        {/* Most Common Attack */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-100">
          <h3 className="text-sm font-medium text-slate-500 mb-1">
            Most Common Attack
          </h3>
          {derivedStats.mostCommonAttack ? (
            <>
              <p
                className="text-xl font-semibold text-slate-900 mt-1 truncate"
                title={formatAttackType(derivedStats.mostCommonAttack[0])}
              >
                {formatAttackType(derivedStats.mostCommonAttack[0])}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {formatNumber(derivedStats.mostCommonAttack[1])} occurrences
              </p>
            </>
          ) : (
            <p className="text-lg text-slate-500 mt-1">No attacks recorded</p>
          )}
        </div>

        {/* Most Targeted Honeypot */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-100">
          <h3 className="text-sm font-medium text-slate-500 mb-1">
            Most Targeted Honeypot
          </h3>
          {derivedStats.mostTargetedHoneypotEntry ? (
            <>
              <p
                className="text-xl font-semibold text-slate-900 mt-1 truncate"
                title={getHoneypotName(
                  derivedStats.mostTargetedHoneypotEntry[0]
                )}
              >
                {/* Use the improved name resolver */}
                {getHoneypotName(derivedStats.mostTargetedHoneypotEntry[0])}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {formatNumber(derivedStats.mostTargetedHoneypotEntry[1])}{" "}
                attacks
              </p>
            </>
          ) : (
            <p className="text-lg text-slate-500 mt-1">No attacks recorded</p>
          )}
        </div>
      </div>
      {/* --- Attack Type & Honeypot Activity Breakdown --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attack Types */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 inline-flex items-center">
            <FileText className="h-5 w-5 mr-2 text-sky-600" /> Attack Types
          </h3>
          {derivedStats.sortedByType.length > 0 ? (
            <div className="space-y-3">
              {derivedStats.sortedByType.map(([type, count]) => {
                // Calculate width % relative to the most common attack type
                const widthPercent =
                  derivedStats.maxTypeCount > 0
                    ? (count / derivedStats.maxTypeCount) * 100
                    : 0;
                return (
                  <div key={type} className="flex items-center gap-3 text-sm">
                    <span
                      className="w-28 sm:w-32 truncate text-slate-700"
                      title={formatAttackType(type)}
                    >
                      {formatAttackType(type)}
                    </span>
                    <div className="flex-grow bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-sky-600 h-2 rounded-full"
                        style={{ width: `${widthPercent}%` }}
                        role="progressbar"
                        aria-valuenow={count}
                        aria-valuemin={0}
                        aria-valuemax={derivedStats.maxTypeCount}
                      ></div>
                    </div>
                    <span className="w-10 text-right font-semibold text-slate-500">
                      {formatNumber(count)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-5">
              No attack type data available.
            </p>
          )}
        </div>

        {/* Honeypot Activity */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 inline-flex items-center">
            <Activity className="h-5 w-5 mr-2 text-emerald-600" /> Honeypot
            Activity
          </h3>
          {derivedStats.sortedByHoneypot.length > 0 ? (
            <div className="space-y-3">
              {derivedStats.sortedByHoneypot.map(([id, count]) => {
                // Calculate width % relative to the most targeted honeypot
                const widthPercent =
                  derivedStats.maxHoneypotCount > 0
                    ? (count / derivedStats.maxHoneypotCount) * 100
                    : 0;
                const hpName = getHoneypotName(id);
                return (
                  <div key={id} className="flex items-center gap-3 text-sm">
                    <span
                      className="w-28 sm:w-32 truncate text-slate-700"
                      title={hpName}
                    >
                      {hpName}
                    </span>
                    <div className="flex-grow bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 rounded-full" // Use emerald green
                        style={{ width: `${widthPercent}%` }}
                        role="progressbar"
                        aria-valuenow={count}
                        aria-valuemin={0}
                        aria-valuemax={derivedStats.maxHoneypotCount}
                      ></div>
                    </div>
                    <span className="w-10 text-right font-semibold text-slate-500">
                      {formatNumber(count)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-5">
              No honeypot activity data available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
