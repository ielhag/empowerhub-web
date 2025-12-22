"use client";

import {
  useTenantSettings,
  useUpdateBranding,
} from "@/hooks/useSettings";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";

const schema = z.object({
  primary_color: z.string(),
  secondary_color: z.string(),
});

export function BrandingSettings() {
  const { data: settings, isLoading } = useTenantSettings();
  const updateBranding = useUpdateBranding();

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    values: {
      primary_color: settings?.tenant.branding?.primary_color || "#000000",
      secondary_color:
        settings?.tenant.branding?.secondary_color || "#000000",
    },
  });

  const onSubmit = (data: any) => {
    updateBranding.mutate(data);
  };

  if (isLoading) {
    return <Loader2 className="w-8 h-8 animate-spin text-violet-600" />;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Branding
      </h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label
            htmlFor="primary_color"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Primary Color
          </label>
          <input
            type="color"
            id="primary_color"
            {...register("primary_color")}
            className="mt-1"
          />
        </div>
        <div>
          <label
            htmlFor="secondary_color"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Secondary Color
          </label>
          <input
            type="color"
            id="secondary_color"
            {...register("secondary_color")}
            className="mt-1"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-violet-600 border border-transparent rounded-md shadow-sm hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
        >
          {isSubmitting ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}