'use client';

import { use, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useChatRoom, useChatMessages, useSendMessage, useMarkAsRead } from '@/hooks/useChat';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  Send,
  Loader2,
  User,
  Users,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
} from 'lucide-react';
import { format, parseISO, isToday, isYesterday, isSameDay } from 'date-fns';

interface ChatRoomPageProps {
  params: Promise<{ roomId: string }>;
}

export default function ChatRoomPage({ params }: ChatRoomPageProps) {
  const { roomId } = use(params);
  const roomIdNum = parseInt(roomId, 10);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: room, isLoading: roomLoading } = useChatRoom(roomIdNum);
  const {
    data: messagesData,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useChatMessages(roomIdNum);
  const sendMutation = useSendMessage(roomIdNum);
  const markAsReadMutation = useMarkAsRead();

  // Flatten messages from infinite query
  const messages = messagesData?.pages.flatMap((page) => page.messages) || [];

  // Mark as read when room is opened
  useEffect(() => {
    if (roomIdNum > 0) {
      markAsReadMutation.mutate(roomIdNum);
    }
  }, [roomIdNum]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMutation.isPending) return;

    try {
      await sendMutation.mutateAsync(message.trim());
      setMessage('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const getRoomName = () => {
    if (!room) return 'Loading...';
    if (room.name) return room.name;
    if (room.type === 'direct' && room.participants.length >= 1) {
      return room.participants[0]?.name || 'Unknown';
    }
    return room.participants.map((p) => p.name).join(', ');
  };

  const formatMessageDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  const shouldShowDateHeader = (currentMsg: typeof messages[0], prevMsg?: typeof messages[0]) => {
    if (!prevMsg) return true;
    return !isSameDay(parseISO(currentMsg.created_at), parseISO(prevMsg.created_at));
  };

  if (roomLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-180px)]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              room?.type === 'group'
                ? 'bg-violet-100 dark:bg-violet-900/30'
                : 'bg-gray-100 dark:bg-gray-700'
            )}
          >
            {room?.type === 'group' ? (
              <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            ) : room?.participants[0]?.avatar ? (
              <img
                src={room.participants[0].avatar}
                alt=""
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            )}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">{getRoomName()}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {room?.type === 'group'
                ? `${room.participants.length} members`
                : room?.participants[0]?.status === 'active'
                ? 'Online'
                : 'Offline'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <Video className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Load more button */}
        {hasNextPage && (
          <div className="text-center">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="px-4 py-2 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors disabled:opacity-50"
            >
              {isFetchingNextPage ? (
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              ) : null}
              Load older messages
            </button>
          </div>
        )}

        {messagesLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const prevMsg = idx > 0 ? messages[idx - 1] : undefined;
            const showDateHeader = shouldShowDateHeader(msg, prevMsg);
            // For demo, assume current user id is 1
            const isOwnMessage = msg.sender_id === 1;

            return (
              <div key={msg.id}>
                {showDateHeader && (
                  <div className="flex items-center justify-center my-4">
                    <span className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full">
                      {formatMessageDate(msg.created_at)}
                    </span>
                  </div>
                )}
                <div
                  className={cn('flex gap-3', isOwnMessage ? 'justify-end' : 'justify-start')}
                >
                  {!isOwnMessage && (
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                      {msg.sender.avatar ? (
                        <img
                          src={msg.sender.avatar}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {msg.sender.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)}
                        </span>
                      )}
                    </div>
                  )}
                  <div className={cn('max-w-[70%]', isOwnMessage && 'order-first')}>
                    {!isOwnMessage && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {msg.sender.name}
                      </p>
                    )}
                    <div
                      className={cn(
                        'px-4 py-2 rounded-2xl',
                        isOwnMessage
                          ? 'bg-violet-600 text-white rounded-tr-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-sm'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                    <p
                      className={cn(
                        'text-xs text-gray-400 dark:text-gray-500 mt-1',
                        isOwnMessage ? 'text-right' : 'text-left'
                      )}
                    >
                      {format(parseISO(msg.created_at), 'h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors"
          />
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
          >
            <Smile className="w-5 h-5" />
          </button>
          <button
            type="submit"
            disabled={!message.trim() || sendMutation.isPending}
            className="p-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
