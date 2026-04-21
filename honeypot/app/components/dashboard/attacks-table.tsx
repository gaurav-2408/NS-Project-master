// components/dashboard/attacks-table.tsx
"use client";

import { useState, useEffect } from "react";
import { formatToIST } from "@/utils/dateUtils";
import { Attack } from "@/lib/api-client";

interface AttacksTableProps {
  attacks: Attack[];
  isLoading?: boolean;
}

export default function AttacksTable({
  attacks,
  isLoading = false,
}: AttacksTableProps) {
  const [selectedAttack, setSelectedAttack] = useState<Attack | null>(null);

  // Function to get appropriate badge style based on attack type
  const getAttackTypeBadgeStyle = (type: string) => {
    switch (type.toLowerCase()) {
      case "login_attempt":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
      case "sql_injection":
        return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
      case "xss":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300";
      case "port_scan":
        return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
      case "dos":
      case "dos_attempt":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
      case "csrf":
        return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800/60 dark:text-gray-300";
    }
  };

  // Function to get attack type icon
  const getAttackTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "login_attempt":
        return (
          <svg
            className="w-3.5 h-3.5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
        );
      case "sql_injection":
        return (
          <svg
            className="w-3.5 h-3.5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
        );
      case "xss":
        return (
          <svg
            className="w-3.5 h-3.5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        );
      case "port_scan":
        return (
          <svg
            className="w-3.5 h-3.5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
            />
          </svg>
        );
      case "dos":
      case "dos_attempt":
        return (
          <svg
            className="w-3.5 h-3.5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        );
      case "csrf":
        return (
          <svg
            className="w-3.5 h-3.5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-3.5 h-3.5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-100 dark:bg-gray-700 w-full"></div>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-14 border-t border-gray-100 dark:border-gray-700 flex"
            >
              <div className="w-1/5 p-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded-md"></div>
              </div>
              <div className="w-1/5 p-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded-md"></div>
              </div>
              <div className="w-1/5 p-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded-md"></div>
              </div>
              <div className="w-1/5 p-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded-md"></div>
              </div>
              <div className="w-1/5 p-4">
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-600 rounded-md"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!attacks || attacks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-10 flex flex-col items-center justify-center text-center">
        <svg
          className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          No attacks detected yet
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
          Attacks will appear here once they are detected
        </p>
      </div>
    );
  }

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }).format(date);
  };

  // Format attack type for display
  const formatAttackType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Format credentials for display
  const formatCredentials = (attack: Attack) => {
    if (attack.username && attack.password) {
      return (
        <span>
          <span className="font-medium text-gray-800 dark:text-gray-200">
            {attack.username}
          </span>
          <span className="text-gray-400 dark:text-gray-500 px-1">/</span>
          <span className="text-gray-600 dark:text-gray-400">
            {attack.password}
          </span>
        </span>
      );
    }
    if (attack.username) {
      return (
        <span className="font-medium text-gray-800 dark:text-gray-200">
          {attack.username}
        </span>
      );
    }
    return <span className="text-gray-400 dark:text-gray-600">-</span>;
  };

  return (
    <div className=" rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden transition-all duration-200 ">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-750">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Source IP
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Attack Type
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Credentials
              </th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
            {attacks.map((attack, index) => (
              <tr
                key={attack.id}
                className={` transition-colors ${
                  index < 3 ? "animate-fadeIn" : ""
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {formatToIST(attack.timestamp)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-1 rounded text-sm font-mono text-gray-100 dark:text-gray-300  dark:bg-gray-750">
                    {attack.source_ip}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getAttackTypeBadgeStyle(
                      attack.attack_type
                    )}`}
                  >
                    {getAttackTypeIcon(attack.attack_type)}
                    {formatAttackType(attack.attack_type)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-mono">
                    {formatCredentials(attack)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium inline-flex items-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 rounded"
                    onClick={() => setSelectedAttack(attack)}
                  >
                    Details
                    <svg
                      className="w-4 h-4 ml-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {attacks.length > 10 && (
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-750 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing <span className="font-medium">{attacks.length}</span>{" "}
            attacks
          </div>

          <div className="flex space-x-2">
            <button
              disabled
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800"
            >
              Previous
            </button>
            <button
              disabled
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Attack details modal with improved styling */}
      {selectedAttack && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-750 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
                <span
                  className={`w-2 h-2 rounded-full mr-2 ${
                    selectedAttack.attack_type === "login_attempt"
                      ? "bg-blue-500"
                      : selectedAttack.attack_type === "sql_injection"
                      ? "bg-red-500"
                      : selectedAttack.attack_type === "xss"
                      ? "bg-purple-500"
                      : selectedAttack.attack_type === "port_scan"
                      ? "bg-green-500"
                      : selectedAttack.attack_type === "dos"
                      ? "bg-amber-500"
                      : "bg-gray-500"
                  }`}
                ></span>
                Attack Details
              </h3>
              <button
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setSelectedAttack(null)}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-400 mb-1">
                    Source IP
                  </p>
                  <p className="font-mono text-gray-800">
                    {selectedAttack.source_ip}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-400 mb-1">
                    Timestamp
                  </p>
                  <p className="text-gray-800">
                    {formatTime(selectedAttack.timestamp)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Attack Type
                  </p>
                  <p className="text-gray-800 flex items-center">
                    {getAttackTypeIcon(selectedAttack.attack_type)}
                    {formatAttackType(selectedAttack.attack_type)}
                  </p>
                </div>
                {selectedAttack.username && (
                  <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-500  mb-1">
                      Username
                    </p>
                    <p className="font-mono text-gray-800 ">
                      {selectedAttack.username}
                    </p>
                  </div>
                )}
                {selectedAttack.password && (
                  <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Password
                    </p>
                    <p className="font-mono text-gray-800">
                      {selectedAttack.password}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Raw Details
                  </p>
                  <button
                    className="text-xs bg-gray-100 dark:bg-gray-750 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded flex items-center transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        JSON.stringify(selectedAttack.details, null, 2)
                      );
                    }}
                  >
                    <svg
                      className="w-3.5 h-3.5 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                      />
                    </svg>
                    Copy
                  </button>
                </div>
                <pre className="bg-gray-800 dark:bg-gray-900 text-gray-200 dark:text-gray-300 p-4 rounded-lg text-xs overflow-x-auto">
                  {JSON.stringify(selectedAttack.details, null, 2)}
                </pre>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  className="px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800"
                  onClick={() => setSelectedAttack(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
