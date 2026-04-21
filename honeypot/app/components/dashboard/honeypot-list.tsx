// components/dashboard/honeypot-list.tsx
"use client";

import { useState, useEffect } from "react";
import { Honeypot, getAllHoneypots } from "@/lib/api-client";
import HoneypotCard from "./honeypot-card";

// Add interface for component props
interface HoneypotListProps {
  searchQuery?: string; // Make it optional for backward compatibility
}

export default function HoneypotList({ searchQuery = "" }: HoneypotListProps) {
  const [honeypots, setHoneypots] = useState<Honeypot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHoneypots = async () => {
    try {
      setLoading(true);
      const data = await getAllHoneypots();
      setHoneypots(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load honeypots");
      console.error("Error loading honeypots:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHoneypots();
  }, []);

  // Filter honeypots based on searchQuery
  const filteredHoneypots = honeypots.filter((honeypot) => {
    if (!searchQuery) return true; // If no search query, include all honeypots

    const query = searchQuery.toLowerCase();

    // Check if any honeypot property contains the search query
    return (
      honeypot.name?.toLowerCase().includes(query) ||
      honeypot.type?.toLowerCase().includes(query) ||
      honeypot.ip_address?.toLowerCase().includes(query) ||
      honeypot.status?.toLowerCase().includes(query) ||
      honeypot.emulated_system?.toLowerCase().includes(query) ||
      honeypot.container_id?.toLowerCase().includes(query) ||
      String(honeypot.internal_port)?.includes(query) ||
      String(honeypot.mapped_port)?.includes(query)
    );
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="flex gap-2">
              <div className="h-3 bg-gray-200 rounded w-16"></div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p className="font-bold">Error</p>
        <p>{error}</p>
        <button
          onClick={loadHoneypots}
          className="mt-2 bg-red-700 text-white px-3 py-1 rounded text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  // No honeypots at all
  if (honeypots.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No honeypots found</p>
      </div>
    );
  }

  // Honeypots exist but none match the search criteria
  if (filteredHoneypots.length === 0 && searchQuery) {
    return (
      <div className="text-center py-8 border border-gray-200 rounded-lg p-6 bg-white">
        <p className="text-gray-600 font-medium text-lg">
          No matching honeypots
        </p>
        <p className="text-gray-500 mt-2">
          No honeypots match your search query: "{searchQuery}"
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-sky-600 hover:text-sky-800 text-sm font-medium"
        >
          Clear search and show all honeypots
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredHoneypots.map((honeypot) => (
        <HoneypotCard
          key={honeypot.id}
          honeypot={honeypot}
          onUpdate={loadHoneypots}
        />
      ))}
    </div>
  );
}
