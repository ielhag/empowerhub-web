"use client";

import { useReportsDashboard } from "@/hooks/useReports";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Loader2, AlertCircle } from "lucide-react";

export default function ReportsDashboardPage() {
  const { data, isLoading, error } = useReportsDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          <div>
            <h3 className="font-medium text-red-800 dark:text-red-200">
              Error loading reports dashboard
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              There was an error loading the reports dashboard. Please try
              again later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Payroll Summary
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.payrollSummary}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="amount" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Client Billing
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.clientBilling}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="amount" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Unit Utilization
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.unitUtilization}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="units" stroke="#8b5cf6" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
