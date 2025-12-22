"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import { useBillingReport } from "@/hooks/useReports";
import {
  ChevronLeft,
  Download,
  Loader2,
  DollarSign,
  Calendar,
  Users,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function BillingReportPage() {
  const [dateRange, setDateRange] = useState({
    start_date: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end_date: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });
  const [expandedClient, setExpandedClient] = useState<number | null>(null);

  const { data: billing, isLoading, error } = useBillingReport(dateRange);

  const handlePeriodChange = (period: string) => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (period) {
      case "this-month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "last-month":
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        break;
      case "last-3-months":
        start = startOfMonth(subMonths(now, 2));
        end = endOfMonth(now);
        break;
      default:
        return;
    }

    setDateRange({
      start_date: format(start, "yyyy-MM-dd"),
      end_date: format(end, "yyyy-MM-dd"),
    });
  };

  // Calculate totals
  const totals = billing?.reduce(
    (acc, item) => ({
      total_units: acc.total_units + item.total_units,
      total_amount: acc.total_amount + item.total_amount,
      clients_count: acc.clients_count + 1,
    }),
    { total_units: 0, total_amount: 0, clients_count: 0 }
  );

  // Chart data - top clients by units
  const chartData = billing
    ?.sort((a, b) => b.total_units - a.total_units)
    .slice(0, 8)
    .map((item) => ({
      name:
        (item.client.full_name || item.client.user?.name || "Unknown")
          .split(" ")[0]
          .slice(0, 10) || "Client",
      units: item.total_units,
      amount: item.total_amount,
    }));

  const getClientName = (client: {
    full_name?: string;
    user?: { name: string };
  }) => {
    return client.full_name || client.user?.name || "Unknown Client";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/reports"
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Client Billing Report
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Service units and billing by client
            </p>
          </div>
        </div>

        <button className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <select
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 transition-colors"
            >
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="last-3-months">Last 3 Months</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) =>
                setDateRange((prev) => ({
                  ...prev,
                  start_date: e.target.value,
                }))
              }
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 transition-colors"
            />
            <span className="text-gray-500 dark:text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, end_date: e.target.value }))
              }
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Units
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {totals?.total_units?.toLocaleString() || "--"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Amount
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                ${totals?.total_amount?.toLocaleString() || "--"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Clients Billed
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {totals?.clients_count || "--"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData && chartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Units by Client
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                  opacity={0.3}
                />
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#6b7280"
                  fontSize={12}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  formatter={(value) => [String(value ?? 0), "Units"]}
                />
                <Bar dataKey="units" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Units
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-600 mx-auto" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-red-500 dark:text-red-400"
                  >
                    Failed to load billing data
                  </td>
                </tr>
              ) : !billing || billing.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No billing data for the selected period
                  </td>
                </tr>
              ) : (
                billing.map((item) => (
                  <Fragment key={item.client_id}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-4">
                        <Link
                          href={`/clients/${item.client_id}`}
                          className="font-medium text-gray-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400"
                        >
                          {getClientName(item.client)}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-gray-700 dark:text-gray-300">
                        {format(new Date(item.period_start), "MMM d")} -{" "}
                        {format(new Date(item.period_end), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-gray-900 dark:text-white">
                        {item.total_units.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-green-600 dark:text-green-400">
                        ${item.total_amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() =>
                            setExpandedClient(
                              expandedClient === item.client_id
                                ? null
                                : item.client_id
                            )
                          }
                          className="p-1 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 rounded transition-colors"
                        >
                          {expandedClient === item.client_id ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedClient === item.client_id &&
                      item.services.length > 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-2 bg-gray-50 dark:bg-gray-900/30"
                          >
                            <div className="grid grid-cols-3 gap-4">
                              {item.services.map((service, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {service.speciality.short_name ||
                                        service.speciality.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {service.units_used} units
                                    </p>
                                  </div>
                                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                                    ${service.amount.toLocaleString()}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                  </Fragment>
                ))
              )}
            </tbody>
            {billing && billing.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 font-medium">
                  <td className="px-4 py-3 text-gray-900 dark:text-white">
                    Total ({totals?.clients_count} clients)
                  </td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                    {totals?.total_units.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                    ${totals?.total_amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
