import { Appointment } from '../../types';
import { Clock, Calendar } from 'lucide-react'; // Add these imports
import { format, parseISO } from 'date-fns'; // Add this import
import React, { useState } from 'react'; // Add useState

interface CompletedAppointmentsProps {
  appointments: Appointment[];
  theme: 'light' | 'dark';
  onViewDetails: (appointment: Appointment) => void;
  onViewCase: (caseId: string) => void;
  onViewAll: () => void; // Add this prop
}

export const CompletedAppointments = ({
  appointments,
  theme,
  onViewDetails,
  onViewCase,
  onViewAll // Add this prop
}: CompletedAppointmentsProps) => {
  const [hoveredAppointment, setHoveredAppointment] = useState<string | null>(null); // Add state

  // Add these formatting functions
  const formatAppointmentDate = (dateString: string | Date) => {
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
      return format(date, 'MMM dd, yyyy');
    } catch (error) {
      console.error('Invalid date:', dateString);
      return 'Invalid date';
    }
  };

  const formatAppointmentTime = (dateString: string | Date) => {
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
      return format(date, 'HH:mm');
    } catch (error) {
      console.error('Invalid time:', dateString);
      return 'Invalid time';
    }
  };

  // Replace the entire return statement with this
  if (appointments.length === 0) {
    return (
      <div className={`bg-gradient-to-b rounded-2xl shadow-lg border transition-colors duration-300 ${
        theme === 'dark' 
          ? 'from-gray-800 to-gray-900 border-gray-700' 
          : 'from-gray-50 to-white border-gray-100'
      }`}>
        {/* Header section */}
        <div className={`p-6 border-b transition-colors duration-300 ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-100'
        }`}>
          <div className="flex justify-between items-center">
            <h2 className={`text-xl font-semibold bg-gradient-to-r ${
              theme === 'dark' 
                ? 'from-blue-400 to-blue-500' 
                : 'from-blue-500 to-blue-600'
            } text-transparent bg-clip-text`}>
              Completed Appointments
            </h2>
            <button
              onClick={onViewAll}
              className={`text-sm transition-colors duration-300 ${
                theme === 'dark' 
                  ? 'text-blue-400 hover:text-blue-300' 
                  : 'text-blue-600 hover:text-blue-800'
              }`}
            >
              View All
            </button>
          </div>
        </div>
        {/* Empty state */}
        <div className={`flex flex-col items-center justify-center py-12 transition-colors duration-300 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          <Calendar className={`w-12 h-12 mb-3 ${
            theme === 'dark' ? 'text-gray-700' : 'text-gray-300'
          }`} />
          <p>No completed appointments</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-b rounded-2xl shadow-lg border transition-colors duration-300 ${
      theme === 'dark' 
        ? 'from-gray-800 to-gray-900 border-gray-700' 
        : 'from-gray-50 to-white border-gray-100'
    }`}>
      {/* Header section */}
      <div className={`p-6 border-b transition-colors duration-300 ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-100'
      }`}>
        <div className="flex justify-between items-center">
          <h2 className={`text-xl font-semibold bg-gradient-to-r ${
            theme === 'dark' 
              ? 'from-blue-400 to-blue-500' 
              : 'from-blue-500 to-blue-600'
          } text-transparent bg-clip-text`}>
            Completed Appointments
          </h2>
          <button
            onClick={onViewAll}
            className={`text-sm transition-colors duration-300 ${
              theme === 'dark' 
                ? 'text-blue-400 hover:text-blue-300' 
                : 'text-blue-600 hover:text-blue-800'
            }`}
          >
            View All
          </button>
        </div>
      </div>
      {/* Appointment list */}
      <div className="divide-y transition-colors duration-300">
        {appointments.map((appointment) => (
          <div 
            key={appointment._id}
            className={`p-6 transition-all duration-200 ${
              theme === 'dark' 
                ? 'hover:bg-gray-700' 
                : 'hover:bg-gray-50'
            }`}
            onMouseEnter={() => setHoveredAppointment(appointment._id)}
            onMouseLeave={() => setHoveredAppointment(null)}
          >
            <div className="flex items-center justify-between">
              {/* Appointment details */}
              <div>
                <h3 className={`text-lg font-medium ${
                  theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  {appointment.patientName}
                </h3>
                <div className="flex items-center space-x-6 mt-2">
                  <div className={`flex items-center text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <Calendar className={`w-4 h-4 mr-2 ${
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
                    }`} />
                    {formatAppointmentDate(appointment.date)}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-2 text-blue-500" />
                    {formatAppointmentTime(appointment.date)}
                  </div>
                </div>
                {appointment.notes && (
                  <p className={`mt-3 text-sm p-3 rounded-lg transition-colors duration-300 ${
                    theme === 'dark' 
                      ? 'text-gray-300 bg-gray-800' 
                      : 'text-gray-500 bg-gray-50'
                  }`}>
                    {appointment.notes}
                  </p>
                )}
              </div>
              {/* Action buttons */}
              <div className={`flex space-x-3 transition-opacity duration-200 ${
                hoveredAppointment === appointment._id ? 'opacity-100' : 'opacity-0'
              }`}>
                <button
                  onClick={() => onViewDetails(appointment)}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-colors duration-200 ${
                    theme === 'dark'
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  View Details
                </button>
                <button
                  onClick={() => onViewCase(appointment.caseId)}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-colors duration-200 ${
                    theme === 'dark'
                      ? 'text-blue-400 bg-blue-900/20 hover:bg-blue-900/30'
                      : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                  }`}
                >
                  View Case
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompletedAppointments;