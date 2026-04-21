// app/honeypots/[id]/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getHoneypotById,
  getHoneypotAttacks,
  deployHoneypot,
  deleteHoneypot,
  Honeypot,
  Attack, // Assuming Attack type is defined in api-client
} from "@/lib/api-client";
import AttacksTable from "@/app/components/dashboard/attacks-table"; // Ensure paths are correct
import AttackMonitor from "@/app/components/dashboard/attack-monitor";
import AIInsightsPanel from "@/app/components/dashboard/AIInsightsPanel";
import AttackSimulator from "@/app/components/dashboard/AttackSimulator"; // Include the simulator
import {
  ArrowLeft,
  Trash2,
  Check,
  Copy,
  Terminal, // For SSH
  Globe, // For Web
  Server, // For FTP / Default
  Settings,
  Link as LinkIcon, // Connection String icon
  AlertTriangle, // Warning icon
  Info, // Description icon
  Activity, // Status icon
  ShieldAlert, // Attack history icon
  CalendarDays,
  Power, // Deploy icon
  PowerOff, // Offline status icon
  BarChart3, // Total attacks icon
  X, // Close modal icon
  Loader2, // Loading spinner
  Bot, // Added Bot for AI
} from "lucide-react"; // Added Bot icon

// Helper to format numbers (optional)
const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

// Mapping Honeypot Type to Lucide Icon
const HoneypotTypeIcon = ({
  type,
  className,
}: {
  type: string;
  className?: string;
}) => {
  const baseClassName = `w-5 h-5 ${className || ""}`; // Adjusted size slightly for context
  switch (type?.toLowerCase()) {
    case "ssh":
      return <Terminal className={baseClassName} />;
    case "web":
    case "http":
    case "https":
      return <Globe className={baseClassName} />;
    case "ftp":
      return <Server className={baseClassName} />;
    // Add more specific icons if needed
    default:
      return <Server className={baseClassName} />; // Default server icon
  }
};

