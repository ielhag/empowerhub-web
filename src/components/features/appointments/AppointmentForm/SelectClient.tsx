"use client";

import { useFormContext } from "react-hook-form";
import { useClientSearch } from "@/hooks/useClients";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export function SelectClient() {
  const { register, setValue } = useFormContext();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: clients, isLoading } = useClientSearch(searchQuery);

  return (
    <div>
      <label
        htmlFor="client_id"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Client
      </label>
      <div className="mt-1">
        <input
          type="text"
          placeholder="Search for a client..."
          className="block w-full pl-3 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 dark:focus:placeholder-gray-500 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      {isLoading && <Loader2 className="w-5 h-5 animate-spin mt-2" />}
      <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
        {clients?.map((client) => (
          <div
            key={client.id}
            onClick={() => {
              setValue("client_id", client.id);
              setSearchQuery("");
            }}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
          >
            {client.name}
          </div>
        ))}
      </div>
      <input type="hidden" {...register("client_id")} />
    </div>
  );
}
