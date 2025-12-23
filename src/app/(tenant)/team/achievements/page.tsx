"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  useAchievements,
  getAchievementColorClasses,
  type Achievement,
  type AchievementType,
} from "@/hooks/useAchievements";
import { Trophy, Loader2, AlertTriangle, Search, Star } from "lucide-react";

// Achievement type labels and icons
const achievementTypeConfig: Record<AchievementType, { label: string; icon: string }> = {
  client_milestone: { label: "Client Milestones", icon: "👥" },
  service_anniversary: { label: "Service Anniversaries", icon: "🌟" },
  speciality_mastery: { label: "Speciality Masteries", icon: "🎓" },
  community_impact: { label: "Community Impact", icon: "🌍" },
  client_satisfaction: { label: "Client Satisfaction", icon: "❤️" },
  training_completion: { label: "Training Completions", icon: "📚" },
  peer_recognition: { label: "Peer Recognition", icon: "🤝" },
  innovation: { label: "Innovation Awards", icon: "💡" },
};

// Achievement Card Component
function AchievementCard({ achievement }: { achievement: Achievement }) {
  const colorClasses = getAchievementColorClasses(achievement.badge_color);

  return (
    <div className={cn("rounded-lg border p-4 transition-shadow hover:shadow-md", colorClasses.border, colorClasses.bgLight)}>
      <div className="flex items-start gap-3">
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-2xl", colorClasses.bg)}>
          {achievement.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={cn("font-semibold", colorClasses.text)}>{achievement.title}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{achievement.description}</p>
          {achievement.team && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium">
                {achievement.team.initials}
              </div>
              <Link
                href={`/team/${achievement.team.id}`}
                className="text-sm text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400"
              >
                {achievement.team.name}
              </Link>
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{achievement.awarded_at_human}</p>
        </div>
      </div>
    </div>
  );
}

// Top Achiever Card
function TopAchieverCard({ achiever, rank }: { achiever: { team_id: number; total: number; team: { id: number; name: string; initials: string; role_name?: string } | null }; rank: number }) {
  if (!achiever.team) return null;

  const rankColors = [
    "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800",
    "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600",
    "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800",
  ];

  return (
    <div className={cn("flex items-center gap-3 p-3 rounded-lg border", rank < 3 ? rankColors[rank] : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700")}>
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm", rank === 0 ? "bg-yellow-500 text-white" : rank === 1 ? "bg-gray-400 text-white" : rank === 2 ? "bg-orange-500 text-white" : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300")}>
        {rank + 1}
      </div>
      <div className="flex-1 min-w-0">
        <Link href={`/team/${achiever.team.id}`} className="font-medium text-gray-900 dark:text-white hover:text-violet-600 truncate block">
          {achiever.team.name}
        </Link>
        {achiever.team.role_name && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{achiever.team.role_name}</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Trophy className="w-4 h-4 text-yellow-500" />
        <span className="font-semibold text-gray-900 dark:text-white">{achiever.total}</span>
      </div>
    </div>
  );
}

export default function TeamAchievementsPage() {
  const [activeType, setActiveType] = useState<AchievementType | "all">("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 12;

  const { data, isLoading, error } = useAchievements();

  // Get all achievements flat list
  const allAchievements = useMemo(() => {
    if (!data) return [];
    return Object.values(data.achievements_by_type).flat();
  }, [data]);

  // Filter achievements
  const filteredAchievements = useMemo(() => {
    let achievements = activeType === "all" ? allAchievements : (data?.achievements_by_type[activeType] ?? []);
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      achievements = achievements.filter(
        (a) =>
          a.title.toLowerCase().includes(searchLower) ||
          a.description.toLowerCase().includes(searchLower) ||
          a.team?.name.toLowerCase().includes(searchLower)
      );
    }
    return achievements;
  }, [allAchievements, data, activeType, search]);

  // Paginated achievements
  const paginatedAchievements = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredAchievements.slice(start, start + perPage);
  }, [filteredAchievements, currentPage, perPage]);

  // Total pages
  const totalPages = Math.ceil(filteredAchievements.length / perPage);

  // Reset page when filters change
  const handleTypeChange = (type: AchievementType | "all") => {
    setActiveType(type);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  // Get achievement types that have achievements
  const availableTypes = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.type_counts)
      .filter(([, count]) => count > 0)
      .map(([type]) => type as AchievementType);
  }, [data]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Failed to load achievements</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Team Achievements</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Celebrate and recognize team accomplishments and milestones.
          </p>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                <span className="text-xs font-medium text-violet-800 dark:text-violet-300">Total Achievements</span>
              </div>
              <div className="mt-1 text-2xl font-bold text-violet-900 dark:text-violet-200">
                {isLoading ? "-" : data?.total_achievements ?? 0}
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">👥</span>
                <span className="text-xs font-medium text-blue-800 dark:text-blue-300">Client Milestones</span>
              </div>
              <div className="mt-1 text-2xl font-bold text-blue-900 dark:text-blue-200">
                {isLoading ? "-" : data?.type_counts.client_milestone ?? 0}
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎓</span>
                <span className="text-xs font-medium text-green-800 dark:text-green-300">Speciality Masteries</span>
              </div>
              <div className="mt-1 text-2xl font-bold text-green-900 dark:text-green-200">
                {isLoading ? "-" : data?.type_counts.speciality_mastery ?? 0}
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-medium text-purple-800 dark:text-purple-300">Anniversaries</span>
              </div>
              <div className="mt-1 text-2xl font-bold text-purple-900 dark:text-purple-200">
                {isLoading ? "-" : data?.type_counts.service_anniversary ?? 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search achievements..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              {/* Type Filter */}
              <select
                value={activeType}
                onChange={(e) => handleTypeChange(e.target.value as AchievementType | "all")}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All Types</option>
                {Object.entries(achievementTypeConfig).map(([type, config]) => (
                  <option key={type} value={type}>
                    {config.icon} {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Achievement List */}
          <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white">
                {activeType === "all" ? "All Achievements" : achievementTypeConfig[activeType]?.label}
                <span className="ml-2 text-sm text-gray-500">({filteredAchievements.length})</span>
              </h3>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
              </div>
            ) : filteredAchievements.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No achievements found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {search ? "Try adjusting your search criteria." : "Team achievements will appear here as they are earned."}
                </p>
              </div>
            ) : (
              <>
                <div className="p-4 grid gap-4 sm:grid-cols-2">
                  {paginatedAchievements.map((achievement) => (
                    <AchievementCard key={achievement.id} achievement={achievement} />
                  ))}
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Showing {(currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, filteredAchievements.length)} of {filteredAchievements.length}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Top Achievers */}
          <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Top Achievers
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
                </div>
              ) : data?.top_achievers.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No achievers yet</p>
              ) : (
                data?.top_achievers.map((achiever, index) => (
                  <TopAchieverCard key={achiever.team_id} achiever={achiever} rank={index} />
                ))
              )}
            </div>
          </div>

          {/* Latest Speciality Masteries */}
          <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <span className="text-lg">🎓</span>
                Latest Masteries
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
                </div>
              ) : data?.latest_masteries.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No masteries yet</p>
              ) : (
                data?.latest_masteries.slice(0, 5).map((mastery) => (
                  <div key={mastery.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-sm">
                      🎓
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{mastery.title}</p>
                      {mastery.team && (
                        <Link
                          href={`/team/${mastery.team.id}`}
                          className="text-xs text-gray-500 dark:text-gray-400 hover:text-violet-600"
                        >
                          {mastery.team.name}
                        </Link>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{mastery.awarded_at_human}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Achievement Categories */}
          <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white">Categories</h3>
            </div>
            <div className="p-4 space-y-2">
              {Object.entries(achievementTypeConfig).map(([type, config]) => {
                const count = data?.type_counts[type as AchievementType] ?? 0;
                const isActive = activeType === type;
                return (
                  <button
                    key={type}
                    onClick={() => handleTypeChange(isActive ? "all" : (type as AchievementType))}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span>{config.icon}</span>
                      <span>{config.label}</span>
                    </span>
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", isActive ? "bg-violet-200 dark:bg-violet-800 text-violet-800 dark:text-violet-200" : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300")}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
