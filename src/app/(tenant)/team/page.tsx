"use client";

import { useState } from "react";
import Link from "next/link";
import { useTeam, TeamFilters } from "@/hooks/useTeam";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  User,
  MoreHorizontal,
  Eye,
  Edit,
  Archive,
} from "lucide-react";
import type { TeamMember } from "@/types";

export default function TeamPage() {
  const [filters, setFilters] = useState<TeamFilters>({
    page: 1,
    per_page: 20,
    status: "active",
    search: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null);

  const { data, isLoading, error, refetch } = useTeam(filters);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }));
  };

  const handleStatusChange = (status: TeamFilters["status"]) => {
    setFilters((prev) => ({ ...prev, status, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const getTeamMemberInitials = (member: TeamMember) => {
    const name = member.name || "Unknown";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your team members and their information
          </p>
        </div>
        <Link
          href="/team/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Team Member
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search team members..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
          </form>

          <div className="flex items-center gap-2">
            {(["active", "inactive", "archived", "all"] as const).map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize",
                  filters.status === status
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
              >
                {status}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              showFilters
                ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load team members. Please try again.
          </p>
        </div>
      ) : isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
          </div>
        </div>
      ) : !data?.data || data.data.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <User className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No team members found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {filters.search
              ? "Try adjusting your search or filters"
              : "Get started by adding your first team member"}
          </p>
          <Link
            href="/team/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Team Member
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Contact
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Role
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {data.data.map((member) => (
                  <tr key={member.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-700 dark:text-violet-400 font-semibold">
                            {getTeamMemberInitials(member)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {member.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {member.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white capitalize">
                        {member.role}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={cn(
                          "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                          member.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        )}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActionMenuOpen(
                              actionMenuOpen === member.id ? null : member.id
                            )
                          }
                          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {actionMenuOpen === member.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                            <Link
                              href={`/team/${member.id}`}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Eye className="w-4 h-4" />
                              View Profile
                            </Link>
                            <button
                              onClick={() => {
                                setActionMenuOpen(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                            <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                              <Archive className="w-4 h-4" />
                              Archive
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.last_page > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-4 py-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(data.current_page - 1) * data.per_page + 1} to{" "}
                {Math.min(data.current_page * data.per_page, data.total)} of{" "}
                {data.total} team members
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(data.current_page - 1)}
                  disabled={data.current_page === 1}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {data.current_page} of {data.last_page}
                </span>
                <button
                  onClick={() => handlePageChange(data.current_page + 1)}
                  disabled={data.current_page === data.last_page}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
