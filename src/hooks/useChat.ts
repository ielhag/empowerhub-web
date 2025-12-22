import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import api from '@/lib/api/client';
import type { ChatRoom, ChatMessage, User } from '@/types';

// Query keys
export const chatKeys = {
  all: ['chat'] as const,
  rooms: () => [...chatKeys.all, 'rooms'] as const,
  room: (id: number) => [...chatKeys.all, 'room', id] as const,
  messages: (roomId: number) => [...chatKeys.all, 'messages', roomId] as const,
  unread: () => [...chatKeys.all, 'unread'] as const,
};

// API response types
interface RoomsResponse {
  success: boolean;
  data: ChatRoom[];
}

interface RoomResponse {
  success: boolean;
  data: ChatRoom;
}

interface MessagesResponse {
  success: boolean;
  data: {
    messages: ChatMessage[];
    has_more: boolean;
    next_cursor?: string;
  };
}

interface UnreadResponse {
  success: boolean;
  data: {
    total_unread: number;
    rooms: { room_id: number; count: number }[];
  };
}

// Fetch chat rooms
async function fetchChatRooms(): Promise<ChatRoom[]> {
  const response = await api.get<RoomsResponse>('/tenant-api/chat/rooms');
  return response.data.data;
}

// Fetch single chat room
async function fetchChatRoom(id: number): Promise<ChatRoom> {
  const response = await api.get<RoomResponse>(`/tenant-api/chat/rooms/${id}`);
  return response.data.data;
}

// Fetch messages with cursor pagination
async function fetchMessages(
  roomId: number,
  cursor?: string
): Promise<{ messages: ChatMessage[]; has_more: boolean; next_cursor?: string }> {
  const params = cursor ? `?cursor=${cursor}` : '';
  const response = await api.get<MessagesResponse>(
    `/tenant-api/chat/rooms/${roomId}/messages${params}`
  );
  return response.data.data;
}

// Fetch unread counts
async function fetchUnreadCounts(): Promise<{ total_unread: number; rooms: { room_id: number; count: number }[] }> {
  const response = await api.get<UnreadResponse>('/tenant-api/chat/unread');
  return response.data.data;
}

// Hook: Fetch chat rooms
export function useChatRooms() {
  return useQuery({
    queryKey: chatKeys.rooms(),
    queryFn: fetchChatRooms,
    staleTime: 30 * 1000,
  });
}

// Hook: Fetch single chat room
export function useChatRoom(id: number) {
  return useQuery({
    queryKey: chatKeys.room(id),
    queryFn: () => fetchChatRoom(id),
    enabled: id > 0,
  });
}

// Hook: Fetch messages with infinite scroll
export function useChatMessages(roomId: number) {
  return useInfiniteQuery({
    queryKey: chatKeys.messages(roomId),
    queryFn: ({ pageParam }) => fetchMessages(roomId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.next_cursor : undefined),
    enabled: roomId > 0,
  });
}

// Hook: Fetch unread counts
export function useUnreadCounts() {
  return useQuery({
    queryKey: chatKeys.unread(),
    queryFn: fetchUnreadCounts,
    refetchInterval: 30 * 1000, // Poll every 30 seconds
  });
}

// Hook: Send message
export function useSendMessage(roomId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const response = await api.post<{ success: boolean; data: ChatMessage }>(
        `/tenant-api/chat/rooms/${roomId}/messages`,
        { content }
      );
      return response.data.data;
    },
    onSuccess: (newMessage) => {
      // Optimistically update messages
      queryClient.setQueryData(chatKeys.messages(roomId), (old: unknown) => {
        if (!old) return old;
        const typedOld = old as { pages: { messages: ChatMessage[] }[]; pageParams: unknown[] };
        return {
          ...typedOld,
          pages: typedOld.pages.map((page, idx) =>
            idx === 0 ? { ...page, messages: [newMessage, ...page.messages] } : page
          ),
        };
      });
      // Invalidate rooms to update last_message
      queryClient.invalidateQueries({ queryKey: chatKeys.rooms() });
    },
  });
}

// Hook: Create new chat room (direct message)
export function useCreateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: number) => {
      const response = await api.post<RoomResponse>('/tenant-api/chat/rooms', {
        participant_ids: [userId],
        type: 'direct',
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.rooms() });
    },
  });
}

// Hook: Create group chat
export function useCreateGroupChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, participantIds }: { name: string; participantIds: number[] }) => {
      const response = await api.post<RoomResponse>('/tenant-api/chat/rooms', {
        name,
        participant_ids: participantIds,
        type: 'group',
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.rooms() });
    },
  });
}

// Hook: Mark room as read
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomId: number) => {
      await api.post(`/tenant-api/chat/rooms/${roomId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.unread() });
      queryClient.invalidateQueries({ queryKey: chatKeys.rooms() });
    },
  });
}

// Hook: Search users for new chat
export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: ['users', 'search', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const response = await api.get<{ success: boolean; data: User[] }>(
        `/tenant-api/users/search?q=${encodeURIComponent(query)}`
      );
      return response.data.data;
    },
    enabled: query.length >= 2,
    staleTime: 60 * 1000,
  });
}
