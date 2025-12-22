"use client";

import { useFormContext } from "react-hook-form";

export function DateTimeLocation() {
  const { register } = useFormContext();

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="date"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Date
        </label>
        <input
          type="date"
          id="date"
          {...register("date")}
          className="mt-1 block w-full pl-3 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="start_time"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Start Time
          </label>
          <input
            type="time"
            id="start_time"
            {...register("start_time")}
            className="mt-1 block w-full pl-3 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="end_time"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            End Time
          </label>
          <input
            type="time"
            id="end_time"
            {...register("end_time")}
            className="mt-1 block w-full pl-3 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="location_type"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Location
        </label>
        <select
          id="location_type"
          {...register("location_type")}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm rounded-md"
        >
          <option value="in_home">In Home</option>
          <option value="facility">Facility</option>
          <option value="community">Community</option>
          <option value="remote">Remote</option>
        </select>
      </div>
    </div>
  );
}
