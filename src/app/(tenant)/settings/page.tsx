"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ProfileSettings } from "./profile/page";
import { BrandingSettings } from "./branding/page";
import { NotificationsSettings } from "./notifications/page";

const tabs = [
  { name: "Profile", component: ProfileSettings },
  { name: "Branding", component: BrandingSettings },
  { name: "Notifications", component: NotificationsSettings },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("Profile");

  const ActiveComponent = tabs.find((tab) => tab.name === activeTab)?.component;

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={cn(
                "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
                activeTab === tab.name
                  ? "border-violet-500 text-violet-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>
      <div>{ActiveComponent && <ActiveComponent />}</div>
    </div>
  );
}
