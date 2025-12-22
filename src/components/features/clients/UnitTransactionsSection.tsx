"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { UnitTransaction, UnitTransactionType } from "@/types";

interface UnitTransactionsSectionProps {
  transactions: UnitTransaction[];
}

interface GroupedMonth {
  label: string;
  monthKey: string;
  transactions: UnitTransaction[];
}

const TYPE_STYLES: Record<
  UnitTransactionType,
  { bg: string; text: string; label: string }
> = {
  allocation: {
    bg: "bg-green-100 dark:bg-green-900/50",
    text: "text-green-800 dark:text-green-300",
    label: "Allocation",
  },
  usage: {
    bg: "bg-red-100 dark:bg-red-900/50",
    text: "text-red-800 dark:text-red-300",
    label: "Usage",
  },
  adjustment: {
    bg: "bg-yellow-100 dark:bg-yellow-900/50",
    text: "text-yellow-800 dark:text-yellow-300",
    label: "Adjustment",
  },
  cancellation: {
    bg: "bg-blue-100 dark:bg-blue-900/50",
    text: "text-blue-800 dark:text-blue-300",
    label: "Cancellation",
  },
  emergency_usage: {
    bg: "bg-orange-100 dark:bg-orange-900/50",
    text: "text-orange-800 dark:text-orange-300",
    label: "Emergency",
  },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMonthLabel(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function UnitTransactionsSection({
  transactions,
}: UnitTransactionsSectionProps) {
  // Track manually toggled months (stores state: true = expanded, false = collapsed)
  const [toggledMonths, setToggledMonths] = useState<Record<string, boolean>>({});

  // Group transactions by month
  const groupedTransactions = useMemo<GroupedMonth[]>(() => {
    if (!transactions || transactions.length === 0) return [];

    const months: Record<string, GroupedMonth> = {};

    transactions.forEach((transaction) => {
      if (!transaction.date) return;

      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth()
      ).padStart(2, "0")}`;

      if (!months[monthKey]) {
        months[monthKey] = {
          label: formatMonthLabel(transaction.date),
          monthKey,
          transactions: [],
        };
      }
      months[monthKey].transactions.push(transaction);
    });

    // Sort by date descending (most recent first)
    return Object.values(months).sort((a, b) => {
      const dateA = new Date(a.transactions[0].date);
      const dateB = new Date(b.transactions[0].date);
      return dateB.getTime() - dateA.getTime();
    });
  }, [transactions]);

  // Check if a month is expanded (first month is expanded by default)
  const isMonthExpanded = (monthKey: string, index: number): boolean => {
    if (monthKey in toggledMonths) {
      return toggledMonths[monthKey];
    }
    // First month is expanded by default
    return index === 0;
  };

  const toggleMonth = (monthKey: string, index: number) => {
    setToggledMonths((prev) => ({
      ...prev,
      [monthKey]: !isMonthExpanded(monthKey, index),
    }));
  };

  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Recent Unit Transactions
          </h2>
        </div>
        <div className="px-6 py-8">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            No recent transactions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Recent Unit Transactions
        </h2>
      </div>
      <div className="px-6 py-2">
        <div className="max-h-[400px] overflow-y-auto">
          {groupedTransactions.map((month, monthIndex) => {
            const isExpanded = isMonthExpanded(month.monthKey, monthIndex);

            return (
              <div key={month.monthKey} className="mb-4">
                {/* Month header - clickable to expand/collapse */}
                <button
                  onClick={() => toggleMonth(month.monthKey, monthIndex)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 hover:text-gray-700 dark:hover:text-gray-300 transition-colors w-full text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span>{month.label}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                    ({month.transactions.length} transactions)
                  </span>
                </button>

                {/* Transaction list */}
                {isExpanded && (
                  <div className="space-y-0">
                    {month.transactions.map((transaction, index) => {
                      const typeStyle =
                        TYPE_STYLES[transaction.type] || TYPE_STYLES.usage;
                      const isPositive = transaction.units > 0;
                      const isNegative = transaction.units < 0;

                      return (
                        <div
                          key={transaction.id}
                          className={cn(
                            "py-3",
                            index > 0 &&
                              "border-t border-gray-200 dark:border-gray-800"
                          )}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Speciality name */}
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {transaction.speciality?.name ||
                                    "Unknown Service"}
                                </span>

                                {/* Type badge */}
                                <span
                                  className={cn(
                                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                    typeStyle.bg,
                                    typeStyle.text
                                  )}
                                >
                                  {typeStyle.label}
                                </span>

                                {/* Admin review warning */}
                                {transaction.requires_admin_review && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300">
                                    <AlertCircle className="h-3 w-3" />
                                    Review Required
                                  </span>
                                )}
                              </div>

                              {/* Date and team member */}
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                <span>{formatDate(transaction.date)}</span>
                                {transaction.team?.user?.name && (
                                  <span className="ml-2">
                                    by {transaction.team.user.name}
                                  </span>
                                )}
                              </p>
                            </div>

                            {/* Units display */}
                            <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                              {isPositive && (
                                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                              )}
                              {isNegative && (
                                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                              )}
                              <span
                                className={cn(
                                  "text-sm font-semibold",
                                  isPositive &&
                                    "text-green-600 dark:text-green-400",
                                  isNegative &&
                                    "text-red-600 dark:text-red-400",
                                  !isPositive &&
                                    !isNegative &&
                                    "text-gray-600 dark:text-gray-400"
                                )}
                              >
                                {isPositive && "+"}
                                {transaction.units}
                                <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">
                                  units
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Notes and link to appointment */}
                          {(transaction.notes || transaction.reference_id) && (
                            <div className="flex justify-between items-center mt-2">
                              {transaction.notes && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 flex-1 truncate pr-2">
                                  {transaction.notes}
                                </p>
                              )}
                              {transaction.reference_id &&
                                transaction.reference_type ===
                                  "appointment" && (
                                  <Link
                                    href={`/appointments/${transaction.reference_id}`}
                                    className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 flex-shrink-0"
                                  >
                                    <span>View Appointment</span>
                                    <ArrowUpRight className="h-3 w-3" />
                                  </Link>
                                )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
