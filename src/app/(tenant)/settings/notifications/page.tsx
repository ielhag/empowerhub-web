"use client";

import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from "@/hooks/useSettings";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";

const schema = z.object({
  email_notifications: z.boolean(),
  push_notifications: z.boolean(),
  appointment_reminders: z.boolean(),
  schedule_updates: z.boolean(),
  chat_messages: z.boolean(),
  system_alerts: z.boolean(),
});

export function NotificationsSettings() {
  const { data: settings, isLoading } = useNotificationSettings();
  const updateSettings = useUpdateNotificationSettings();

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    values: {
      email_notifications: settings?.email_notifications || false,
      push_notifications: settings?.push_notifications || false,
      appointment_reminders: settings?.appointment_reminders || false,
      schedule_updates: settings?.schedule_updates || false,
      chat_messages: settings?.chat_messages || false,
      system_alerts: settings?.system_alerts || false,
    },
  });

  const onSubmit = (data: any) => {
    updateSettings.mutate(data);
  };

  if (isLoading) {
    return <Loader2 className="w-8 h-8 animate-spin text-violet-600" />;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Notifications
      </h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="email_notifications"
            {...register("email_notifications")}
            className="h-4 w-4 text-violet-600 border-gray-300 rounded"
          />
          <label
            htmlFor="email_notifications"
            className="ml-2 block text-sm text-gray-900 dark:text-gray-300"
          >
            Email Notifications
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="push_notifications"
            {...register("push_notifications")}
            className="h-4 w-4 text-violet-600 border-gray-300 rounded"
          />
          <label
            htmlFor="push_notifications"
            className="ml-2 block text-sm text-gray-900 dark:text-gray-300"
          >
            Push Notifications
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="appointment_reminders"
            {...register("appointment_reminders")}
            className="h-4 w-4 text-violet-600 border-gray-300 rounded"
          />
          <label
            htmlFor="appointment_reminders"
            className="ml-2 block text-sm text-gray-900 dark:text-gray-300"
          >
            Appointment Reminders
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="schedule_updates"
            {...register("schedule_updates")}
            className="h-4 w-4 text-violet-600 border-gray-300 rounded"
          />
          <label
            htmlFor="schedule_updates"
            className="ml-2 block text-sm text-gray-900 dark:text-gray-300"
          >
            Schedule Updates
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="chat_messages"
            {...register("chat_messages")}
            className="h-4 w-4 text-violet-600 border-gray-300 rounded"
          />
          <label
            htmlFor="chat_messages"
            className="ml-2 block text-sm text-gray-900 dark:text-gray-300"
          >
            Chat Messages
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="system_alerts"
            {...register("system_alerts")}
            className="h-4 w-4 text-violet-600 border-gray-300 rounded"
          />
          <label
            htmlFor="system_alerts"
            className="ml-2 block text-sm text-gray-900 dark:text-gray-300"
          >
            System Alerts
          </label>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-violet-600 border border-transparent rounded-md shadow-sm hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
        >
          {isSubmitting ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}