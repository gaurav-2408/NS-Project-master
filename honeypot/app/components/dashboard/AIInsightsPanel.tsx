// components/dashboard/AIInsightsPanel.tsx
"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface AIInsightsPanelProps {
  honeypotId?: string;
}

export default function AIInsightsPanel({ honeypotId }: AIInsightsPanelProps) {
  const [activeTab, setActiveTab] = useState<string>("analysis");
  const [analysis, setAnalysis] = useState<{
    analysis?: string;
    timestamp?: string;
    error?: string;
  }>({});
  const [recommendations, setRecommendations] = useState<{
    recommendations?: string;
    timestamp?: string;
    error?: string;
  }>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(true); // Set to true by default for better UX

  const fetchAnalysis = async (days: number = 7) => {
    setIsLoading(true);
    try {
      const url = honeypotId
      ? `http://localhost:8000/ai/analysis?days=${days}&honeypot_id=${honeypotId}`
      : `http://localhost:8000/ai/analysis?days=${days}`;
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setAnalysis(data);

        // If there was a try_again flag, set a refresh timer
        if (data.error && data.try_again) {
          const waitTime = parseInt(data.error.match(/\d+/)[0]) || 60;
          // toast.info(`AI service rate limited. Will retry in ${waitTime} seconds.`);

          // Auto-retry after the waiting period
          setTimeout(() => {
            fetchAnalysis(days);
          }, waitTime * 1000);
        }
      } else {
        setAnalysis({ error: data.detail || "Failed to fetch analysis" });
      }
    } catch (error) {
      console.error("Error fetching AI analysis:", error);
      setAnalysis({ error: "Failed to connect to AI service" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    setIsLoading(true);
    try {
      const url = honeypotId
        ? `http://localhost:8000/ai/recommendations?honeypot_id=${honeypotId}`
        : "http://localhost:8000/ai/recommendations";

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setRecommendations(data);
      } else {
        setRecommendations({
          error: data.detail || "Failed to fetch recommendations",
        });
      }
    } catch (error) {
      console.error("Error fetching AI recommendations:", error);
      setRecommendations({ error: "Failed to connect to AI service" });
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    if (activeTab === "analysis") {
      fetchAnalysis();
    } else if (activeTab === "recommendations") {
      fetchRecommendations();
    }
  }, [activeTab, honeypotId]);

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md mb-6">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg text-purple-600 dark:text-purple-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                AI Threat Intelligence
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                AI-powered insights and recommendations
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-full hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors"
            aria-label={expanded ? "Collapse panel" : "Expand panel"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
                expanded ? "transform rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-0">
          {/* Custom Tabs */}
          <div className="w-full">
            <div className="flex border-b border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setActiveTab("analysis")}
                className={`flex items-center gap-2 px-5 py-3 flex-1 justify-center transition-all duration-200 ${
                  activeTab === "analysis"
                    ? "border-b-2 border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/10"
                    : "border-b-2 border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                Attack Analysis
              </button>
              <button
                onClick={() => setActiveTab("recommendations")}
                className={`flex items-center gap-2 px-5 py-3 flex-1 justify-center transition-all duration-200 ${
                  activeTab === "recommendations"
                    ? "border-b-2 border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/10"
                    : "border-b-2 border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                Security Recommendations
              </button>
            </div>

            {/* Analysis Tab Content */}
            <div className={activeTab === "analysis" ? "block" : "hidden"}>
              <div className="relative min-h-[350px] p-6">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-t-2 border-b-2 border-purple-500 animate-spin"></div>
                      <div
                        className="w-12 h-12 rounded-full border-l-2 border-r-2 border-transparent border-opacity-50 animate-spin absolute top-0 left-0"
                        style={{
                          animationDirection: "reverse",
                          animationDuration: "1s",
                        }}
                      ></div>
                    </div>
                    <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium">
                      AI is analyzing attack patterns...
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      This may take a few seconds
                    </p>
                  </div>
                ) : analysis.error ? (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-800 dark:text-red-300 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <svg
                        className="h-5 w-5 text-red-500 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="font-semibold">Analysis Error</p>
                    </div>
                    <p className="text-sm ml-7">{analysis.error}</p>
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                    <ReactMarkdown>
                      {analysis.analysis ||
                        "No analysis available yet. Click refresh to generate an analysis."}
                    </ReactMarkdown>
                    {analysis.timestamp && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-6 border-t border-gray-100 dark:border-gray-700 pt-4">
                        Analysis generated at{" "}
                        {formatTimestamp(analysis.timestamp)}
                      </p>
                    )}
                  </div>
                )}

                {!isLoading && (
                  <div className="absolute top-4 right-4">
                    <button
                      className="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-650 transition-all shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                      onClick={() => fetchAnalysis(7)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Refresh Analysis
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Recommendations Tab Content */}
            <div
              className={activeTab === "recommendations" ? "block" : "hidden"}
            >
              <div className="relative min-h-[350px] p-6">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-t-2 border-b-2 border-purple-500 animate-spin"></div>
                      <div
                        className="w-12 h-12 rounded-full border-l-2 border-r-2 border-transparent border-opacity-50 animate-spin absolute top-0 left-0"
                        style={{
                          animationDirection: "reverse",
                          animationDuration: "1s",
                        }}
                      ></div>
                    </div>
                    <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium">
                      Generating security recommendations...
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      This may take a few seconds
                    </p>
                  </div>
                ) : recommendations.error ? (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-800 dark:text-red-300 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <svg
                        className="h-5 w-5 text-red-500 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="font-semibold">Recommendations Error</p>
                    </div>
                    <p className="text-sm ml-7">{recommendations.error}</p>
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                    <ReactMarkdown>
                      {recommendations.recommendations ||
                        "No recommendations available yet. Click refresh to generate security recommendations."}
                    </ReactMarkdown>
                    {recommendations.timestamp && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-6 border-t border-gray-100 dark:border-gray-700 pt-4">
                        Recommendations generated at{" "}
                        {formatTimestamp(recommendations.timestamp)}
                      </p>
                    )}
                  </div>
                )}

                {!isLoading && (
                  <div className="absolute top-4 right-4">
                    <button
                      className="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-650 transition-all shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                      onClick={fetchRecommendations}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Refresh Recommendations
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
