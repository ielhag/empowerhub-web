"use client";

import { useFormContext } from "react-hook-form";

export function ReviewAndCreate() {
  const { getValues } = useFormContext();

  const values = getValues();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Review Appointment
        </h3>
      </div>
      <div className="space-y-2">
        <p>
          <span className="font-medium">Client:</span> {values.client_id}
        </p>
        <p>
          <span className="font-medium">Coach:</span> {values.team_id}
        </p>
        <p>
          <span className="font-medium">Service:</span> {values.speciality_id}
        </p>
        <p>
          <span className="font-medium">Date:</span> {values.date}
        </p>
        <p>
          <span className="font-medium">Time:</span> {values.start_time} -{" "}
          {values.end_time}
        </p>
        <p>
          <span className="font-medium">Location:</span> {values.location_type}
        </p>
      </div>
    </div>
  );
}
