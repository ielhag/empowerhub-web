'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useNotificationSettings, useUpdateNotificationSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/utils';
import { ChevronLeft, Bell, Mail, Smartphone, Loader2, Check } from 'lucide-react';

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

function ToggleSwitch({ enabled, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
        enabled ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-700',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          enabled ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

export default function NotificationSettingsPage() {
  const { data: notificationSettings, isLoading } = useNotificationSettings();
  const updateMutation = useUpdateNotificationSettings();

  const [settings, setSettings] = useState({
    email_notifications: true,
    push_notifications: true,
    appointment_reminders: true,
    schedule_updates: true,
    chat_messages: true,
    system_alerts: true,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (notificationSettings) {
      setSettings(notificationSettings);
    }
  }, [notificationSettings]);

  const handleToggle = async (key: keyof typeof settings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);

    try {
      await updateMutation.mutateAsync({ [key]: newSettings[key] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      // Revert on error
      setSettings(settings);
      console.error('Failed to update notification settings:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/settings"
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Configure how you receive notifications
            </p>
          </div>
        </div>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
            <Check className="w-4 h-4" />
            Saved
          </span>
        )}
      </div>

      {/* General Notifications */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Notification Channels
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Choose how you want to receive notifications
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Email Notifications</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receive updates via email
                </p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings.email_notifications}
              onChange={() => handleToggle('email_notifications')}
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Push Notifications</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receive push notifications on mobile
                </p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings.push_notifications}
              onChange={() => handleToggle('push_notifications')}
              disabled={updateMutation.isPending}
            />
          </div>
        </div>
      </div>

      {/* Notification Types */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Notification Types
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Choose which notifications you want to receive
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Appointment Reminders</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Get reminded about upcoming appointments
              </p>
            </div>
            <ToggleSwitch
              enabled={settings.appointment_reminders}
              onChange={() => handleToggle('appointment_reminders')}
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Schedule Updates</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Notifications when your schedule changes
              </p>
            </div>
            <ToggleSwitch
              enabled={settings.schedule_updates}
              onChange={() => handleToggle('schedule_updates')}
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Chat Messages</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Get notified when you receive new messages
              </p>
            </div>
            <ToggleSwitch
              enabled={settings.chat_messages}
              onChange={() => handleToggle('chat_messages')}
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">System Alerts</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Important system and security notifications
              </p>
            </div>
            <ToggleSwitch
              enabled={settings.system_alerts}
              onChange={() => handleToggle('system_alerts')}
              disabled={updateMutation.isPending}
            />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-4">
        <div className="flex gap-3">
          <Bell className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-violet-800 dark:text-violet-300">
              Notification Preferences
            </p>
            <p className="text-sm text-violet-700 dark:text-violet-400 mt-1">
              Changes are saved automatically. Some notifications like security alerts cannot be
              disabled for your protection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
