"use client";

import { use, useState, useRef, useEffect } from "react";
import {
  useChatRoom,
  useChatMessages,
  useSendMessage,
  useMarkAsRead,
} from "@/hooks/useChat";
import { cn } from "@/lib/utils";
import {
  Send,
  Loader2,
  User,
  Users,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Mic,
  Lock,
  Info,
  ChevronDown,
  Shield,
  ShieldCheck,
  FileLock,
  Globe,
  X,
} from "lucide-react";
import { format, parseISO, isToday, isYesterday, isSameDay } from "date-fns";

interface ChatRoomPageProps {
  params: Promise<{ roomId: string }>;
}

export default function ChatRoomPage({ params }: ChatRoomPageProps) {
  const { roomId } = use(params);
  const roomIdNum = parseInt(roomId, 10);
  const [message, setMessage] = useState("");
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
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

  // Mark as read when room is opened and reset scroll state
  useEffect(() => {
    if (roomIdNum > 0) {
      markAsReadMutation.mutate(roomIdNum);
      setIsInitialLoad(true);
      setIsNearBottom(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomIdNum]);

  // Scroll to bottom function
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
      setIsNearBottom(true);
    }
  };

  // Check if user is near bottom of scroll
  const checkIfNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 100; // pixels from bottom
    const isNear = scrollHeight - scrollTop - clientHeight < threshold;
    setIsNearBottom(isNear);
  };

  // Scroll to bottom when messages first load or when new messages arrive (if user is at bottom)
  useEffect(() => {
    if (messages.length > 0) {
      if (isInitialLoad) {
        // Initial load - scroll immediately without smooth behavior
        setTimeout(() => {
          scrollToBottom("auto");
          setIsInitialLoad(false);
        }, 100);
      } else if (isNearBottom) {
        // User is at bottom - auto-scroll to new messages
        setTimeout(() => {
          scrollToBottom("smooth");
        }, 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // Set up scroll listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", checkIfNearBottom);
    // Check initial position
    checkIfNearBottom();

    return () => {
      container.removeEventListener("scroll", checkIfNearBottom);
    };
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMutation.isPending) return;

    try {
      await sendMutation.mutateAsync(message.trim());
      setMessage("");
      inputRef.current?.focus();
      // Ensure we scroll to bottom after sending
      setIsNearBottom(true);
      setTimeout(() => scrollToBottom("smooth"), 100);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const getRoomName = () => {
    if (!room) return "Loading...";
    if (room.name) return room.name;
    if (room.type === "direct" && room.participants.length >= 1) {
      return room.participants[0]?.name || "Unknown";
    }
    return room.participants.map((p) => p.name).join(", ");
  };

  const formatMessageDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  };

  const shouldShowDateHeader = (
    currentMsg: (typeof messages)[0],
    prevMsg?: (typeof messages)[0]
  ) => {
    if (!prevMsg) return true;
    return !isSameDay(
      parseISO(currentMsg.created_at),
      parseISO(prevMsg.created_at)
    );
  };

  if (roomLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              room?.type === "group"
                ? "bg-violet-100 dark:bg-violet-900/30"
                : "bg-gray-100 dark:bg-gray-700"
            )}
          >
            {room?.type === "group" ? (
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
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {getRoomName()}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {room?.type === "group"
                ? `${room.participants.length} members`
                : room?.participants[0]?.status === "active"
                ? "Online"
                : "Offline"}
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
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-w-0 min-h-0 relative"
      >
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
                  className={cn(
                    "flex gap-3 w-full min-w-0",
                    isOwnMessage ? "justify-end" : "justify-start"
                  )}
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
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </span>
                      )}
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex flex-col min-w-0 max-w-[70%]",
                      isOwnMessage && "items-end",
                      !isOwnMessage && "items-start"
                    )}
                  >
                    {!isOwnMessage && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate w-full">
                        {msg.sender.name}
                      </p>
                    )}
                    <div
                      className={cn(
                        "px-4 py-2 rounded-2xl break-words",
                        isOwnMessage
                          ? "bg-violet-600 text-white rounded-tr-sm"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-sm"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">
                        {msg.content}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "text-xs text-gray-400 dark:text-gray-500 mt-1",
                        isOwnMessage ? "text-right" : "text-left"
                      )}
                    >
                      {format(parseISO(msg.created_at), "h:mm a")}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {!isNearBottom && (
        <div className="absolute bottom-20 right-6 z-10">
          <button
            onClick={() => scrollToBottom("smooth")}
            className="p-3 bg-violet-600 hover:bg-violet-700 text-white rounded-full shadow-lg transition-all hover:scale-110"
            aria-label="Scroll to bottom"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 shrink-0">
        <form onSubmit={handleSend} className="p-4">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors"
            />
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
              aria-label="Voice input"
            >
              <Mic className="w-5 h-5" />
            </button>
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
              aria-label="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <button
              type="submit"
              disabled={!message.trim() || sendMutation.isPending}
              className="p-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              {sendMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>

        {/* Security Message */}
        <div className="px-4 pb-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Lock className="w-3.5 h-3.5" />
          <span>
            Your messages are protected with AES-256 encryption for enhanced
            privacy and security.
          </span>
          <button
            type="button"
            onClick={() => setShowPrivacyModal(true)}
            className="ml-auto p-0.5 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="More information"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Privacy & Security Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white dark:bg-gray-900 rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div className="px-4 pt-5 pb-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white flex items-center">
                  <Lock className="w-5 h-5 mr-2 text-green-600" />
                  Message Privacy & Security
                </h3>
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <ShieldCheck className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <h4 className="font-medium">End-to-End Encryption</h4>
                    <p className="mt-1">
                      Your messages are automatically encrypted before being
                      stored in our database using AES-256-CBC encryption, one
                      of the most secure encryption algorithms available.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <FileLock className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <h4 className="font-medium">How It Works</h4>
                    <p className="mt-1">
                      When you send a message, it&apos;s encrypted on our
                      servers using an encryption system before being stored in
                      the database. The message is only decrypted when retrieved
                      by authorized recipients.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <h4 className="font-medium">HIPAA Compliance</h4>
                    <p className="mt-1">
                      Our message encryption helps meet HIPAA requirements for
                      protecting sensitive health information, ensuring your
                      communications remain confidential and secure.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <Globe className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <h4 className="font-medium">Our Commitment</h4>
                    <p className="mt-1">
                      We&apos;re committed to protecting your privacy and
                      maintaining the confidentiality of all communications
                      within our platform. We cannot and do not access the
                      content of your encrypted messages.
                    </p>
                    <div className="my-2 border-t border-gray-200 dark:border-gray-700"></div>
                    <p className="mt-2 bg-violet-100 dark:bg-violet-900 rounded-lg p-2">
                      Learn more about our{" "}
                      <a
                        href="https://empowerhub.io/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                      >
                        Privacy Policy
                      </a>{" "}
                      and{" "}
                      <a
                        href="https://empowerhub.io/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                      >
                        Terms of Service
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-right">
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-violet-600 border border-transparent rounded-md shadow-sm hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
