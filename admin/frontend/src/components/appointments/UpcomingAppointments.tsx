import React from 'react';
import { Clock, Calendar } from 'lucide-react';
import { Appointment } from '../../types';
{/*import { formatAppointmentDate, formatAppointmentTime } from '../../utils/dateUtils';*/}

interface UpcomingAppointmentsProps {
  appointments: Appointment[];
  theme: 'light' | 'dark';
  onReschedule: (appointment: Appointment) => void;
  onCancel: (appointment: Appointment) => void;
  onViewAll: () => void;
}

const UpcomingAppointments: React.FC<UpcomingAppointmentsProps> = ({
  appointments,
  theme,
  onReschedule,
  onCancel,
  onViewAll
}) => {
  const Header = () => (
    <div className={`p-6 border-b transition-colors duration-300 ${
      theme === 'dark' ? 'border-gray-700' : 'border-gray-100'
    }`}>
      <div className="flex justify-between items-center">
        <h2 className={`text-xl font-semibold bg-gradient-to-r ${
          theme === 'dark' 
            ? 'from-blue-400 to-blue-500' 
            : 'from-blue-500 to-blue-600'
        } text-transparent bg-clip-text`}>
          Upcoming Appointments
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
  );

  if (appointments.length === 0) {
    return (
      <div className={`bg-gradient-to-b rounded-2xl shadow-lg border transition-colors duration-300 ${
        theme === 'dark' 
          ? 'from-gray-800 to-gray-900 border-gray-700 shadow-gray-900/20' 
          : 'from-gray-50 to-white border-gray-100 shadow-gray-200/20'
      }`}>
        <Header />
        <div className={`flex flex-col items-center justify-center py-12 transition-colors duration-300 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          <Calendar className={`w-12 h-12 mb-3 ${
            theme === 'dark' ? 'text-gray-700' : 'text-gray-300'
          }`} />
          <p>No upcoming appointments</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-b rounded-2xl shadow-lg border transition-colors duration-300 ${
      theme === 'dark' 
        ? 'from-gray-800 to-gray-900 border-gray-700 shadow-gray-900/20' 
        : 'from-gray-50 to-white border-gray-100 shadow-gray-200/20'
    }`}>
      <Header />
      <div className="divide-y transition-colors duration-300">
        {appointments.map((appointment) => (
          <div 
            key={appointment._id}
            className={`p-6 transition-all duration-200 ${
              theme === 'dark' 
                ? 'hover:bg-gray-700' 
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
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
                  <div className={`flex items-center text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <Clock className={`w-4 h-4 mr-2 ${
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
                    }`} />
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
              <div className="flex space-x-3">
                <button
                  onClick={() => onCancel(appointment)}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-colors duration-200 ${
                    theme === 'dark'
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => onReschedule(appointment)}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-colors duration-200 ${
                    theme === 'dark'
                      ? 'text-blue-400 bg-blue-900/20 hover:bg-blue-900/30'
                      : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                  }`}
                >
                  Reschedule
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export { UpcomingAppointments };
