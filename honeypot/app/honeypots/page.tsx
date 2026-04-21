// app/honeypots/page.tsx
"use client"; // Required because we're using useState for search

import { useState } from "react";
import Link from "next/link";
import HoneypotList from "@/app/components/dashboard/honeypot-list"; // Corrected path assuming components folder
import { Plus, LayoutDashboard, Home as HomeIcon, Search } from "lucide-react"; // Icons

export default function HoneypotListPage() {
  // State to hold the search query entered by the user
  const [searchQuery, setSearchQuery] = useState("");

  return (
    // Use a wider container and consistent padding
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="mb-8 border-b border-slate-200 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Main Title */}
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Your Honeypots
          </h1>

          {/* Navigation & Actions */}
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors inline-flex items-center"
              title="Go to Home"
            >
              <HomeIcon className="h-4 w-4 mr-1.5" />
              Home
            </Link>
            <Link
              href="/dashboard" // Assuming a general dashboard exists
              className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors inline-flex items-center"
              title="Go to Dashboard"
            >
              <LayoutDashboard className="h-4 w-4 mr-1.5" />
              Dashboard
            </Link>
            <Link
              href="/honeypots/new" // Link to create a new honeypot
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Create Honeypot
            </Link>
          </div>
        </div>
      </div>

      {/* Search Input Section */}
      <div className="mb-6">
        <label htmlFor="honeypot-search" className="sr-only">
          {" "}
          {/* Screen reader label */}
          Search Honeypots
        </label>
        <div className="relative mt-2 rounded-md shadow-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </div>
          <input
            type="search" // Use type="search" for better semantics and potential browser UI (like clear button)
            name="honeypot-search"
            id="honeypot-search"
            className="block w-full rounded-md border-0 py-2 pl-10 pr-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-sky-600 sm:text-sm sm:leading-6"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} // Update state on change
          />
        </div>
      </div>

      {/* Honeypot List Display */}
      {/* Pass the current searchQuery state down to the HoneypotList component */}
      <HoneypotList searchQuery={searchQuery} />
    </div>
  );
}
