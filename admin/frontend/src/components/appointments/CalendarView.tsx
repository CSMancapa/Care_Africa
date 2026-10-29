import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Appointment } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

interface CalendarViewProps {
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  theme: 'light' | 'dark';
}

const CalendarView = ({ theme, ...props }: CalendarViewProps) => {
  const { theme: contextTheme } = useTheme();

  const events = props.appointments.map((appointment) => ({
    id: appointment._id,
    title: `${appointment.patientName} - ${appointment.type}`,
    start: new Date(appointment.date),
    end: new Date(new Date(appointment.date).getTime() + appointment.duration * 60000),
    backgroundColor: contextTheme === 'dark' ? 
      (appointment.status === 'scheduled' ? '#1e3a8a' :
       appointment.status === 'completed' ? '#065f46' :
       appointment.status === 'walk-in' ? '#854d0e' : '#7f1d1d') : 
      (appointment.status === 'scheduled' ? '#3b82f6' :
       appointment.status === 'completed' ? '#10b981' :
       appointment.status === 'walk-in' ? '#f59e0b' : '#ef4444'),
    borderColor: 'transparent',
    textColor: contextTheme === 'dark' ? '#f3f4f6' : 'white',
    extendedProps: { appointment },
  }));

  return (
    <div className={`h-full p-6 transition-colors duration-300 ${
      contextTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <style>
        {`
          /* Calendar Container */
          .fc {
            height: 100%;
            font-family: inherit;
            background: ${contextTheme === 'dark' ? '#111827' : 'white'};
            color: ${contextTheme === 'dark' ? '#f3f4f6' : '#111827'};
          }

          /* Header/Toolbar */
          .fc .fc-toolbar.fc-header-toolbar {
            margin-bottom: 1.5em;
          }

          .fc .fc-toolbar-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: ${contextTheme === 'dark' ? '#f3f4f6' : '#111827'};
          }

          /* Buttons */
          .fc .fc-button {
            padding: 0.5rem 1rem;
            font-weight: 500;
            border-radius: 0.375rem;
            background: ${contextTheme === 'dark' ? '#374151' : '#f3f4f6'};
            border: 1px solid ${contextTheme === 'dark' ? '#4b5563' : '#e5e7eb'};
            color: ${contextTheme === 'dark' ? '#f3f4f6' : '#374151'};
          }

          .fc .fc-button:hover {
            background: ${contextTheme === 'dark' ? '#4b5563' : '#e5e7eb'};
          }

          .fc .fc-button-active {
            background: ${contextTheme === 'dark' ? '#1d4ed8' : '#3b82f6'} !important;
            color: white !important;
          }

          /* Grid */
          .fc .fc-scrollgrid {
            border-radius: 0.5rem;
            border-color: ${contextTheme === 'dark' ? '#374151' : '#e5e7eb'};
          }

          .fc .fc-scrollgrid-section > td {
            border: 1px solid ${contextTheme === 'dark' ? '#374151' : '#e5e7eb'};
          }

          /* Time Slots */
          .fc .fc-timegrid-slot {
            height: 3rem;
            border-bottom: 1px solid ${contextTheme === 'dark' ? '#374151' : '#f3f4f6'};
          }

          .fc .fc-timegrid-slot-label {
            font-size: 0.875rem;
            color: ${contextTheme === 'dark' ? '#f3f4f6' : '#6b7280'};
          }

          /* Events */
          .fc-event {
            padding: 2px 4px;
            border-radius: 4px;
            font-size: 0.875rem;
            border: none;
            margin: 1px 0;
          }

          .fc-event:hover {
            opacity: 0.95;
          }

          /* Today Column */
          .fc .fc-day-today {
            background: ${contextTheme === 'dark' ? '#1e3a8a' : '#f0f9ff'} !important;
          }

          /* Time Column */
          .fc .fc-timegrid-axis {
            background: ${contextTheme === 'dark' ? '#1f2937' : '#f9fafb'};
            border-right: 1px solid ${contextTheme === 'dark' ? '#374151' : '#e5e7eb'};
            color: ${contextTheme === 'dark' ? '#f3f4f6' : '#374151'};
          }

          /* Header Cells */
          .fc .fc-col-header-cell {
            padding: 0.75rem 0.5rem;
            background: ${contextTheme === 'dark' ? '#1f2937' : '#f9fafb'};
            border-bottom: 1px solid ${contextTheme === 'dark' ? '#374151' : '#e5e7eb'};
          }

          .fc .fc-col-header-cell-cushion {
            font-weight: 500;
            color: ${contextTheme === 'dark' ? '#f3f4f6' : '#374151'};
          }

          /* Now Indicator */
          .fc .fc-timegrid-now-indicator-line {
            border-color: ${contextTheme === 'dark' ? '#ef4444' : '#ef4444'};
          }

          .fc .fc-timegrid-now-indicator-arrow {
            border-color: ${contextTheme === 'dark' ? '#ef4444' : '#ef4444'};
            background: ${contextTheme === 'dark' ? '#ef4444' : '#ef4444'};
          }

          /* Improved Event Spacing */
          .fc-timegrid-event {
            border-radius: 6px;
            margin: 0 4px;
            padding: 4px 6px;
            min-height: 25px;
            max-height: 100%;
          }

          .fc-timegrid-event-harness {
            margin: 0 !important;
          }

          /* Improve event content visibility when compressed */
          .fc-timegrid-event .fc-event-main {
            padding: 2px 4px;
            overflow: hidden;
          }

          .fc-timegrid-event .fc-event-time {
            font-size: 0.75rem;
            font-weight: 600;
            margin-bottom: 2px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          .fc-timegrid-event .fc-event-title {
            font-weight: 500;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          /* Handle small events better */
          .fc-timegrid-event.fc-event-short .fc-event-main {
            margin-top: 0;
            min-height: auto;
          }

          .fc-timegrid-event.fc-event-short .fc-event-time {
            margin-bottom: 0;
          }
        `}
      </style>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        events={events}
        eventClick={(info) => {
          props.onAppointmentClick(info.event.extendedProps.appointment);
        }}
        height="100%"
        slotMinTime="08:00:00"
        slotMaxTime="18:00:00"
        allDaySlot={false}
        slotDuration="00:15:00"
        expandRows={true}
        stickyHeaderDates={true}
        dayMaxEvents={true}
        nowIndicator={true}
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          meridiem: false,
          hour12: false
        }}
        slotLabelFormat={{
          hour: '2-digit',
          minute: '2-digit',
          meridiem: false,
          hour12: false
        }}
        businessHours={{
          daysOfWeek: [1, 2, 3, 4, 5],
          startTime: '08:00',
          endTime: '18:00',
          display: 'background',
          color: contextTheme === 'dark' ? '#1f2937' : '#f3f4f6'
        }}
        eventOverlap={false}
        slotEventOverlap={false}
        forceEventDuration={true}
      />
    </div>
  );
};

export default CalendarView;