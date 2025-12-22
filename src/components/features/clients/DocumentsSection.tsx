"use client";

export function DocumentsSection() {
  return (
    <div className="bg-white dark:bg-gray-900 shadow sm:rounded-md">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
          Documents
        </h3>
      </div>
      <div className="border-t border-gray-200 dark:border-gray-800">
        <div className="p-6">
          <p className="text-gray-500 dark:text-gray-400">
            No documents have been uploaded for this client.
          </p>
        </div>
      </div>
    </div>
  );
}
