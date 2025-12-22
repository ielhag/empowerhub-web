'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useChatRooms, useUnreadCounts, useCreateRoom, useSearchUsers } from '@/hooks/useChat';
import { cn } from '@/lib/utils';
import type { ChatRoom } from '@/types';
import {
  MessageCircle,
  Search,
  Plus,
  Users,
  User,
  Loader2,
  X,
  Check,
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

export default function ChatPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const { data: rooms, isLoading, error } = useChatRooms();
  const { data: unreadData } = useUnreadCounts();
  const { data: searchResults } = useSearchUsers(userSearchQuery);
  const createRoomMutation = useCreateRoom();

  const filteredRooms = rooms?.filter((room) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    if (room.name?.toLowerCase().includes(searchLower)) return true;
    return room.participants.some((p) => p.name.toLowerCase().includes(searchLower));
  });

  const getUnreadCount = (roomId: number) => {
    return unreadData?.rooms.find((r) => r.room_id === roomId)?.count || 0;
  };

  const getRoomName = (room: ChatRoom) => {
    if (room.name) return room.name;
    if (room.type === 'direct' && room.participants.length === 2) {
      // In a direct chat, show the other person's name
      // This assumes current user is filtered out in the API
      return room.participants[0]?.name || 'Unknown';
    }
    return room.participants.map((p) => p.name).join(', ');
  };

  const handleCreateDirectChat = async (userId: number) => {
    try {
      await createRoomMutation.mutateAsync(userId);
      setShowNewChat(false);
      setUserSearchQuery('');
    } catch (err) {
      console.error('Failed to create chat:', err);
    }
  };

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {unreadData?.total_unread
              ? `${unreadData.total_unread} unread message${unreadData.total_unread !== 1 ? 's' : ''}`
              : 'Chat with your team'}
          </p>
        </div>
        <button
          onClick={() => setShowNewChat(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-red-500 dark:text-red-400">Failed to load chats</p>
          </div>
        ) : !filteredRooms || filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <MessageCircle className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No conversations yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Start a new chat with your team
            </p>
            <button
              onClick={() => setShowNewChat(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredRooms.map((room) => {
              const unreadCount = getUnreadCount(room.id);

              return (
                <Link
                  key={room.id}
                  href={`/chat/${room.id}`}
                  className={cn(
                    'flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                    unreadCount > 0 && 'bg-violet-50/50 dark:bg-violet-900/10'
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center',
                      room.type === 'group'
                        ? 'bg-violet-100 dark:bg-violet-900/30'
                        : 'bg-gray-100 dark:bg-gray-700'
                    )}
                  >
                    {room.type === 'group' ? (
                      <Users className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                    ) : room.participants[0]?.avatar ? (
                      <img
                        src={room.participants[0].avatar}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3
                        className={cn(
                          'font-medium truncate',
                          unreadCount > 0
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-700 dark:text-gray-300'
                        )}
                      >
                        {getRoomName(room)}
                      </h3>
                      {room.last_message && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 shrink-0">
                          {formatDistanceToNow(parseISO(room.last_message.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                    </div>
                    {room.last_message && (
                      <p
                        className={cn(
                          'text-sm truncate',
                          unreadCount > 0
                            ? 'text-gray-700 dark:text-gray-300 font-medium'
                            : 'text-gray-500 dark:text-gray-400'
                        )}
                      >
                        {room.last_message.sender.name}: {room.last_message.content}
                      </p>
                    )}
                  </div>

                  {/* Unread Badge */}
                  {unreadCount > 0 && (
                    <div className="w-6 h-6 bg-violet-600 text-white text-xs font-medium rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Start New Chat
              </h2>
              <button
                onClick={() => {
                  setShowNewChat(false);
                  setUserSearchQuery('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search team members..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-violet-500 transition-colors"
                  autoFocus
                />
              </div>

              <div className="max-h-64 overflow-y-auto">
                {!userSearchQuery ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    Search for a team member to start chatting
                  </p>
                ) : !searchResults || searchResults.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No users found
                  </p>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleCreateDirectChat(user.id)}
                        disabled={createRoomMutation.isPending}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                      >
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-700 dark:text-violet-400 font-medium">
                            {user.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)}
                          </div>
                        )}
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                        </div>
                        {createRoomMutation.isPending && (
                          <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
