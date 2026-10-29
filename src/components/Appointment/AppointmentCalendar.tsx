import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Appointment } from '@/types/appointment';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppointmentCalendarProps {
  appointments: Appointment[];
  onDateChange: (date: Date) => void;
  selectedDate: Date;
}

const AppointmentCalendar: React.FC<AppointmentCalendarProps> = ({
  appointments,
  onDateChange,
  selectedDate,
}) => {
  const [currentMonth, setCurrentMonth] = React.useState(selectedDate);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const days = [];

    // Add previous month's days
    for (let i = 0; i < firstDayOfMonth; i++) {
      const prevDate = new Date(year, month, -i);
      days.unshift({ date: prevDate, isCurrentMonth: false });
    }

    // Add current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Add next month's days to complete the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days = 42
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.time);
      return appointmentDate.toDateString() === date.toDateString();
    });
  };

  const formatAppointmentTime = (time: string) => {
    return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="w-full">
      {/* Calendar Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">
          {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {daysOfWeek.map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {getDaysInMonth(currentMonth).map(({ date, isCurrentMonth }, index) => {
          const dayAppointments = getAppointmentsForDate(date);
          const isSelected = date.toDateString() === selectedDate.toDateString();
          const isToday = date.toDateString() === new Date().toDateString();

          return (
            <div
              key={index}
              className={cn(
                "min-h-[100px] p-1 border border-gray-100 transition-colors",
                isCurrentMonth ? "bg-white" : "bg-gray-50",
                isSelected && "ring-2 ring-primary ring-offset-2",
                !isCurrentMonth && "opacity-50"
              )}
              onClick={() => onDateChange(date)}
            >
              <div className="flex justify-between items-start">
                <span
                  className={cn(
                    "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full",
                    isToday && "bg-primary text-white",
                    !isToday && isSelected && "text-primary"
                  )}
                >
                  {date.getDate()}
                </span>
                {dayAppointments.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {dayAppointments.length}
                  </Badge>
                )}
              </div>
              
              {/* Appointments for the day */}
              <div className="mt-1 space-y-1">
                {dayAppointments.slice(0, 3).map((apt, i) => (
                  <div
                    key={apt.id}
                    className={cn(
                      "text-xs p-1 rounded truncate",
                      apt.status === 'scheduled' && "bg-blue-100 text-blue-700",
                      apt.status === 'waiting' && "bg-orange-100 text-orange-700",
                      apt.status === 'in-room' && "bg-orange-100 text-orange-700",
                      apt.status === 'completed' && "bg-green-100 text-green-700"
                    )}
                  >
                    {formatAppointmentTime(apt.time)} - {apt.patient}
                  </div>
                ))}
                {dayAppointments.length > 3 && (
                  <div className="text-xs text-gray-500 pl-1">
                    +{dayAppointments.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AppointmentCalendar; 