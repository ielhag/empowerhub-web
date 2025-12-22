import { ScheduleBuilder } from "@/components/features/schedule/ScheduleBuilder";

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Schedule Builder
        </h2>
        <ScheduleBuilder />
      </div>
    </div>
  );
}