export default function HoneypotDetailPage() {
  // --- State and Hooks ---
  const params = useParams();
  const router = useRouter();
  const honeypotId = params.id as string;
  const [honeypot, setHoneypot] = useState<Honeypot | null>(null);
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [loading, setLoading] = useState(true);
  const [attacksLoading, setAttacksLoading] = useState(true);
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // --- Data Fetching Logic ---
  const loadAttacks = useCallback(
    async (isInitialLoad = false) => {
      if (!isInitialLoad) setAttacksLoading(true);
      try {
        const result = await getHoneypotAttacks(honeypotId, 50); // Fetch latest 50 attacks
        setAttacks(result.attacks);
      } catch (err: any) {
        console.error("Failed to load attacks:", err);
        setAttacks([]); // Clear attacks on error
      } finally {
        setAttacksLoading(false);
      }
    },
    [honeypotId]
  );

  const loadHoneypotDetails = useCallback(
    async (isInitialLoad = false) => {
      if (isInitialLoad) {
        setLoading(true);
        setAttacksLoading(true); // Assume attacks need loading initially too
      }
      setError(null);
      try {
        const data = await getHoneypotById(honeypotId);
        setHoneypot(data);
        if (data.status === "active") {
          await loadAttacks(isInitialLoad); // Pass initial load flag
        } else {
          setAttacks([]); // Clear attacks if not active
          setAttacksLoading(false); // Stop attack loading if not active
        }
      } catch (err: any) {
        console.error("Error loading honeypot details:", err);
        setError(err.message || "Failed to load honeypot details");
        setHoneypot(null); // Clear data on error
        setAttacks([]);
        setAttacksLoading(false);
      } finally {
        if (isInitialLoad) {
          setLoading(false);
        }
      }
    },
    [honeypotId, loadAttacks]
  ); // Include loadAttacks dependency

  // Initial Load & Polling Effect
  useEffect(() => {
    if (!honeypotId) return;

    loadHoneypotDetails(true); // Initial load

    // Polling for honeypot status/details
    const interval = setInterval(() => {
      if (!isActionInProgress && document.visibilityState === "visible") {
        // Only poll if tab is visible
        getHoneypotById(honeypotId)
          .then((data) => {
            const wasActive = honeypot?.status === "active";
            setHoneypot(data);
            // If status *changed* to active, reload attacks
            if (data.status === "active" && !wasActive) {
              loadAttacks();
            }
          })
          .catch((err) => console.error("Error refreshing honeypot:", err));
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [honeypotId, isActionInProgress]); // Keep essential dependencies

  // --- Actions ---
  const handleDeploy = async () => {
    if (!honeypot) return;
    setIsActionInProgress(true);
    try {
      const updated = await deployHoneypot(honeypot.id);
      setHoneypot(updated);
      if (updated.status === "active") {
        await loadAttacks(); // Load attacks immediately after successful deploy
      }
    } catch (err: any) {
      alert(err.message || "Failed to deploy honeypot");
    } finally {
      setIsActionInProgress(false);
    }
  };

  const handleDelete = async () => {
    if (!honeypot) return;
    setIsActionInProgress(true); // Prevent other actions during delete
    try {
      await deleteHoneypot(honeypot.id);
      router.push("/honeypots"); // Redirect after successful deletion
    } catch (err: any) {
      alert(err.message || "Failed to delete honeypot");
      setIsActionInProgress(false); // Only reset if delete fails
    } finally {
      setShowDeleteModal(false);
    }
  };

  const handleCopyConnectionString = useCallback(() => {
    if (!honeypot) return;
    const host = honeypot.public_ip || window.location.hostname; // Prefer public IP if available
    const port = honeypot.mapped_port || honeypot.port;
    let connString = "";

    switch (honeypot.type?.toLowerCase()) {
      case "ssh":
        connString = `ssh user@${host} -p ${port}`;
        break; // Generic user
      case "ftp":
        connString = `ftp ${host} ${port}`;
        break;
      case "http":
        connString = `http://${host}:${port}`;
        break;
      case "https":
        connString = `https://${host}:${port}`;
        break;
      case "telnet":
        connString = `telnet ${host} ${port}`;
        break;
      // Add more protocols as needed
      default:
        connString = `${
          honeypot.type?.toLowerCase() || "protocol"
        }://${host}:${port}`;
    }

    navigator.clipboard.writeText(connString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [honeypot]);

  // Memoize connection string for display
  const connectionString = useMemo(() => {
    if (!honeypot) return "";
    const host = honeypot.public_ip || window.location.hostname; // Prefer public IP if available
    const port = honeypot.mapped_port || honeypot.port;
    switch (honeypot.type?.toLowerCase()) {
      case "ssh":
        return `ssh user@${host} -p ${port}`;
      case "ftp":
        return `ftp ${host} ${port}`;
      case "http":
        return `http://${host}:${port}`;
      case "https":
        return `https://${host}:${port}`;
      case "telnet":
        return `telnet ${host} ${port}`;
      default:
        return `${
          honeypot.type?.toLowerCase() || "protocol"
        }://${host}:${port}`;
    }
  }, [honeypot]);

  // --- Render Logic ---

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Overall background */}
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Centered container */}
        {loading ? (
          // --- Loading Skeleton ---
          <div className="animate-pulse space-y-6">
            <div className="h-5 bg-slate-200 rounded w-36"></div>{" "}
            {/* Back link */}
            <div className="bg-white rounded-lg shadow-md p-6 h-24"></div>{" "}
            {/* Header */}
            {/* Initial Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-slate-700 rounded-lg h-[400px]"></div>{" "}
              {/* Sidebar */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="h-24 bg-white rounded-lg shadow-md"></div>{" "}
                  {/* Stat 1 */}
                  <div className="h-24 bg-white rounded-lg shadow-md"></div>{" "}
                  {/* Stat 2 */}
                </div>
              </div>
            </div>
            {/* Full Width Sections Skeleton */}
            <div className="h-60 bg-white rounded-lg shadow-md"></div>{" "}
            {/* Monitor/Simulator Block */}
            <div className="h-48 bg-white rounded-lg shadow-md"></div>{" "}
            {/* AI Insights */}
            <div className="h-64 bg-white rounded-lg shadow-md"></div>{" "}
            {/* Table */}
          </div>
        ) : error || !honeypot ? (
          // --- Error State ---
          <div
            className="flex items-center justify-center"
            style={{ minHeight: "calc(100vh - 10rem)" }}
          >
            {/* Center error vertically */}
            <div className="bg-white rounded-lg shadow-md p-8 border border-rose-100 max-w-lg w-full text-center">
              <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-800 mb-2">
                Error Loading Honeypot
              </h2>
              <p className="text-slate-600 mb-6">
                {error ||
                  "The requested honeypot could not be found or loaded."}
              </p>
              <Link
                href="/honeypots"
                className="inline-flex items-center px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-md transition-colors shadow-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back to Honeypots List
              </Link>
            </div>
          </div>
        ) : (
          // --- Main Detail Page Render ---
          <>
            {/* Back Link */}
            <Link
              href="/honeypots"
              className="inline-flex items-center mb-6 text-sky-600 hover:text-sky-800 font-medium transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Honeypots
            </Link>

            {/* Header Card */}
            <div className="bg-white rounded-lg shadow-md mb-6 border border-slate-200">
              <div className="px-6 py-5">
                {" "}
                {/* Removed border-b here */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  {/* Left side: Icon, Name, Status, Date */}
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-lg flex-shrink-0 ${
                        honeypot.status === "active"
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <HoneypotTypeIcon
                        type={honeypot.type}
                        className="w-7 h-7"
                      />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                        {honeypot.name}
                      </h1>
                      <div className="flex flex-wrap items-center mt-1.5 gap-x-4 gap-y-1 text-sm">
                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            honeypot.status === "active"
                              ? "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-600/20"
                              : honeypot.status === "error"
                              ? "bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-600/20"
                              : "bg-slate-100 text-slate-800 ring-1 ring-inset ring-slate-500/20"
                          }`}
                        >
                          {honeypot.status === "active" && (
                            <span className="w-1.5 h-1.5 mr-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                          )}
                          {honeypot.status.charAt(0).toUpperCase() +
                            honeypot.status.slice(1)}
                        </span>
                        {/* Creation Date */}
                        <span className="text-slate-500 inline-flex items-center">
                          <CalendarDays className="w-3.5 h-3.5 mr-1 text-slate-400" />{" "}
                          Created:{" "}
                          {new Date(honeypot.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Right side: Actions */}
                  <div className="flex gap-3 w-full md:w-auto flex-shrink-0 mt-4 md:mt-0">
                    {/* Deploy Button */}
                    {honeypot.status !== "active" && (
                      <button
                        onClick={handleDeploy}
                        disabled={isActionInProgress}
                        className="inline-flex w-full md:w-auto items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isActionInProgress ? (
                          <Loader2 className="animate-spin h-4 w-4 mr-1.5" />
                        ) : (
                          <Power className="h-4 w-4 mr-1.5" />
                        )}
                        {isActionInProgress ? "Deploying..." : "Deploy"}
                      </button>
                    )}
                    {/* Delete Button */}
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      disabled={isActionInProgress}
                      className="inline-flex w-full md:w-auto items-center justify-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-rose-700 bg-white hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* --- Initial Content Grid (Config Sidebar + Stats) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* --- Sidebar (Left Column) --- */}
              <aside className="lg:col-span-1 bg-slate-800 rounded-lg shadow-lg p-6 flex flex-col gap-6 h-fit sticky top-8">
                {/* Configuration Section */}
                <div className="border-b border-slate-700 pb-6">
                  <h2 className="text-lg font-semibold text-slate-100 flex items-center mb-4">
                    <Settings className="w-5 h-5 mr-2 text-sky-400" />{" "}
                    Configuration
                  </h2>
                  <dl className="space-y-2.5 text-sm">
                    {/* Key-Value pairs for config - styled for dark bg */}
                    <div className="flex justify-between items-center">
                      {" "}
                      <dt className="text-slate-400">Type</dt>{" "}
                      <dd className="text-slate-200 font-medium inline-flex items-center gap-1.5">
                        <HoneypotTypeIcon
                          type={honeypot.type}
                          className="w-4 h-4"
                        />
                        {honeypot.type}
                      </dd>{" "}
                    </div>
                    <div className="flex justify-between items-center">
                      {" "}
                      <dt className="text-slate-400">IP Address</dt>{" "}
                      <dd className="text-slate-200 font-mono text-xs">
                        {honeypot.ip_address}
                      </dd>{" "}
                    </div>
                    <div className="flex justify-between items-center">
                      {" "}
                      <dt className="text-slate-400">Internal Port</dt>{" "}
                      <dd className="text-slate-200">{honeypot.port}</dd>{" "}
                    </div>
                    {honeypot.mapped_port &&
                      honeypot.mapped_port !== honeypot.port && (
                        <div className="flex justify-between items-center">
                          {" "}
                          <dt className="text-slate-400">Mapped Port</dt>{" "}
                          <dd className="text-slate-200 font-semibold">
                            {honeypot.mapped_port}
                          </dd>{" "}
                        </div>
                      )}
                    {honeypot.public_ip && (
                      <div className="flex justify-between items-center">
                        {" "}
                        <dt className="text-slate-400">Public IP</dt>{" "}
                        <dd className="text-slate-200 font-mono text-xs">
                          {honeypot.public_ip}
                        </dd>{" "}
                      </div>
                    )}
                    {honeypot.emulated_system && (
                      <div className="flex justify-between items-center">
                        {" "}
                        <dt className="text-slate-400">Emulated System</dt>{" "}
                        <dd className="text-slate-200">
                          {honeypot.emulated_system}
                        </dd>{" "}
                      </div>
                    )}
                    {honeypot.container_id && (
                      <div className="flex justify-between items-center">
                        {" "}
                        <dt className="text-slate-400">Container ID</dt>{" "}
                        <dd className="text-slate-200 font-mono text-xs">
                          {honeypot.container_id.substring(0, 12)}...
                        </dd>{" "}
                      </div>
                    )}
                  </dl>
                </div>

                {/* Connection String Section */}
                {honeypot.status === "active" && connectionString && (
                  <div className="border-b border-slate-700 pb-6">
                    <h3 className="text-base font-semibold text-slate-100 flex items-center mb-3">
                      <LinkIcon className="w-4 h-4 mr-2 text-sky-400" />{" "}
                      Connection String
                    </h3>
                    <div className="relative group">
                      <pre className="text-xs bg-slate-700 text-slate-100 p-3 rounded-md overflow-x-auto font-mono">
                        <code>{connectionString}</code>
                      </pre>
                      <button
                        onClick={handleCopyConnectionString}
                        className="absolute top-1.5 right-1.5 p-1.5 rounded-md text-slate-400 hover:text-slate-100 bg-slate-600 hover:bg-slate-500 transition-all opacity-50 group-hover:opacity-100 focus:opacity-100"
                        title={copied ? "Copied!" : "Copy to clipboard"}
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-amber-300 bg-amber-900/30 border border-amber-800/50 p-2 rounded-md mt-3 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-400" />
                      <span>
                        Simulated service. Do not use real credentials.
                      </span>
                    </p>
                  </div>
                )}

                {/* Description Section */}
                {honeypot.description && (
                  <div>
                    {" "}
                    {/* No border needed for the last item */}
                    <h2 className="text-base font-semibold text-slate-100 flex items-center mb-3">
                      <Info className="w-5 h-5 mr-2 text-sky-400" /> Description
                    </h2>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {honeypot.description}
                    </p>
                  </div>
                )}
              </aside>

              {/* --- Stats Area (Right Column in Initial Grid) --- */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                {/* Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Total Attacks Card */}
                  <div className="bg-white rounded-lg shadow-md p-5 border border-slate-200 flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-sky-100 text-sky-600 flex-shrink-0">
                      {" "}
                      <BarChart3 className="w-7 h-7" />{" "}
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-slate-900">
                        {formatNumber(honeypot.attack_count)}
                      </p>
                      <p className="text-sm text-slate-500">Total Attacks</p>
                    </div>
                  </div>
                  {/* Status Card */}
                  <div
                    className={`rounded-lg shadow-md p-5 border flex items-center gap-4 ${
                      honeypot.status === "active"
                        ? "bg-white border-slate-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div
                      className={`p-3 rounded-lg flex-shrink-0 ${
                        honeypot.status === "active"
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {honeypot.status === "active" ? (
                        <Activity className="w-7 h-7" />
                      ) : (
                        <PowerOff className="w-7 h-7" />
                      )}
                    </div>
                    <div>
                      <p
                        className={`text-xl font-bold ${
                          honeypot.status === "active"
                            ? "text-emerald-700"
                            : "text-slate-700"
                        }`}
                      >
                        {honeypot.status === "active" ? "Online" : "Offline"}
                      </p>
                      <p className="text-sm text-slate-500">Current Status</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* --- Attack Monitor & Simulator Section (Full Width) --- */}
            {honeypot.status === "active" && (
              <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden mb-6">
                <h2 className="text-base font-semibold text-slate-700 flex items-center px-5 py-3 border-b border-slate-200 bg-slate-50">
                  <AlertTriangle className="w-4 h-4 mr-2 text-rose-500" /> Live
                  Attack Monitor & Simulator
                </h2>
                {/* Grid for side-by-side layout */}
                <div className="grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x divide-slate-200">
                  <div className="p-5 min-h-[200px]">
                    <AttackMonitor honeypotId={honeypot.id} limit={5} />
                  </div>
                  <div className="p-5">
                    {/* Pass targetHoneypotId if AttackSimulator needs it */}
                    <AttackSimulator targetHoneypotId={honeypot.id} />
                  </div>
                </div>
              </div>
            )}

            {/* --- AI Insights Section (Full Width) --- */}
            <div className="bg-white rounded-lg shadow-md border border-slate-200 mb-6">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center px-6 py-4 border-b border-slate-200">
                <Bot className="w-5 h-5 mr-2 text-purple-600" /> AI Insights
              </h2>
              <div className="p-6">
                {" "}
                {/* Add padding if panel doesn't have it */}
                <AIInsightsPanel honeypotId={honeypot.id} />
              </div>
            </div>

            {/* --- Attack History Table (Full Width) --- */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center px-6 py-4 border-b border-slate-200">
                <ShieldAlert className="w-5 h-5 mr-2 text-rose-600" /> Attack
                History
              </h2>
              <AttacksTable attacks={attacks} isLoading={attacksLoading} />
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-6 m-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-slate-800">
                      Confirm Deletion
                    </h3>
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                    >
                      {" "}
                      <X className="w-5 h-5" />{" "}
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 mb-6">
                    Are you sure you want to delete the honeypot{" "}
                    <span className="font-medium text-slate-800">
                      {honeypot.name}
                    </span>
                    ? This action will stop and remove the honeypot container
                    and associated data. This cannot be undone.
                  </p>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isActionInProgress}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 flex items-center"
                    >
                      {isActionInProgress ? (
                        <Loader2 className="animate-spin h-4 w-4 mr-1.5" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-1.5" />
                      )}
                      {isActionInProgress ? "Deleting..." : "Delete Honeypot"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
