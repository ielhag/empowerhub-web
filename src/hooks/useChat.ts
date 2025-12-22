import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api/client';
import type { ChatRoom } from '@/types';

// Query keys
export const chatKeys = {
  all: ['chat'] as const,
  rooms: () => [...chatKeys.all, 'rooms'] as const,
  room: (id: number) => [...chatKeys.all, 'room', id] as const,
};

// API response types
interface ChatRoomsResponse {
  success: boolean;
  data: ChatRoom[];
}

// Fetch chat rooms
async function fetchChatRooms(): Promise<ChatRoom[]> {
  const response = await api.get<ChatRoomsResponse>('/tenant-api/chat/rooms');
  return response.data.data;
}

// Hook: Fetch chat rooms
export function useChatRooms() {
  return useQuery({
    queryKey: chatKeys.rooms(),
    queryFn: fetchChatRooms,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// API response types
interface ChatRoomResponse {
  success: boolean;
  data: ChatRoom;
}

// Fetch chat room
async function fetchChatRoom(id: number): Promise<ChatRoom> {
  const response = await api.get<ChatRoomResponse>(`/tenant-api/chat/rooms/${id}`);
  return response.data.data;
}

// Hook: Fetch chat room
export function useChatRoom(id: number) {
  return useQuery({
    queryKey: chatKeys.room(id),
    queryFn: () => fetchChatRoom(id),
    enabled: id > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}