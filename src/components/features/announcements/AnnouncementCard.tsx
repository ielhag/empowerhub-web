"use client";

import { useState } from "react";
import { cn, formatDate } from "@/lib/utils";
import {
  useAnnouncementComments,
  usePublishAnnouncement,
  useDeleteAnnouncement,
  useMarkAsRead,
  useAddComment,
  useLikeComment,
  useUnlikeComment,
  type Announcement,
  type AnnouncementComment,
} from "@/hooks/useAnnouncements";
import {
  Edit,
  Trash2,
  Check,
  MessageSquare,
  CheckCircle,
  ThumbsUp,
  Clock,
  Loader2,
} from "lucide-react";

interface AnnouncementCardProps {
  announcement: Announcement;
  isAdmin: boolean;
  onEdit: (announcement: Announcement) => void;
  onShowReaders: (readers: { id: number; name: string; timestamp?: string; timestampType?: string }[]) => void;
  onShowLikers: (likers: { id: number; name: string }[]) => void;
  onImageClick: (images: { url: string }[], index: number) => void;
}

export function AnnouncementCard({
  announcement,
  isAdmin,
  onEdit,
  onShowReaders,
  onShowLikers,
  onImageClick,
}: AnnouncementCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [expandedContent, setExpandedContent] = useState(false);
  const [newComment, setNewComment] = useState("");

  // Fetch comments when expanded
  const { data: commentsData, isLoading: loadingComments } = useAnnouncementComments(
    showComments ? announcement.id : 0
  );

  // Mutations
  const publishMutation = usePublishAnnouncement();
  const deleteMutation = useDeleteAnnouncement();
  const markAsReadMutation = useMarkAsRead();
  const addCommentMutation = useAddComment();
  const likeCommentMutation = useLikeComment();
  const unlikeCommentMutation = useUnlikeComment();

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    await deleteMutation.mutateAsync(announcement.id);
  };

  const handlePublish = async () => {
    if (!confirm("Are you sure you want to publish this announcement? This will notify all team members.")) return;
    await publishMutation.mutateAsync(announcement.id);
  };

  const handleMarkAsRead = async () => {
    if (announcement.is_read) {
      onShowReaders(
        announcement.readers.map((r) => ({
          id: r.id,
          name: r.name,
          timestamp: r.pivot?.created_at,
          timestampType: "Read",
        }))
      );
    } else {
      await markAsReadMutation.mutateAsync(announcement.id);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await addCommentMutation.mutateAsync({
      announcementId: announcement.id,
      content: newComment,
    });
    setNewComment("");
  };

  const handleLikeComment = async (comment: AnnouncementComment) => {
    if (comment.is_liked) {
      await unlikeCommentMutation.mutateAsync({
        announcementId: announcement.id,
        commentId: comment.id,
      });
    } else {
      await likeCommentMutation.mutateAsync({
        announcementId: announcement.id,
        commentId: comment.id,
      });
    }
  };

  const formatRelativeDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return `Today at ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (days === 1) {
      return `Yesterday at ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
    } else {
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  };

  const isContentLong = (content: string) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;
    return (tempDiv.textContent?.length || 0) > 200;
  };

  const comments = commentsData?.comments || [];

  return (
    <div className="bg-white dark:bg-gray-900 shadow rounded-lg overflow-hidden h-full flex flex-col min-h-[300px]">
      <div className="px-4 py-5 sm:p-6 flex-grow flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-1">
              {announcement.title}
            </h3>
            <span
              className={cn(
                "px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap",
                announcement.status === "draft"
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                  : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
              )}
            >
              {announcement.status === "draft" ? "Draft" : "Published"}
            </span>
          </div>

          {isAdmin && (
            <div className="flex items-center space-x-2 ml-2 shrink-0">
              {announcement.status === "draft" && (
                <button
                  onClick={handlePublish}
                  disabled={publishMutation.isPending}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/50 rounded-md transition-all"
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  Publish
                </button>
              )}
              <button
                onClick={() => onEdit(announcement)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/50 rounded-md transition-all"
              >
                <Edit className="h-4 w-4 mr-1.5" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-md transition-all"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Images */}
        {announcement.images.length > 0 && (
          <div className="mt-4">
            <div
              className={cn(
                "grid gap-4",
                announcement.images.length === 1 && "grid-cols-1",
                announcement.images.length === 2 && "grid-cols-2",
                announcement.images.length > 2 && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
              )}
            >
              {announcement.images.map((image, index) => (
                <div key={index} className="relative group aspect-video">
                  <img
                    src={image.url}
                    alt={`${announcement.title} image ${index + 1}`}
                    className="rounded-lg w-full h-full object-cover cursor-zoom-in transition-transform duration-200 hover:scale-[1.02]"
                    onClick={() => onImageClick(announcement.images, index)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="mt-4 flex-grow overflow-hidden">
          <div className="relative">
            <div
              className={cn(
                "prose prose-gray dark:prose-invert max-w-none transition-all duration-200",
                "text-gray-800 dark:text-gray-200",
                "prose-headings:text-gray-900 dark:prose-headings:text-white",
                "prose-p:text-gray-700 dark:prose-p:text-gray-300",
                "prose-strong:text-gray-900 dark:prose-strong:text-white",
                "prose-a:text-violet-600 dark:prose-a:text-violet-400",
                !expandedContent && "max-h-[150px] overflow-hidden"
              )}
              dangerouslySetInnerHTML={{ __html: announcement.body }}
            />

            {!expandedContent && isContentLong(announcement.body) && (
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none" />
            )}
          </div>

          {isContentLong(announcement.body) && (
            <button
              onClick={() => setExpandedContent(!expandedContent)}
              className="mt-2 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400"
            >
              {expandedContent ? "Show Less" : "Show More"}
            </button>
          )}
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            {/* Loading Comments */}
            {loadingComments && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
              </div>
            )}

            {/* Comments List */}
            {!loadingComments && comments.length > 0 && (
              <div className="space-y-3 mb-4">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg"
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        {comment.user?.name || "Unknown"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatRelativeDate(comment.created_at)}
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                      {comment.content}
                    </div>
                    <div className="mt-2 flex items-center space-x-2">
                      <button
                        onClick={() => handleLikeComment(comment)}
                        className={cn(
                          "flex items-center space-x-1 text-xs transition-colors",
                          comment.is_liked
                            ? "text-violet-600 dark:text-violet-400"
                            : "text-gray-500 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400"
                        )}
                      >
                        <ThumbsUp
                          className="h-3.5 w-3.5"
                          fill={comment.is_liked ? "currentColor" : "none"}
                        />
                        <span>{comment.like_count || 0}</span>
                      </button>

                      {comment.like_count > 0 && (
                        <button
                          onClick={() => onShowLikers(comment.liked_by)}
                          className="text-xs text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400"
                        >
                          View
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loadingComments && comments.length === 0 && (
              <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-3">
                No comments yet. Be the first to comment!
              </div>
            )}

            {/* Add Comment Form */}
            <div className="mt-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full min-h-[80px] p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                placeholder="Write a comment..."
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleAddComment}
                  disabled={addCommentMutation.isPending || !newComment.trim()}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-colors disabled:opacity-50"
                >
                  {addCommentMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Add Comment"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 mt-auto bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shrink-0">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Posted by <span className="font-medium text-gray-800 dark:text-gray-200">{announcement.user?.name || "Unknown"}</span> ·{" "}
            {formatRelativeDate(announcement.created_at)}
          </div>
          <div className="flex items-center space-x-4">
            {/* Read count */}
            <button
              onClick={handleMarkAsRead}
              className={cn(
                "flex items-center space-x-1 text-sm focus:outline-none",
                announcement.is_read
                  ? "text-violet-600 dark:text-violet-400"
                  : "text-gray-600 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400"
              )}
              title={announcement.is_read ? "View readers" : "Mark as read"}
            >
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">{announcement.read_count || 0}</span>
              <span className="hidden sm:inline text-xs text-gray-500 dark:text-gray-400">
                Reads
              </span>
            </button>

            {/* Comment count */}
            <button
              onClick={() => setShowComments(!showComments)}
              className={cn(
                "flex items-center space-x-1 text-sm focus:outline-none",
                showComments
                  ? "text-violet-600 dark:text-violet-400"
                  : "text-gray-600 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400"
              )}
            >
              <MessageSquare
                className="h-4 w-4"
                fill={showComments ? "currentColor" : "none"}
              />
              <span className="font-medium">{announcement.comment_count || 0}</span>
              <span className="hidden sm:inline text-xs text-gray-500 dark:text-gray-400">
                comments
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
