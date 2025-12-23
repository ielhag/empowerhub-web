"use client";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type { Announcement } from "@/types";

export const announcementKeys = {
  all: ["announcements"] as const,
  list: () => [...announcementKeys.all, "list"] as const,
  detail: (id: number) => [...announcementKeys.all, "detail", id] as const,
};

interface AnnouncementListResponse {
  success?: boolean;
  data?: Announcement[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

async function fetchAnnouncements(
  page: number
): Promise<AnnouncementListResponse> {
  const response = await api.get<AnnouncementListResponse>(
    `/tenant-api/announcements?page=${page}`
  );
  return response.data;
}

export function useAnnouncements(page: number) {
  return useQuery({
    queryKey: announcementKeys.list(),
    queryFn: () => fetchAnnouncements(page),
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: 30 * 1000, // 30 seconds
    refetchIntervalInBackground: false,
  });
}
