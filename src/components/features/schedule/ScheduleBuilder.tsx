"use client";

import { useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useSchedule } from "@/hooks/useSchedule";
import { Loader2 } from "lucide-react";

export function ScheduleBuilder() {
  const [filters, setFilters] = useState({});
  const { data, isLoading, error } = useSchedule(filters);

  const events = useMemo(() => {
    return data?.map((appointment) => ({
      id: String(appointment.id),
      title: `${appointment.client.name} w/ ${appointment.team.name}`,
      start: `${appointment.date}T${appointment.start_time}`,
      end: appointment.end_time
        ? `${appointment.date}T${appointment.end_time}`
        : undefined,
      allDay: !appointment.start_time,
      extendedProps: {
        ...appointment,
      },
    }));
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500">
        Error loading schedule: {error.message}
      </div>
    );
  }

  return (
    <div className="h-[800px]">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={events}
        editable
        selectable
        selectMirror
        dayMaxEvents
        droppable
      />
    </div>
  );
}