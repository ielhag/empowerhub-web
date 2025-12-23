import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api/client";

// Types
export interface TeamInfo {
  id: number;
  name: string;
  initials: string;
  role_name?: string;
}

export type AchievementType =
  | "client_milestone"
  | "service_anniversary"
  | "speciality_mastery"
  | "community_impact"
  | "client_satisfaction"
  | "training_completion"
  | "peer_recognition"
  | "innovation";

export interface Achievement {
  id: number;
  title: string;
  description: string;
  type: AchievementType;
  icon: string;
  badge_color: string;
  milestone_value: number | null;
  data: Record<string, unknown> | null;
  awarded_at: string;
  awarded_at_human: string;
  team: TeamInfo | null;
}

export interface TopAchiever {
  team_id: number;
  total: number;
  team: TeamInfo | null;
}

export interface AchievementTypeInfo {
  key: AchievementType;
  label: string;
  icon: string;
  color: string;
}

export interface AchievementsData {
  achievements_by_type: Record<AchievementType, Achievement[]>;
  type_counts: Record<AchievementType, number>;
  total_achievements: number;
  top_achievers: TopAchiever[];
  latest_masteries: Achievement[];
  achievement_types: Record<AchievementType, AchievementTypeInfo>;
}

// Query keys
export const achievementKeys = {
  all: ["achievements"] as const,
  list: () => [...achievementKeys.all, "list"] as const,
};

// API response type
interface AchievementsResponse {
  success: boolean;
  data: AchievementsData;
}

// Fetch achievements
async function fetchAchievements(): Promise<AchievementsData> {
  const response = await api.get<AchievementsResponse>(
    "/tenant-api/achievements"
  );
  return response.data.data;
}

// Hook: Fetch all achievements
export function useAchievements() {
  return useQuery({
    queryKey: achievementKeys.list(),
    queryFn: fetchAchievements,
    staleTime: 60 * 1000,
  });
}

// Helper: Get achievement type label
export function getAchievementTypeLabel(type: AchievementType): string {
  const labels: Record<AchievementType, string> = {
    client_milestone: "Client Milestones",
    service_anniversary: "Service Anniversaries",
    speciality_mastery: "Speciality Masteries",
    community_impact: "Community Impact",
    client_satisfaction: "Client Satisfaction",
    training_completion: "Training Completions",
    peer_recognition: "Peer Recognition",
    innovation: "Innovation Awards",
  };
  return labels[type] || type;
}

// Helper: Get achievement type icon
export function getAchievementTypeIcon(type: AchievementType): string {
  const icons: Record<AchievementType, string> = {
    client_milestone: "👥",
    service_anniversary: "🌟",
    speciality_mastery: "🎓",
    community_impact: "🌍",
    client_satisfaction: "❤️",
    training_completion: "📚",
    peer_recognition: "🤝",
    innovation: "💡",
  };
  return icons[type] || "🏆";
}

// Helper: Get badge color classes for achievement type
export function getAchievementColorClasses(color: string): {
  bg: string;
  text: string;
  border: string;
  bgLight: string;
} {
  const colorMap: Record<string, { bg: string; text: string; border: string; bgLight: string }> = {
    blue: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-800 dark:text-blue-200",
      border: "border-blue-200 dark:border-blue-800",
      bgLight: "bg-blue-50 dark:bg-blue-900/20",
    },
    purple: {
      bg: "bg-purple-100 dark:bg-purple-900/30",
      text: "text-purple-800 dark:text-purple-200",
      border: "border-purple-200 dark:border-purple-800",
      bgLight: "bg-purple-50 dark:bg-purple-900/20",
    },
    green: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-800 dark:text-green-200",
      border: "border-green-200 dark:border-green-800",
      bgLight: "bg-green-50 dark:bg-green-900/20",
    },
    orange: {
      bg: "bg-orange-100 dark:bg-orange-900/30",
      text: "text-orange-800 dark:text-orange-200",
      border: "border-orange-200 dark:border-orange-800",
      bgLight: "bg-orange-50 dark:bg-orange-900/20",
    },
    pink: {
      bg: "bg-pink-100 dark:bg-pink-900/30",
      text: "text-pink-800 dark:text-pink-200",
      border: "border-pink-200 dark:border-pink-800",
      bgLight: "bg-pink-50 dark:bg-pink-900/20",
    },
    indigo: {
      bg: "bg-indigo-100 dark:bg-indigo-900/30",
      text: "text-indigo-800 dark:text-indigo-200",
      border: "border-indigo-200 dark:border-indigo-800",
      bgLight: "bg-indigo-50 dark:bg-indigo-900/20",
    },
    yellow: {
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      text: "text-yellow-800 dark:text-yellow-200",
      border: "border-yellow-200 dark:border-yellow-800",
      bgLight: "bg-yellow-50 dark:bg-yellow-900/20",
    },
    red: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-800 dark:text-red-200",
      border: "border-red-200 dark:border-red-800",
      bgLight: "bg-red-50 dark:bg-red-900/20",
    },
    gray: {
      bg: "bg-gray-100 dark:bg-gray-700",
      text: "text-gray-800 dark:text-gray-200",
      border: "border-gray-200 dark:border-gray-600",
      bgLight: "bg-gray-50 dark:bg-gray-800",
    },
  };
  return colorMap[color] || colorMap.gray;
}
