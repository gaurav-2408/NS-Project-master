// app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAllHoneypots, Honeypot } from "@/lib/api-client";
import HoneypotList from "@/app/components/dashboard/honeypot-list"; // Adjusted path
import StatusPanel from "@/app/components/dashboard/status-panel"; // Adjusted path
import AttackStats from "@/app/components/dashboard/attack-stats"; // Adjusted path
// Removed AttackMonitor and getAllAttacks as they weren't used
import { Plus, Loader2 } from "lucide-react"; // Added Loader2 for loading state

// Simple Skeleton Loader for the Honeypot List section
function HoneypotListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(2)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg shadow-md p-5 border border-slate-100 animate-pulse"
        >
          {/* Mimic HoneypotCard skeleton */}
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="h-5 bg-slate-200 rounded w-48 mb-2"></div>
              <div className="h-3 bg-slate-200 rounded w-32 mb-3"></div>
              <div className="h-4 bg-slate-200 rounded w-40"></div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-7 w-20 bg-slate-200 rounded-md"></div>
              <div className="h-7 w-20 bg-slate-200 rounded-md"></div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
            <div className="h-5 w-24 bg-slate-200 rounded-full"></div>
            <div className="h-4 w-28 bg-slate-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [honeypots, setHoneypots] = useState<Honeypot[]>([]);
  const [loadingHoneypots, setLoadingHoneypots] = useState(true); // Specific loading state for honeypots
  const [error, setError] = useState<string | null>(null); // Add error state

  useEffect(() => {
    async function loadData() {
      setLoadingHoneypots(true);
      setError(null);
      try {
        // Fetch honeypots needed for the list
        const data = await getAllHoneypots();
        setHoneypots(data);
      } catch (err) {
        console.error("Failed to load honeypots:", err);
        setError(
          err instanceof Error ? err.message : "Could not load honeypot data."
        );
        setHoneypots([]); // Clear data on error
      } finally {
        setLoadingHoneypots(false);
      }
    }

    loadData();
  }, []);

  return (
    // Main container: Full width, background color, padding
    <div className="min-h-screen container mx-auto p-6 max-w-7xl  px-4 sm:px-6 lg:px-10 py-8">
      {/* Header Section */}
      <div className="mb-8 border-b border-slate-200 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Dashboard Overview
          </h1>
          <Link
            href="/honeypots/new"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Create Honeypot
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-8">
        {" "}
        {/* Consistent vertical spacing */}
        {/* Status Panel - Assuming it fetches its own data or uses context */}
        <StatusPanel />
        {/* Attack Statistics Section */}
        {/* AttackStats fetches its own data internally */}
        <AttackStats days={7} />
        {/* Honeypots List Section */}
        <div>
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            Deployed Honeypots
          </h2>
          {loadingHoneypots ? (
            // Show skeleton while loading honeypots
            <HoneypotListSkeleton />
          ) : error ? (
            // Show error specific to loading honeypots
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-center shadow-sm">
              <p className="text-sm text-rose-700">
                Error loading honeypots: {error}
              </p>
              {/* Optionally add a retry button here */}
            </div>
          ) : (
            // Render the list with fetched data (using the simple HoneypotList)
            <HoneypotList honeypots={honeypots} />
          )}
        </div>
      </div>
    </div>
  );
}
