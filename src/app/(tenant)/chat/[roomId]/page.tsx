"use client";

import { useParams } from "next/navigation";
import { useChatRoom } from "@/hooks/useChat";
import { Loader2, AlertCircle, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/stores/auth";

const schema = z.object({
  content: z.string().min(1),
});

export default function ChatRoomPage() {
  const params = useParams();
  const roomId = Number(params.roomId);
  const { user } = useAuthStore();
  const { data: room, isLoading, error } = useChatRoom(roomId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: { content: string }) => {
    // TODO: Implement send message mutation
    console.log(data);
    reset();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          <div>
            <h3 className="font-medium text-red-800 dark:text-red-200">
              Error loading chat room
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              There was an error loading the chat room. Please try again later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {room.name}
        </h2>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {room.messages?.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender_id === user?.id ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`p-3 rounded-lg max-w-lg ${
                  message.sender_id === user?.id
                    ? "bg-violet-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className="text-xs text-right mt-1 opacity-75">
                  {new Date(message.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit(onSubmit)} className="flex items-center">
          <input
            {...register("content")}
            type="text"
            placeholder="Type a message..."
            className="flex-1 block w-full pl-3 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 dark:focus:placeholder-gray-500 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
