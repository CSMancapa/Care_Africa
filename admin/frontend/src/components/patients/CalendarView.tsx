import React from 'react';
import { Appointment } from '../../types/patient';
import { useTheme } from '../../contexts/ThemeContext';

interface CalendarViewProps {
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ appointments, onAppointmentClick }) => {
  const { theme } = useTheme();

  return (
    <div className={`p-4 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-white'
    }`}>
      {/* Basic calendar implementation - you can enhance this based on your needs */}
      <div className="grid grid-cols-7 gap-2">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            onClick={() => onAppointmentClick(appointment)}
            className={`p-2 rounded cursor-pointer transition-all duration-300 ${
              theme === 'dark'
                ? 'bg-gray-800 hover:bg-gray-700 text-white'
                : 'bg-blue-50 hover:bg-blue-100 text-gray-900'
            }`}
          >
            <div className={`text-sm font-medium ${
              theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
            }`}>
              {appointment.time}
            </div>
            <div className={`text-xs ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            }`}>
              {appointment.patientName}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarView; 