import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Appointment } from '../../types';

interface AppointmentsListProps {
  appointments: Appointment[];
  theme: 'light' | 'dark';
  onMoveToWaiting: (appointment: Appointment) => void;
}

const AppointmentsList = ({ appointments, theme, onMoveToWaiting }: AppointmentsListProps) => {
  return (
    <div className={`rounded-lg transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } border`}>
      <h3 className={`text-lg font-semibold mb-4 ${
        theme === 'dark' ? 'text-white' : 'text-gray-900'
      }`}>
        Today's Appointments
      </h3>
      
      <div className="space-y-4">
        {appointments.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No appointments scheduled for today
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {appointments.map((appointment) => (
              <div
                key={appointment._id}
                className={`p-4 rounded-lg transition-colors duration-300 ${
                  theme === 'dark' 
                    ? 'bg-gray-700 hover:bg-gray-600' 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {appointment.patientName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className={`text-sm font-medium ${
                          theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                        } truncate`}>
                          {appointment.patientName}
                        </h3>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock className="w-3.5 h-3.5 mr-1 text-gray-400" />
                            {format(new Date(appointment.date), 'h:mm a')}
                          </div>
                          <span className={`
                            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${appointment.status === 'scheduled' ? 'bg-blue-50 text-blue-700' :
                              appointment.status === 'completed' ? 'bg-green-50 text-green-700' :
                              'bg-red-50 text-red-700'}
                          `}>
                            {appointment.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => onMoveToWaiting(appointment)}
                      className="opacity-0 group-hover:opacity-100 transition-all duration-200
                        px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg
                        hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
                        focus:ring-blue-500"
                    >
                      Move to Waiting Room
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentsList;