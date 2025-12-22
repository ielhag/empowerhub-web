"use client";

import { useChatRooms } from "@/hooks/useChat";
import { Loader2, AlertCircle, MessageSquare } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const { data: rooms, isLoading, error } = useChatRooms();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error || !rooms) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          <div>
            <h3 className="font-medium text-red-800 dark:text-red-200">
              Error loading chat rooms
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              There was an error loading the chat rooms. Please try again later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Chat
        </h2>
      </div>
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {rooms.map((room) => (
          <li key={room.id}>
            <Link
              href={`/chat/${room.id}`}
              className="block hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <div className="flex items-center p-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xl font-semibold text-violet-700 dark:text-violet-400">
                  {room.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {room.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {room.last_message?.content}
                  </div>
                </div>
                {room.unread_count > 0 && (
                  <div className="ml-auto">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800">
                      {room.unread_count}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          </li>
        ))}
        {rooms.length === 0 && (
          <div className="p-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No chat rooms
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              You have not been added to any chat rooms yet.
            </p>
          </div>
        )}
      </ul>
    </div>
  );
}
