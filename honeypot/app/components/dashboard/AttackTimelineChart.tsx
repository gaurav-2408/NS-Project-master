// components/dashboard/AttackTimelineChart.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { formatToIST } from "@/utils/dateUtils"; // Use your existing utility

const BACKEND_URL = "http://localhost:8000";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface AttackTimelineProps {
  honeypotId?: string;
  refreshInterval?: number;
}

const AttackTimelineChart: React.FC<AttackTimelineProps> = ({
  honeypotId,
  refreshInterval = 30,
}) => {
  const [rawData, setRawData] = useState<{ time: Date; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Format a date to IST display string using Intl API
  const formatTimeIST = (timestamp: Date) => {
    return new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata", // Explicit IST timezone
    }).format(timestamp);
  };

  // Format just for x-axis ticks (date + time but compact)
  const formatAxisLabel = (timestamp: Date) => {
    return new Intl.DateTimeFormat("en-IN", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }).format(timestamp);
  };

  // Round minutes to nearest 10-minute interval
  const roundToTenMinutes = (date: Date): Date => {
    const result = new Date(date);
    result.setMinutes(Math.floor(result.getMinutes() / 10) * 10, 0, 0);
    return result;
  };

  const fetchAttackData = async () => {
    try {
      const url = honeypotId
        ? `${BACKEND_URL}/honeypots/${honeypotId}/attacks?limit=100`
        : `${BACKEND_URL}/attacks?limit=100`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.attacks || data.attacks.length === 0) {
        setRawData([]);
        setIsLoading(false);
        return;
      }

      // Group attacks by 10-minute intervals
      const attacksByTime = new Map<number, number>();

      data.attacks.forEach((attack: any) => {
        // Parse timestamp to Date object
        const attackTime = new Date(attack.timestamp);

        // Round to nearest 10-minute interval
        const roundedTime = roundToTenMinutes(attackTime);

        // Use timestamp as key
        const timeKey = roundedTime.getTime();

        // Count attacks in this interval
        attacksByTime.set(timeKey, (attacksByTime.get(timeKey) || 0) + 1);
      });

      // Sort by time (oldest first)
      const sortedEntries = Array.from(attacksByTime.entries()).sort(
        (a, b) => a[0] - b[0]
      );

      // Create data objects for chart
      const timeData = sortedEntries.map(([time, count]) => ({
        time: new Date(time),
        count,
      }));

      setRawData(timeData);
      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch attack data:", err);
      setIsLoading(false);
      setError("Failed to load attack data. Please try again.");
    }
  };

  useEffect(() => {
    fetchAttackData();

    // Set up automatic refresh
    const interval = setInterval(() => {
      fetchAttackData();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [honeypotId, refreshInterval]);

  const chartData = {
    datasets: [
      {
        label: "Number of Attacks",
        data: rawData.map((item) => ({
          x: item.time,
          y: item.count,
        })),
        fill: {
          target: "origin",
          above: "rgba(75, 192, 192, 0.1)", // Light fill color
        },
        backgroundColor: "rgb(56, 178, 172)", // Updated teal color
        borderColor: "rgba(56, 178, 172, 0.8)", // Updated teal color
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "rgb(56, 178, 172)",
        pointBorderColor: "rgb(255, 255, 255)",
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: "time" as const,
        time: {
          unit: "minute" as const,
          stepSize: 10,
        },
        grid: {
          color: "rgba(156, 163, 175, 0.1)", // Lighter grid lines
          tickBorderDash: [2, 3],
        },
        border: {
          color: "rgba(156, 163, 175, 0.3)",
        },
        title: {
          display: true,
          text: "Time (IST)",
          color: "#6B7280", // Gray-500
          font: {
            size: 12,
            weight: "500" as const,
          },
          padding: 10,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          callback: function (value: any) {
            // Show month, day, and time like "Apr 8, 7:00 AM" for x-axis
            const date = new Date(value);
            return formatAxisLabel(date);
          },
          color: "#6B7280", // Gray-500
          font: {
            size: 10,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(156, 163, 175, 0.1)", // Lighter grid lines
          tickBorderDash: [2, 3],
        },
        border: {
          color: "rgba(156, 163, 175, 0.3)",
        },
        title: {
          display: true,
          text: "Number of Attacks",
          color: "#6B7280", // Gray-500
          font: {
            size: 12,
            weight: "500" as const,
          },
          padding: 10,
        },
        ticks: {
          precision: 0,
          stepSize: 1,
          color: "#6B7280", // Gray-500
          font: {
            size: 10,
          },
        },
      },
    },
    plugins: {
      title: {
        display: false, // Hide default title, we'll use our own
      },
      tooltip: {
        backgroundColor: "rgba(17, 24, 39, 0.9)",
        titleColor: "#F9FAFB",
        bodyColor: "#F3F4F6",
        borderColor: "rgba(107, 114, 128, 0.4)",
        borderWidth: 0.5,
        padding: 10,
        cornerRadius: 6,
        boxPadding: 4,
        usePointStyle: true,
        callbacks: {
          title: (items: any) => {
            if (!items.length) return "";

            // Get the date object from the tooltip
            const date = new Date(items[0].parsed.x);

            // Use the same Intl formatter as your table component
            return formatTimeIST(date);
          },
          label: (context: any) => {
            return `Attacks: ${context.parsed.y}`;
          },
        },
      },
      legend: {
        display: false, // Hide the legend, we don't need it with just one dataset
      },
    },
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
          <svg
            className="w-5 h-5 mr-2 text-teal-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Attack Timeline (IST)
        </h3>

        <button
          onClick={() => {
            setIsLoading(true);
            fetchAttackData();
          }}
          className="text-sm bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/20 dark:hover:bg-teal-900/30 text-teal-600 dark:text-teal-400 px-3 py-1.5 rounded-lg border border-teal-200 dark:border-teal-900/50 flex items-center transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 dark:focus:ring-offset-gray-800"
        >
          <svg
            className="w-4 h-4 mr-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      <div className="p-5">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-64 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-100 dark:border-gray-700">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-t-2 border-b-2 border-teal-500 animate-spin"></div>
              <div
                className="w-12 h-12 rounded-full border-l-2 border-r-2 border-transparent border-opacity-50 animate-spin absolute top-0 left-0"
                style={{
                  animationDirection: "reverse",
                  animationDuration: "1s",
                }}
              ></div>
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Loading attack data...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400">
            <svg
              className="w-12 h-12 mb-3 text-red-500 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="font-medium mb-2">{error}</p>
            <button
              className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center"
              onClick={() => {
                setIsLoading(true);
                fetchAttackData();
              }}
            >
              <svg
                className="w-4 h-4 mr-1.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Try Again
            </button>
          </div>
        ) : rawData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-100 dark:border-gray-700">
            <svg
              className="w-16 h-16 mb-3 text-gray-300 dark:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
              />
            </svg>
            <p className="font-medium text-gray-600 dark:text-gray-400">
              No attacks detected yet
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Attacks will be visualized here when detected
            </p>
          </div>
        ) : (
          <div className="h-64 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700 pt-2 pb-4 px-2 bg-gray-50 dark:bg-gray-750">
            <Line data={chartData} options={options} />
          </div>
        )}
      </div>

      {rawData.length > 0 && !isLoading && !error && (
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-750 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
          <span>Showing {rawData.length} data points</span>
          <span>Last refreshed: {new Date().toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
};

export default AttackTimelineChart;
