"use client";

import { PlusCircle } from "lucide-react";
import Link from "next/link";

export function QuickActions() {
  const actions = [
    {
      label: "New Appointment",
      href: "/appointments/new",
    },
    {
      label: "New Client",
      href: "/clients/new",
    },
    {
      label: "New Team Member",
      href: "/team/new",
    },
    {
      label: "Create Report",
      href: "/my-reports",
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 shadow sm:rounded-md">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
          Quick Actions
        </h3>
      </div>
      <div className="border-t border-gray-200 dark:border-gray-800">
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}