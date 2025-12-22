'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  User,
  Palette,
  Bell,
  Shield,
  CreditCard,
  Settings2,
  ChevronRight,
  Building,
  Globe,
} from 'lucide-react';

const settingsSections = [
  {
    title: 'Personal',
    items: [
      {
        href: '/settings/profile',
        icon: User,
        label: 'Profile',
        description: 'Manage your personal information and preferences',
      },
      {
        href: '/settings/notifications',
        icon: Bell,
        label: 'Notifications',
        description: 'Configure how you receive alerts and updates',
      },
      {
        href: '/settings/security',
        icon: Shield,
        label: 'Security',
        description: 'Password, two-factor authentication, and sessions',
      },
    ],
  },
  {
    title: 'Organization',
    items: [
      {
        href: '/settings/branding',
        icon: Palette,
        label: 'Branding',
        description: 'Customize your organization logo and colors',
      },
      {
        href: '/settings/general',
        icon: Building,
        label: 'General',
        description: 'Organization name, timezone, and basic settings',
      },
      {
        href: '/settings/features',
        icon: Settings2,
        label: 'Features',
        description: 'Enable or disable application features',
      },
    ],
  },
  {
    title: 'Billing',
    items: [
      {
        href: '/settings/billing',
        icon: CreditCard,
        label: 'Subscription',
        description: 'Manage your plan and payment methods',
      },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your account and organization settings
        </p>
      </div>

      {/* Settings Sections */}
      {settingsSections.map((section) => (
        <div key={section.title}>
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            {section.title}
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                >
                  <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">{item.label}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
