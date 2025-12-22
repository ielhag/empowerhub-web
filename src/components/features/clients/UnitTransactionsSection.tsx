"use client";

import type { UnitTransaction } from "@/types";

export function UnitTransactionsSection({
  transactions,
}: {
  transactions: UnitTransaction[];
}) {
  return (
    <div className="bg-white dark:bg-gray-900 shadow sm:rounded-md">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
          Recent Unit Transactions
        </h3>
      </div>
      <div className="border-t border-gray-200 dark:border-gray-800">
        <ul className="divide-y divide-gray-200 dark:divide-gray-800">
          {transactions.map((transaction) => (
            <li key={transaction.id}>
              <a href="#" className="block hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium text-violet-600 dark:text-violet-400">
                      {transaction.description}
                    </p>
                    <div className="ml-2 flex flex-shrink-0">
                      <p
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          transaction.units > 0
                            ? "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300"
                            : "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300"
                        }`}
                      >
                        {transaction.units > 0
                          ? `+${transaction.units}`
                          : transaction.units}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        {transaction.type}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0">
                      <p>{new Date(transaction.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}