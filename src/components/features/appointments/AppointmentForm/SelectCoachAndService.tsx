"use client";

import { useFormContext } from "react-hook-form";
import { useTeam } from "@/hooks/useTeam";
import { useSpecialities } from "@/hooks/useSpecialities";
import { Loader2 } from "lucide-react";

export function SelectCoachAndService() {
  const { register } = useFormContext();
  const { data: team, isLoading: isLoadingTeam } = useTeam({});
  const { data: specialities, isLoading: isLoadingSpecialities } =
    useSpecialities();

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="team_id"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Coach
        </label>
        {isLoadingTeam ? (
          <Loader2 className="w-5 h-5 animate-spin mt-2" />
        ) : (
          <select
            id="team_id"
            {...register("team_id")}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm rounded-md"
          >
            {team?.data.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div>
        <label
          htmlFor="speciality_id"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Service
        </label>
        {isLoadingSpecialities ? (
          <Loader2 className="w-5 h-5 animate-spin mt-2" />
        ) : (
          <select
            id="speciality_id"
            {...register("speciality_id")}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm rounded-md"
          >
            {specialities?.map((speciality) => (
              <option key={speciality.id} value={speciality.id}>
                {speciality.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
