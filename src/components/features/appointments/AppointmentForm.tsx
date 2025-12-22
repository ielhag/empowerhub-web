"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SelectClient } from "./AppointmentForm/SelectClient";
import { SelectCoachAndService } from "./AppointmentForm/SelectCoachAndService";
import { DateTimeLocation } from "./AppointmentForm/DateTimeLocation";
import { ReviewAndCreate } from "./AppointmentForm/ReviewAndCreate";

const schema = z.object({
  client_id: z.number(),
  team_id: z.number(),
  speciality_id: z.number(),
  date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  location_type: z.string(),
});

const steps = [
  {
    id: 1,
    name: "Select Client",
    component: SelectClient,
  },
  {
    id: 2,
    name: "Select Coach & Service",
    component: SelectCoachAndService,
  },
  {
    id: 3,
    name: "Date, Time, Location",
    component: DateTimeLocation,
  },
  {
    id: 4,
    name: "Review & Create",
    component: ReviewAndCreate,
  },
];

export function AppointmentForm() {
  const [currentStep, setCurrentStep] = useState(0);

  const methods = useForm({
    resolver: zodResolver(schema),
  });

  const { handleSubmit } = methods;

  const onSubmit = (data: any) => {
    console.log(data);
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CurrentStepComponent />
        <div className="mt-6 flex justify-between">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
            >
              Back
            </button>
          )}
          {currentStep < steps.length - 1 && (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep + 1)}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 border border-transparent rounded-md shadow-sm hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
            >
              Next
            </button>
          )}
          {currentStep === steps.length - 1 && (
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 border border-transparent rounded-md shadow-sm hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
            >
              Create Appointment
            </button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
