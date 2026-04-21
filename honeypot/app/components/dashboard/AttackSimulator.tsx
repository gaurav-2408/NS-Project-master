// components/dashboard/AttackSimulator.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import SliderInput from "@/app/components/dashboard/SliderInput";

interface Honeypot {
  id: string;
  name: string;
  ip_address: string;
  port: number;
  honeypot_type: string;
}

interface SimulationSettings {
  attackRate: number; // Attacks per minute
  duration: number; // Minutes
  complexity: string; // "basic", "moderate", "advanced"
  attackTypes: string[]; // Types of attacks to simulate
}

// Define all the attack types we support
const ATTACK_TYPES = {
  LOGIN_ATTEMPT: "login_attempt",
  SQL_INJECTION: "sql_injection",
  XSS: "xss",
  CSRF: "csrf",
  PORT_SCAN: "port_scan",
  DOS: "dos",
};

export default function AttackSimulator() {
  const [honeypots, setHoneypots] = useState<Honeypot[]>([]);
  const [selectedHoneypot, setSelectedHoneypot] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [attackCount, setAttackCount] = useState<number>(0);
  const [totalAttacks, setTotalAttacks] = useState<number>(0);

  // Track simulation status and counters between renders
  const simulationStatus = useRef({
    isActive: false,
    currentAttackCount: 0,
    targetAttackCount: 0,
    showingRemainingToast: false,
    remainingToastId: null as string | null,
  });

  // Timers
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const attackLoopRef = useRef<NodeJS.Timeout | null>(null);

  // Simulation settings
  const [settings, setSettings] = useState<SimulationSettings>({
    attackRate: 5,
    duration: 2,
    complexity: "basic",
    attackTypes: [ATTACK_TYPES.LOGIN_ATTEMPT],
  });

  // Complexity descriptions for each level
  const complexityDescriptions = {
    basic: "Simple attacks with common patterns",
    moderate: "More sophisticated attacks with varied techniques",
    advanced: "Complex attack patterns that evade basic defenses",
  };

  // When component unmounts, clean up timers
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

  // Clear all running timers
  const clearAllTimers = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (attackLoopRef.current) {
      clearInterval(attackLoopRef.current);
      attackLoopRef.current = null;
    }
  };

  // Fetch available honeypots
  useEffect(() => {
    const fetchHoneypots = async () => {
      try {
        const response = await fetch("http://localhost:8000/honeypots");
        const data = await response.json();
        setHoneypots(data || []);
      } catch (error) {
        console.error("Failed to load honeypots:", error);
        toast.error("Failed to load honeypots");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHoneypots();
  }, []);

  // Update settings
  const updateSetting = (key: keyof SimulationSettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Toggle an attack type
  const toggleAttackType = (type: string) => {
    setSettings((prev) => {
      if (prev.attackTypes.includes(type)) {
        return {
          ...prev,
          attackTypes: prev.attackTypes.filter((t) => t !== type),
        };
      } else {
        return {
          ...prev,
          attackTypes: [...prev.attackTypes, type],
        };
      }
    });
  };

  // Send a single attack simulation
  const sendSimulatedAttack = async (type: string): Promise<boolean> => {
    if (!selectedHoneypot) return false;

    try {
      // Create payload with all necessary data including complexity
      const payload = {
        honeypot_id: selectedHoneypot,
        attack_type: type,
        complexity: settings.complexity,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch("http://localhost:8000/attack-sim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`Attack simulation failed:`, await response.text());
        return false;
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error("Attack simulation error:", error);
      return false;
    }
  };

  // Start the attack simulation
  const startSimulation = () => {
    if (!selectedHoneypot) {
      toast.error("Please select a honeypot to target");
      return;
    }

    if (settings.attackTypes.length === 0) {
      toast.error("Please select at least one attack type");
      return;
    }

    // Clear any existing timers
    clearAllTimers();

    // Initialize simulation state
    setIsSimulating(true);
    setProgress(0);
    setElapsedTime(0);
    setAttackCount(0);

    // Use Math.ceil to ensure we get a whole number of attacks
    const calculatedTotalAttacks = Math.ceil(
      settings.attackRate * settings.duration
    );

    // Setup simulation status ref to track between renders
    simulationStatus.current = {
      isActive: true,
      currentAttackCount: 0,
      targetAttackCount: calculatedTotalAttacks,
      showingRemainingToast: false,
      remainingToastId: null,
    };

    // Set the total attacks state for UI
    setTotalAttacks(calculatedTotalAttacks);

    // Track timing
    const startTime = Date.now();
    const totalDuration = settings.duration * 60000; // convert minutes to ms

    toast.success(
      `Starting ${settings.complexity} complexity simulation with ${calculatedTotalAttacks} attacks`
    );

    // Progress timer updates the UI
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progressPercent = Math.min(100, (elapsed / totalDuration) * 100);

      setProgress(progressPercent);
      setElapsedTime(Math.floor(elapsed / 1000));

      // Check if time is up
      if (elapsed >= totalDuration) {
        // Check if all attacks have been completed
        if (
          simulationStatus.current.currentAttackCount >=
          simulationStatus.current.targetAttackCount
        ) {
          finishSimulation();
        }
        // Only show the remaining toast once
        else if (!simulationStatus.current.showingRemainingToast) {
          // Calculate remaining attacks
          const remaining =
            simulationStatus.current.targetAttackCount -
            simulationStatus.current.currentAttackCount;

          // Show toast with ID that can be updated when finished
          const toastId = toast.loading(
            `Time complete but finishing ${remaining} remaining attacks...`
          );

          // Save the toast ID and set flag
          simulationStatus.current.remainingToastId = toastId;
          simulationStatus.current.showingRemainingToast = true;
        }
      }
    }, 1000);

    // Calculate time between attacks based on rate
    const attackInterval = 60000 / settings.attackRate;

    // Attack loop sends attacks at specified rate
    attackLoopRef.current = setInterval(async () => {
      // Don't run if simulation is not active
      if (!simulationStatus.current.isActive) {
        clearInterval(attackLoopRef.current!);
        attackLoopRef.current = null;
        return;
      }

      // Check if we've completed all attacks
      if (
        simulationStatus.current.currentAttackCount >=
        simulationStatus.current.targetAttackCount
      ) {
        clearInterval(attackLoopRef.current!);
        attackLoopRef.current = null;

        // Make sure we call finishSimulation if it hasn't been called yet
        if (simulationStatus.current.isActive) {
          finishSimulation();
        }
        return;
      }

      // Select a random attack type from enabled types
      const randomTypeIndex = Math.floor(
        Math.random() * settings.attackTypes.length
      );
      const attackType = settings.attackTypes[randomTypeIndex];

      // Send the attack
      try {
        const result = await sendSimulatedAttack(attackType);

        // Update counts if successful
        if (result) {
          simulationStatus.current.currentAttackCount++;
          setAttackCount(simulationStatus.current.currentAttackCount);
        }
      } catch (err) {
        console.error("Failed to send attack:", err);
      }
    }, attackInterval);
  };

  // End the simulation
  const finishSimulation = () => {
    simulationStatus.current.isActive = false;
    clearAllTimers();
    setIsSimulating(false);

    // Check if we need to update the "remaining" toast
    if (
      simulationStatus.current.showingRemainingToast &&
      simulationStatus.current.remainingToastId
    ) {
      // Dismiss the "remaining attacks" toast by updating it to success
      toast.success(
        `Completed all ${simulationStatus.current.targetAttackCount} attacks!`,
        { id: simulationStatus.current.remainingToastId }
      );
    } else {
      // Regular completion toast
      toast.success(
        `Completed ${simulationStatus.current.currentAttackCount} attacks against the honeypot`
      );
    }
  };

  // Manually stop the simulation
  const stopSimulation = () => {
    if (isSimulating) {
      simulationStatus.current.isActive = false;
      clearAllTimers();
      setIsSimulating(false);

      // Check if we need to dismiss the "remaining" toast
      if (
        simulationStatus.current.showingRemainingToast &&
        simulationStatus.current.remainingToastId
      ) {
        toast.error(
          `Simulation stopped after ${simulationStatus.current.currentAttackCount} of ${simulationStatus.current.targetAttackCount} attacks`,
          { id: simulationStatus.current.remainingToastId }
        );
      } else {
        toast.success("Simulation stopped");
      }
    }
  };

  // Format seconds into mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Function to get attack type icon
  const getAttackTypeIcon = (type: string) => {
    switch (type) {
      case ATTACK_TYPES.LOGIN_ATTEMPT:
        return (
          <svg
            className="w-4 h-4 mr-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
        );
      case ATTACK_TYPES.SQL_INJECTION:
        return (
          <svg
            className="w-4 h-4 mr-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
        );
      case ATTACK_TYPES.XSS:
        return (
          <svg
            className="w-4 h-4 mr-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        );
      case ATTACK_TYPES.PORT_SCAN:
        return (
          <svg
            className="w-4 h-4 mr-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
            />
          </svg>
        );
      case ATTACK_TYPES.DOS:
        return (
          <svg
            className="w-4 h-4 mr-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        );
      case ATTACK_TYPES.CSRF:
        return (
          <svg
            className="w-4 h-4 mr-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-750">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
          <svg
            className="w-5 h-5 mr-2 text-indigo-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          Attack Simulator
        </h2>
        <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
          Generate simulated attacks against your honeypots for testing and
          demonstration.
        </p>
      </div>

      <div className="px-6 py-5 space-y-6">
        {/* Honeypot Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target Honeypot
          </label>
          {isLoading ? (
            <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          ) : (
            <div className="relative">
              <select
                value={selectedHoneypot}
                onChange={(e) => setSelectedHoneypot(e.target.value)}
                disabled={isSimulating}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm py-2.5 pl-4 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-800 transition-colors"
              >
                <option value="">Select a honeypot</option>
                {honeypots.map((honeypot) => (
                  <option key={honeypot.id} value={honeypot.id}>
                    {honeypot.name} ({honeypot.ip_address}:{honeypot.port} -{" "}
                    {honeypot.honeypot_type})
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Attack Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Attack Types
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => toggleAttackType(ATTACK_TYPES.LOGIN_ATTEMPT)}
              disabled={isSimulating}
              className={`group px-4 py-2.5 rounded-full text-sm font-medium flex items-center transition-all duration-200 ${
                settings.attackTypes.includes(ATTACK_TYPES.LOGIN_ATTEMPT)
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ring-2 ring-blue-500/50"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {getAttackTypeIcon(ATTACK_TYPES.LOGIN_ATTEMPT)}
              SSH Brute Force
            </button>

            <button
              onClick={() => toggleAttackType(ATTACK_TYPES.SQL_INJECTION)}
              disabled={isSimulating}
              className={`group px-4 py-2.5 rounded-full text-sm font-medium flex items-center transition-all duration-200 ${
                settings.attackTypes.includes(ATTACK_TYPES.SQL_INJECTION)
                  ? "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 ring-2 ring-pink-500/50"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {getAttackTypeIcon(ATTACK_TYPES.SQL_INJECTION)}
              SQL Injection
            </button>

            <button
              onClick={() => toggleAttackType(ATTACK_TYPES.XSS)}
              disabled={isSimulating}
              className={`group px-4 py-2.5 rounded-full text-sm font-medium flex items-center transition-all duration-200 ${
                settings.attackTypes.includes(ATTACK_TYPES.XSS)
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 ring-2 ring-purple-500/50"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {getAttackTypeIcon(ATTACK_TYPES.XSS)}
              Cross-Site Scripting
            </button>

            <button
              onClick={() => toggleAttackType(ATTACK_TYPES.PORT_SCAN)}
              disabled={isSimulating}
              className={`group px-4 py-2.5 rounded-full text-sm font-medium flex items-center transition-all duration-200 ${
                settings.attackTypes.includes(ATTACK_TYPES.PORT_SCAN)
                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 ring-2 ring-green-500/50"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {getAttackTypeIcon(ATTACK_TYPES.PORT_SCAN)}
              Port Scanning
            </button>

            <button
              onClick={() => toggleAttackType(ATTACK_TYPES.DOS)}
              disabled={isSimulating}
              className={`group px-4 py-2.5 rounded-full text-sm font-medium flex items-center transition-all duration-200 ${
                settings.attackTypes.includes(ATTACK_TYPES.DOS)
                  ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 ring-2 ring-red-500/50"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {getAttackTypeIcon(ATTACK_TYPES.DOS)}
              DoS Attack
            </button>

            <button
              onClick={() => toggleAttackType(ATTACK_TYPES.CSRF)}
              disabled={isSimulating}
              className={`group px-4 py-2.5 rounded-full text-sm font-medium flex items-center transition-all duration-200 ${
                settings.attackTypes.includes(ATTACK_TYPES.CSRF)
                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 ring-2 ring-yellow-500/50"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {getAttackTypeIcon(ATTACK_TYPES.CSRF)}
              CSRF Attack
            </button>
          </div>
        </div>

        {/* Attack Rate Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Attack Rate
            </label>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {settings.attackRate} attacks/min
            </span>
          </div>
          <SliderInput
            min={1}
            max={60}
            step={1}
            value={settings.attackRate}
            onChange={(value) => updateSetting("attackRate", value)}
            label=""
            disabled={isSimulating}
            valueFormatter={(value) => `${value} attacks/min`}
            color="blue"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-500">
            <span>1</span>
            <span>30</span>
            <span>60</span>
          </div>
        </div>

        {/* Duration Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Duration
            </label>
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
              {settings.duration} minutes
            </span>
          </div>
          <SliderInput
            min={1}
            max={10}
            step={1}
            value={settings.duration}
            onChange={(value) => updateSetting("duration", value)}
            label=""
            disabled={isSimulating}
            valueFormatter={(value) => `${value} minutes`}
            color="purple"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-500">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>

        {/* Attack Complexity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Attack Complexity
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => updateSetting("complexity", "basic")}
              disabled={isSimulating}
              className={`group px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                settings.complexity === "basic"
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              } disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              <div className="flex justify-center items-center">
                <svg
                  className={`w-4 h-4 mr-1.5 ${
                    settings.complexity === "basic"
                      ? "text-white"
                      : "text-gray-400"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Basic
              </div>
            </button>

            <button
              onClick={() => updateSetting("complexity", "moderate")}
              disabled={isSimulating}
              className={`group px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                settings.complexity === "moderate"
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              } disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              <div className="flex justify-center items-center">
                <svg
                  className={`w-4 h-4 mr-1.5 ${
                    settings.complexity === "moderate"
                      ? "text-white"
                      : "text-gray-400"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
                Moderate
              </div>
            </button>

            <button
              onClick={() => updateSetting("complexity", "advanced")}
              disabled={isSimulating}
              className={`group px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                settings.complexity === "advanced"
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              } disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              <div className="flex justify-center items-center">
                <svg
                  className={`w-4 h-4 mr-1.5 ${
                    settings.complexity === "advanced"
                      ? "text-white"
                      : "text-gray-400"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Advanced
              </div>
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {
              complexityDescriptions[
                settings.complexity as keyof typeof complexityDescriptions
              ]
            }
          </p>
        </div>

        {/* Simulation Status */}
        {isSimulating && (
          <div className="mt-6 p-5 border border-blue-100 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex justify-between mb-3">
              <span className="text-blue-700 dark:text-blue-400 font-medium flex items-center">
                <span className="flex h-3 w-3 relative mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                Simulation in progress
              </span>
              <span className="text-blue-700 dark:text-blue-400 font-mono">
                {formatTime(elapsedTime)} / {formatTime(settings.duration * 60)}
              </span>
            </div>

            <div className="w-full bg-blue-200 dark:bg-blue-800/50 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            <div className="mt-3 flex justify-between text-sm">
              <span className="text-blue-600 dark:text-blue-400">
                Attacks: <span className="font-mono">{attackCount}</span>
              </span>
              <span className="text-blue-600 dark:text-blue-400">
                Target: <span className="font-mono">{totalAttacks}</span>
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-2">
          {!isSimulating ? (
            <button
              onClick={startSimulation}
              disabled={!selectedHoneypot || settings.attackTypes.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center disabled:opacity-60 disabled:pointer-events-none disabled:from-gray-400 disabled:to-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg
                className="w-5 h-5 mr-1.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Start Simulation
            </button>
          ) : (
            <button
              onClick={stopSimulation}
              className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <svg
                className="w-5 h-5 mr-1.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                />
              </svg>
              Stop Simulation
            </button>
          )}
          <button
            onClick={() => {
              if (settings.attackTypes.length > 0) {
                sendSimulatedAttack(settings.attackTypes[0]);
                toast.success(`Single ${settings.complexity} attack sent`);
              } else {
                toast.error("Please select at least one attack type");
              }
            }}
            disabled={
              !selectedHoneypot ||
              isSimulating ||
              settings.attackTypes.length === 0
            }
            className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center disabled:opacity-60 disabled:bg-gray-100 disabled:text-gray-400 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            <svg
              className="w-5 h-5 mr-1.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Test Single Attack
          </button>
        </div>
      </div>
    </div>
  );
}
