"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { cn, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import {
  useAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  type Announcement,
} from "@/hooks/useAnnouncements";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Loader2,
  Clock,
} from "lucide-react";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { AnnouncementCard } from "@/components/features/announcements/AnnouncementCard";

export default function AnnouncementsPage() {
  const { isAdmin } = useAuthStore();
  const isUserAdmin = isAdmin();

  // State
  const [page, setPage] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentAnnouncementImages, setCurrentAnnouncementImages] = useState<{ url: string }[]>([]);
  const [showUserListModal, setShowUserListModal] = useState(false);
  const [userListTitle, setUserListTitle] = useState("");
  const [userList, setUserList] = useState<{ id: number; name: string; timestamp?: string; timestampType?: string }[]>([]);
  const [userListSearch, setUserListSearch] = useState("");

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formImages, setFormImages] = useState<File[]>([]);
  const [formImagePreviews, setFormImagePreviews] = useState<string[]>([]);
  const [formPublish, setFormPublish] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: announcementsData, isLoading } = useAnnouncements({ page, per_page: 10 });

  // Mutations
  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();

  // Filtered user list for search
  const filteredUserList = useMemo(() => {
    const search = userListSearch.toLowerCase().trim();
    if (!search) return userList;
    return userList.filter((u) => u.name && u.name.toLowerCase().includes(search));
  }, [userList, userListSearch]);

  // Image viewer functions
  const openImageViewer = useCallback((images: { url: string }[], index: number) => {
    setCurrentAnnouncementImages(images);
    setCurrentImageIndex(index);
    setSelectedImage(images[index].url);
  }, []);

  const closeImageViewer = useCallback(() => {
    setSelectedImage(null);
    setCurrentImageIndex(0);
    setCurrentAnnouncementImages([]);
  }, []);

  const nextImage = useCallback(() => {
    if (currentImageIndex < currentAnnouncementImages.length - 1) {
      const newIndex = currentImageIndex + 1;
      setCurrentImageIndex(newIndex);
      setSelectedImage(currentAnnouncementImages[newIndex].url);
    }
  }, [currentImageIndex, currentAnnouncementImages]);

  const previousImage = useCallback(() => {
    if (currentImageIndex > 0) {
      const newIndex = currentImageIndex - 1;
      setCurrentImageIndex(newIndex);
      setSelectedImage(currentAnnouncementImages[newIndex].url);
    }
  }, [currentImageIndex, currentAnnouncementImages]);

  // Keyboard navigation for image viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImage) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        previousImage();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nextImage();
      } else if (e.key === "Escape") {
        closeImageViewer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImage, previousImage, nextImage, closeImageViewer]);

  // Form functions
  const startNewAnnouncement = () => {
    setEditingAnnouncement(null);
    setFormTitle("");
    setFormBody("");
    setFormImages([]);
    setFormImagePreviews([]);
    setFormPublish(false);
    setFormErrors({});
    setIsEditing(true);
  };

  const editAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormTitle(announcement.title);
    setFormBody(announcement.body);
    setFormImages([]);
    setFormImagePreviews(announcement.images.map((img) => img.url));
    setFormPublish(announcement.status === "published");
    setFormErrors({});
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingAnnouncement(null);
    setFormTitle("");
    setFormBody("");
    setFormImages([]);
    setFormImagePreviews([]);
    setFormPublish(false);
    setFormErrors({});
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 2 * 1024 * 1024; // 2MB

    const newErrors: Record<string, string> = {};
    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    files.forEach((file, index) => {
      if (file.size > maxSize) {
        newErrors[`image_${index}`] = `${file.name} is larger than 2MB`;
      } else {
        validFiles.push(file);
        validPreviews.push(URL.createObjectURL(file));
      }
    });

    setFormImages((prev) => [...prev, ...validFiles]);
    setFormImagePreviews((prev) => [...prev, ...validPreviews]);
    setFormErrors(newErrors);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setFormImages((prev) => prev.filter((_, i) => i !== index));
    setFormImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const saveAnnouncement = async () => {
    if (!formTitle.trim()) {
      setFormErrors({ title: "Title is required" });
      return;
    }
    if (!formBody.trim()) {
      setFormErrors({ body: "Content is required" });
      return;
    }

    try {
      if (editingAnnouncement) {
        await updateMutation.mutateAsync({
          id: editingAnnouncement.id,
          data: {
            title: formTitle,
            body: formBody,
            images: formImages.length > 0 ? formImages : undefined,
            publish: formPublish,
          },
        });
      } else {
        await createMutation.mutateAsync({
          title: formTitle,
          body: formBody,
          images: formImages.length > 0 ? formImages : undefined,
          publish: formPublish,
        });
      }
      cancelEdit();
    } catch {
      setFormErrors({ submit: "Failed to save announcement" });
    }
  };

  const loadUserList = (
    title: string,
    users: { id: number; name: string; timestamp?: string; timestampType?: string }[]
  ) => {
    setUserListTitle(title);
    setUserList(users);
    setUserListSearch("");
    setShowUserListModal(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Image Viewer Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
          onClick={closeImageViewer}
        >
          <div className="relative max-w-7xl max-h-[90vh] mx-auto p-4">
            {currentImageIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  previousImage();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors p-2 rounded-full bg-black/30 hover:bg-black/50"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
            )}

            <img
              src={selectedImage}
              alt="Announcement"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-xl"
              onClick={(e) => e.stopPropagation()}
            />

            {currentImageIndex < currentAnnouncementImages.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors p-2 rounded-full bg-black/30 hover:bg-black/50"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            )}

            <button
              onClick={closeImageViewer}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors p-2 rounded-full bg-black/30 hover:bg-black/50"
            >
              <X className="w-6 h-6" />
            </button>

            {currentAnnouncementImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black bg-opacity-50 px-4 py-2 rounded-full text-sm">
                {currentImageIndex + 1} / {currentAnnouncementImages.length}
              </div>
            )}
          </div>
        </div>
      )}

      {/* User List Modal */}
      {showUserListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 px-4 py-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {userListTitle}
              </h3>
              <button
                onClick={() => setShowUserListModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <input
                  type="text"
                  value={userListSearch}
                  onChange={(e) => setUserListSearch(e.target.value)}
                  placeholder="Search names..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-violet-500 focus:border-violet-500 dark:bg-gray-700 dark:text-white"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div className="overflow-y-auto px-4 py-2" style={{ maxHeight: "60vh" }}>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Showing {filteredUserList.length} of {userList.length} people
              </div>

              <div className="space-y-2">
                {filteredUserList.map((u, index) => (
                  <div
                    key={index}
                    className="flex items-center py-2 px-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center text-violet-800 dark:text-violet-200 font-medium">
                      {getInitials(u.name)}
                    </div>
                    <div className="ml-3 flex-grow">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {u.name}
                      </div>
                      {u.timestamp && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                          <Clock className="inline-block h-3 w-3 mr-1" />
                          {u.timestampType} on {formatDate(u.timestamp)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {filteredUserList.length === 0 && (
                <div className="text-center py-8">
                  <Search className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    No results found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Try adjusting your search term.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {isEditing && (
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-xl rounded-lg">
          <div className="p-6 lg:p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingAnnouncement ? "Edit Announcement" : "New Announcement"}
              </h2>
              <button
                onClick={cancelEdit}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveAnnouncement();
              }}
              className="mt-6 space-y-6"
            >
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-violet-500 focus:ring-violet-500 dark:bg-gray-700 dark:text-white px-3 py-2"
                  required
                />
                {formErrors.title && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>
                )}
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Content
                </label>
                <RichTextEditor
                  content={formBody}
                  onChange={setFormBody}
                  placeholder="Write your announcement..."
                />
                {formErrors.body && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.body}</p>
                )}
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Images (optional)
                </label>
                <div className="mt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="block w-full text-sm text-gray-900 dark:text-gray-300
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-violet-50 file:text-violet-700
                      hover:file:bg-violet-100
                      dark:file:bg-violet-900 dark:file:text-violet-300"
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Maximum file size: 2MB. Supported formats: JPEG, PNG, GIF
                  </p>
                </div>

                {/* Image Previews */}
                {formImagePreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {formImagePreviews.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="rounded-lg w-full h-48 object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="text-white bg-red-600 px-3 py-1 rounded-md text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formPublish}
                    onChange={(e) => setFormPublish(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                    Publish Immediately
                  </span>
                </label>
              </div>

              {formErrors.submit && (
                <p className="text-sm text-red-600">{formErrors.submit}</p>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingAnnouncement ? "Update Announcement" : "Create Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Announcements List */}
      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-xl rounded-lg">
        <div className="p-6 lg:p-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Announcements
            </h2>
            {isUserAdmin && !isEditing && (
              <button
                onClick={startNewAnnouncement}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Announcement
              </button>
            )}
          </div>

          <div className="mt-6">
            {/* Loading Skeleton */}
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-gray-900 shadow rounded-lg overflow-hidden h-full flex flex-col min-h-[300px] animate-pulse"
                  >
                    <div className="px-4 py-5 sm:p-6 flex-grow flex flex-col">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-4">
                          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                          <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                        </div>
                      </div>
                      <div className="mt-4 flex-grow flex flex-col items-center justify-center">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="px-4 py-3 mt-auto bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex justify-between">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                        <div className="flex space-x-2">
                          <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Announcements Grid */}
            {!isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {announcementsData?.data.map((announcement) => (
                  <AnnouncementCard
                    key={announcement.id}
                    announcement={announcement}
                    isAdmin={isUserAdmin}
                    onEdit={editAnnouncement}
                    onShowReaders={(readers) => loadUserList("People who read this", readers)}
                    onShowLikers={(likers) => loadUserList("People who liked this comment", likers)}
                    onImageClick={openImageViewer}
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && announcementsData?.data.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                <p className="text-lg">No announcements yet.</p>
                {isUserAdmin && (
                  <button
                    onClick={startNewAnnouncement}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-violet-600 bg-violet-100 hover:bg-violet-200 dark:bg-violet-900 dark:text-violet-300"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create the first announcement
                  </button>
                )}
              </div>
            )}

            {/* Pagination */}
            {!isLoading && announcementsData && announcementsData.last_page > 1 && (
              <div className="mt-6 flex justify-center space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                  Page {page} of {announcementsData.last_page}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(announcementsData.last_page, p + 1))}
                  disabled={page === announcementsData.last_page}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
