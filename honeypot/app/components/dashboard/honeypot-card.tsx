// components/dashboard/honeypot-card.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Honeypot, deployHoneypot, deleteHoneypot } from "@/lib/api-client";
import {
  ShieldCheck, // Replaces ShieldCheckIcon
  AlertTriangle, // Replaces ExclamationTriangleIcon
  Settings, // Replaces CogIcon
  Trash2, // Replaces TrashIcon
  Play, // Replaces PlayIcon
  Eye, // Replaces EyeIcon
  Loader2, // Replaces ArrowPathIcon (common Lucide spinner)
} from "lucide-react"; // Import from lucide-react

interface HoneypotCardProps {
  honeypot: Honeypot;
  onUpdate?: () => void;
}

export default function HoneypotCard({
  honeypot,
  onUpdate,
}: HoneypotCardProps) {
  const [isDeploying, setIsDeploying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isLoading = isDeploying || isDeleting; // Combined loading state

  const handleDeploy = async () => {
    try {
      setIsDeploying(true);
      await deployHoneypot(honeypot.id);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error deploying honeypot:", error);
      alert("Failed to deploy honeypot. Please try again.");
    } finally {
      setIsDeploying(false);
    }
  };

  const handleDelete = async () => {
    // Improved confirmation message
    if (
      !confirm(
        `Are you sure you want to delete the honeypot "${honeypot.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteHoneypot(honeypot.id);
      if (onUpdate) onUpdate(); // Refresh list after delete
    } catch (error) {
      console.error("Error deleting honeypot:", error);
      alert("Failed to delete honeypot. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Determine status color and icon using Lucide icons
  const getStatusAttributes = () => {
    switch (honeypot.status) {
      case "active":
        return {
          bgColor: "bg-emerald-100",
          textColor: "text-emerald-800",
          ringColor: "ring-emerald-600/20",
          // Use Lucide icon: ShieldCheck
          icon: <ShieldCheck className="h-4 w-4 mr-1.5 text-emerald-600" />,
          text: "Active",
        };
      case "error":
        return {
          bgColor: "bg-rose-100",
          textColor: "text-rose-800",
          ringColor: "ring-rose-600/20",
          // Use Lucide icon: AlertTriangle
          icon: <AlertTriangle className="h-4 w-4 mr-1.5 text-rose-600" />,
          text: "Error",
        };
      default: // Assuming 'inactive', 'pending', 'deploying', 'deleting' etc.
        return {
          bgColor: "bg-slate-100",
          textColor: "text-slate-800",
          ringColor: "ring-slate-500/20",
          // Use Lucide icon: Settings (or Cog if preferred)
          icon: <Settings className="h-4 w-4 mr-1.5 text-slate-600" />,
          text:
            honeypot.status.charAt(0).toUpperCase() + honeypot.status.slice(1), // Capitalize status
        };
    }
  };

  const statusAttrs = getStatusAttributes();

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out overflow-hidden border border-slate-100">
      <div className="p-5">
        {/* Top section: Name and Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          {" "}
          {/* Adjusted gap and layout for responsiveness */}
          {/* Left side info */}
          <div className="flex-grow min-w-0">
            {" "}
            {/* Added flex-grow and min-w-0 for potential wrapping */}
            <h2
              className="text-lg font-semibold text-slate-800 leading-tight truncate"
              title={honeypot.name}
            >
              {" "}
              {/* Added truncate */}
              {honeypot.name}
            </h2>
            <p className="text-xs text-slate-500 mt-1">ID: {honeypot.id}</p>
            {/* Moved Type/IP/Port here for better grouping on small screens */}
            <div className="text-sm text-slate-600 mt-2">
              <span className="font-medium">{honeypot.type}</span>
              <span className="mx-2 text-slate-300">|</span>
              <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                {honeypot.ip_address}:{honeypot.port}
              </code>
            </div>
          </div>
          {/* Action Buttons */}
          <div className="flex items-center space-x-2 flex-shrink-0 w-full sm:w-auto justify-end">
            {" "}
            {/* Control width and alignment */}
            {honeypot.status !== "active" && (
              <button
                onClick={handleDeploy}
                disabled={isLoading}
                title="Deploy Honeypot"
                className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDeploying ? (
                  // Use Lucide spinner: Loader2
                  <Loader2 className="animate-spin h-4 w-4 mr-1.5" />
                ) : (
                  // Use Lucide icon: Play
                  <Play className="h-4 w-4 mr-1.5" />
                )}
                {isDeploying ? "Deploying..." : "Deploy"}
              </button>
            )}
            <Link
              href={`/honeypots/${honeypot.id}`}
              title="View Details"
              className="inline-flex items-center justify-center px-3 py-1.5 border border-slate-300 text-xs font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              {/* Use Lucide icon: Eye */}
              <Eye className="h-4 w-4 mr-1.5" />
              Details
            </Link>
            <button
              onClick={handleDelete}
              disabled={isLoading}
              title="Delete Honeypot"
              className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isDeleting ? (
                // Use Lucide spinner: Loader2
                <Loader2 className="animate-spin h-4 w-4 mr-1.5" />
              ) : (
                // Use Lucide icon: Trash2
                <Trash2 className="h-4 w-4 mr-1.5" />
              )}
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>

        {/* Bottom section: Status and Attack Count */}
        <div className="flex items-center justify-between text-sm border-t border-slate-100 pt-4 mt-4">
          {" "}
          {/* Added top border */}
          {/* Status Badge */}
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${statusAttrs.bgColor} ${statusAttrs.textColor} ${statusAttrs.ringColor}`}
          >
            {statusAttrs.icon}
            {statusAttrs.text}
          </span>
          {/* Attack Count */}
          <span className="text-slate-500">
            {honeypot.attack_count}{" "}
            {honeypot.attack_count === 1 ? "attack" : "attacks"} detected
          </span>
        </div>
      </div>
    </div>
  );
}
