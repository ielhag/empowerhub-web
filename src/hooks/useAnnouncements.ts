import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";

// Types
export interface AnnouncementImage {
  path: string;
  url: string;
}

export interface AnnouncementUser {
  id: number;
  name: string;
}

export interface AnnouncementReader {
  id: number;
  name: string;
  pivot?: {
    created_at: string;
  };
}

export interface AnnouncementComment {
  id: number;
  content: string;
  user: AnnouncementUser | null;
  is_liked: boolean;
  like_count: number;
  liked_by: AnnouncementUser[];
  created_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  status: "draft" | "published";
  images: AnnouncementImage[];
  user: AnnouncementUser | null;
  is_read: boolean;
  read_count: number;
  comment_count: number;
  readers: AnnouncementReader[];
  comments?: AnnouncementComment[];
  created_at: string;
  updated_at: string;
}

export interface AnnouncementFilters {
  page?: number;
  per_page?: number;
}

export interface CreateAnnouncementData {
  title: string;
  body: string;
  images?: File[];
  publish?: boolean;
}

export interface UpdateAnnouncementData {
  title?: string;
  body?: string;
  images?: File[];
  publish?: boolean;
}

// Query keys
export const announcementKeys = {
  all: ["announcements"] as const,
  lists: () => [...announcementKeys.all, "list"] as const,
  list: (filters: AnnouncementFilters) =>
    [...announcementKeys.lists(), filters] as const,
  details: () => [...announcementKeys.all, "detail"] as const,
  detail: (id: number) => [...announcementKeys.details(), id] as const,
  comments: (id: number) => [...announcementKeys.all, "comments", id] as const,
};

// API response types
interface AnnouncementListResponse {
  success: boolean;
  data: Announcement[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

interface AnnouncementDetailResponse {
  success: boolean;
  data: Announcement;
}

interface CommentsResponse {
  success: boolean;
  data: {
    comments: AnnouncementComment[];
    comment_count: number;
  };
}

// Fetch announcements list
async function fetchAnnouncements(
  filters: AnnouncementFilters
): Promise<{
  data: Announcement[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}> {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.append(key, String(value));
    }
  });

  const response = await api.get<AnnouncementListResponse>(
    `/tenant-api/announcements?${params}`
  );

  return {
    data: response.data.data,
    current_page: response.data.current_page,
    per_page: response.data.per_page,
    total: response.data.total,
    last_page: response.data.last_page,
  };
}

// Fetch single announcement
async function fetchAnnouncement(id: number): Promise<Announcement> {
  const response = await api.get<AnnouncementDetailResponse>(
    `/tenant-api/announcements/${id}`
  );
  return response.data.data;
}

// Fetch comments for an announcement
async function fetchComments(
  id: number
): Promise<{ comments: AnnouncementComment[]; comment_count: number }> {
  const response = await api.get<CommentsResponse>(
    `/tenant-api/announcements/${id}/comments`
  );
  return response.data.data;
}

// Hook: Fetch announcements list
export function useAnnouncements(filters: AnnouncementFilters = {}) {
  return useQuery({
    queryKey: announcementKeys.list(filters),
    queryFn: () => fetchAnnouncements(filters),
    staleTime: 30 * 1000,
  });
}

// Hook: Fetch single announcement
export function useAnnouncement(id: number) {
  return useQuery({
    queryKey: announcementKeys.detail(id),
    queryFn: () => fetchAnnouncement(id),
    enabled: id > 0,
  });
}

// Hook: Fetch comments
export function useAnnouncementComments(id: number) {
  return useQuery({
    queryKey: announcementKeys.comments(id),
    queryFn: () => fetchComments(id),
    enabled: id > 0,
  });
}

// Hook: Create announcement
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAnnouncementData) => {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("body", data.body);
      formData.append("publish", data.publish ? "1" : "0");

      if (data.images) {
        data.images.forEach((file) => {
          formData.append("images[]", file);
        });
      }

      const response = await api.post<AnnouncementDetailResponse>(
        "/tenant-api/announcements",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
    },
  });
}

// Hook: Update announcement
export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateAnnouncementData;
    }) => {
      const formData = new FormData();
      if (data.title) formData.append("title", data.title);
      if (data.body) formData.append("body", data.body);
      if (data.publish !== undefined)
        formData.append("publish", data.publish ? "1" : "0");

      if (data.images) {
        data.images.forEach((file) => {
          formData.append("images[]", file);
        });
      }

      // Use POST with _method for file uploads
      formData.append("_method", "PUT");

      const response = await api.post<AnnouncementDetailResponse>(
        `/tenant-api/announcements/${id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
      queryClient.setQueryData(announcementKeys.detail(data.id), data);
    },
  });
}

// Hook: Delete announcement
export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/tenant-api/announcements/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
      queryClient.removeQueries({ queryKey: announcementKeys.detail(id) });
    },
  });
}

// Hook: Publish announcement
export function usePublishAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post<AnnouncementDetailResponse>(
        `/tenant-api/announcements/${id}/publish`
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
      queryClient.setQueryData(announcementKeys.detail(data.id), data);
    },
  });
}

// Hook: Mark as read
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post<{
        success: boolean;
        data: { is_read: boolean; read_count: number };
      }>(`/tenant-api/announcements/${id}/mark-as-read`);
      return { id, ...response.data.data };
    },
    onSuccess: (data) => {
      // Update the specific announcement in any list queries
      queryClient.invalidateQueries({ queryKey: announcementKeys.lists() });
      // Also invalidate detail if exists
      queryClient.invalidateQueries({
        queryKey: announcementKeys.detail(data.id),
      });
    },
  });
}

// Hook: Add comment
export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      announcementId,
      content,
    }: {
      announcementId: number;
      content: string;
    }) => {
      const response = await api.post<{
        success: boolean;
        data: { comment: AnnouncementComment; comment_count: number };
      }>(`/tenant-api/announcements/${announcementId}/comments`, { content });
      return { announcementId, ...response.data.data };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: announcementKeys.comments(data.announcementId),
      });
      queryClient.invalidateQueries({ queryKey: announcementKeys.lists() });
    },
  });
}

// Hook: Delete comment
export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      announcementId,
      commentId,
    }: {
      announcementId: number;
      commentId: number;
    }) => {
      const response = await api.delete<{
        success: boolean;
        data: { comment_count: number };
      }>(`/tenant-api/announcements/${announcementId}/comments/${commentId}`);
      return { announcementId, commentId, ...response.data.data };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: announcementKeys.comments(data.announcementId),
      });
      queryClient.invalidateQueries({ queryKey: announcementKeys.lists() });
    },
  });
}

// Hook: Like comment
export function useLikeComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      announcementId,
      commentId,
    }: {
      announcementId: number;
      commentId: number;
    }) => {
      const response = await api.post<{
        success: boolean;
        data: { is_liked: boolean; like_count: number };
      }>(
        `/tenant-api/announcements/${announcementId}/comments/${commentId}/like`
      );
      return { announcementId, commentId, ...response.data.data };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: announcementKeys.comments(data.announcementId),
      });
    },
  });
}

// Hook: Unlike comment
export function useUnlikeComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      announcementId,
      commentId,
    }: {
      announcementId: number;
      commentId: number;
    }) => {
      const response = await api.delete<{
        success: boolean;
        data: { is_liked: boolean; like_count: number };
      }>(
        `/tenant-api/announcements/${announcementId}/comments/${commentId}/like`
      );
      return { announcementId, commentId, ...response.data.data };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: announcementKeys.comments(data.announcementId),
      });
    },
  });
}
