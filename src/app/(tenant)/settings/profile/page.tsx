"use client";

import { useProfileSettings, useUpdateProfile, useUpdatePassword } from "@/hooks/useSettings";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(1),
    new_password: z.string().min(8),
    new_password_confirmation: z.string().min(8),
  })
  .refine((data) => data.new_password === data.new_password_confirmation, {
    message: "Passwords do not match",
    path: ["new_password_confirmation"],
  });

export function ProfileSettings() {
  const { data: settings, isLoading } = useProfileSettings();
  const updateProfile = useUpdateProfile();
  const updatePassword = useUpdatePassword();

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { isSubmitting: isSubmittingProfile },
  } = useForm({
    resolver: zodResolver(profileSchema),
    values: {
      name: settings?.user.name || "",
      email: settings?.user.email || "",
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { isSubmitting: isSubmittingPassword },
  } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = (data: any) => {
    updateProfile.mutate(data);
  };

  const onPasswordSubmit = (data: any) => {
    updatePassword.mutate(data);
  };

  if (isLoading) {
    return <Loader2 className="w-8 h-8 animate-spin text-violet-600" />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Profile
        </h3>
        <form onSubmit={handleSubmitProfile(onProfileSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Name
            </label>
            <input
              type="text"
              id="name"
              {...registerProfile("name")}
              className="mt-1 block w-full pl-3 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              {...registerProfile("email")}
              className="mt-1 block w-full pl-3 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmittingProfile}
            className="px-4 py-2 text-sm font-medium text-white bg-violet-600 border border-transparent rounded-md shadow-sm hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
          >
            {isSubmittingProfile ? "Saving..." : "Save"}
          </button>
        </form>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Change Password
        </h3>
        <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="current_password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Current Password
            </label>
            <input
              type="password"
              id="current_password"
              {...registerPassword("current_password")}
              className="mt-1 block w-full pl-3 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="new_password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              New Password
            </label>
            <input
              type="password"
              id="new_password"
              {...registerPassword("new_password")}
              className="mt-1 block w-full pl-3 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="new_password_confirmation"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Confirm New Password
            </label>
            <input
              type="password"
              id="new_password_confirmation"
              {...registerPassword("new_password_confirmation")}
              className="mt-1 block w-full pl-3 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmittingPassword}
            className="px-4 py-2 text-sm font-medium text-white bg-violet-600 border border-transparent rounded-md shadow-sm hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
          >
            {isSubmittingPassword ? "Saving..." : "Save"}
          </button>
        </form>
      </div>
    </div>
  );
}