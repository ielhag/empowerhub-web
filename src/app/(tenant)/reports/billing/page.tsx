"use client";

import { useState } from "react";
import { useClientBillingReport } from "@/hooks/useReports";
import { Loader2, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

export default function ClientBillingReportPage() {
  const [filters, setFilters] = useState({
    start_date: "",
    end_date: "",
  });
  const { data, isLoading, error } = useClientBillingReport(filters);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Client Billing Report
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="start_date"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Start Date
            </label>
            <input
              type="date"
              id="start_date"
              value={filters.start_date}
              onChange={(e) =>
                setFilters({ ...filters, start_date: e.target.value })
              }
              className="mt-1 block w-full pl-3 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="end_date"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              End Date
            </label>
            <input
              type="date"
              id="end_date"
              value={filters.end_date}
              onChange={(e) =>
                setFilters({ ...filters, end_date: e.target.value })
              }
              className="mt-1 block w-full pl-3 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
            />
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        ) : error ? (
          <div className="p-6">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            <h3 className="font-medium text-red-800 dark:text-red-200">
              Error loading client billing report
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              There was an error loading the client billing report. Please try
              again later.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Total Units</TableHead>
                <TableHead>Total Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((row) => (
                <TableRow key={row.client_id}>
                  <TableCell>{row.client.name}</TableCell>
                  <TableCell>
                    {row.period_start} - {row.period_end}
                  </TableCell>
                  <TableCell>{row.total_units}</TableCell>
                  <TableCell>{row.total_amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
