"use client";

import { UserCheck, Plus, Search } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useCaseManagers } from "@/hooks/useCaseManagers";

export default function CaseManagersPage() {
  const { data: caseManagers, isLoading, error } = useCaseManagers();
  const [search, setSearch] = useState("");

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  // Filter case managers based on search input (by name, email, or phone)
  const filteredCaseManagers = Array.isArray(caseManagers)
    ? caseManagers.filter((cm) => {
        const name = (cm?.user?.name || cm?.name || "").toLowerCase();
        const email = (cm?.user?.email || cm?.email || "").toLowerCase();
        const phone = (cm?.phone || "").toLowerCase();
        const val = search.toLowerCase();
        return name.includes(val) || email.includes(val) || phone.includes(val);
      })
    : [];

  const hasCaseManagers =
    Array.isArray(caseManagers) && caseManagers.length > 0;

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search case managers..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>

      {/* Case Managers List or Empty State */}
      {hasCaseManagers && filteredCaseManagers.length > 0 ? (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCaseManagers.map((cm) => (
            <li
              key={cm.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col p-6"
            >
              <Link href={`/case-managers/${cm.id}`} className="block group">
                <div className="mb-3">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white group-hover:underline">
                    {cm.user?.name || cm.name || (
                      <span className="italic text-gray-400">No Name</span>
                    )}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 break-words truncate">
                    {cm.user?.email || cm.email || (
                      <span className="italic text-gray-400">—</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {cm.phone ? (
                      cm.phone
                    ) : (
                      <span className="italic text-gray-400">—</span>
                    )}
                  </p>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {typeof cm.total_clients === "number" ? (
                      `${cm.total_clients} client${
                        cm.total_clients === 1 ? "" : "s"
                      }`
                    ) : (
                      <span className="italic text-gray-400">No clients</span>
                    )}
                  </span>
                  <span className="text-violet-600 group-hover:underline text-xs font-medium">
                    View Clients →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
              <UserCheck className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No case managers yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Case managers help coordinate client care and services.
            </p>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
              <Plus className="w-4 h-4" />
              Add Your First Case Manager
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
