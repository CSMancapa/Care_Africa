import React, { useState, useMemo } from 'react';
import { X, Search, ArrowUpDown } from 'lucide-react';
import { Appointment } from '../../types';
import { format } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';

interface AppointmentListModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointments: Appointment[];
  title: string;
  onReschedule?: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
  onAccept?: (appointment: Appointment) => void;
  theme: 'light' | 'dark';
}

const AppointmentListModal: React.FC<AppointmentListModalProps> = ({
  isOpen,
  onClose,
  appointments,
  title,
  onReschedule,
  onCancel,
  onAccept,
}) => {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'date' | 'patientName'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredAndSortedAppointments = useMemo(() => {
    return appointments
      .filter(app => 
        app.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        if (sortField === 'date') {
          return sortDirection === 'asc' 
            ? new Date(a.date).getTime() - new Date(b.date).getTime()
            : new Date(b.date).getTime() - new Date(a.date).getTime();
        } else {
          return sortDirection === 'asc'
            ? a.patientName.localeCompare(b.patientName)
            : b.patientName.localeCompare(a.patientName);
        }
      });
  }, [appointments, searchTerm, sortField, sortDirection]);

  if (!isOpen) return null;

  const toggleSort = (field: 'date' | 'patientName') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${
      theme === 'dark' ? 'dark' : ''
    }`}>
      <div className={`rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden transition-colors duration-300 ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-white'
      }`}>
        <div className={`p-4 border-b flex justify-between items-center ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-xl font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-full hover:bg-opacity-20 ${
              theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`p-4 border-b ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              placeholder="Search appointments..."
              className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-colors duration-300 ${
                theme === 'dark' 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(80vh-180px)]">
          <table className="min-w-full">
            <thead className={`${
              theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
            }`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  <button
                    onClick={() => toggleSort('patientName')}
                    className="flex items-center space-x-1"
                  >
                    <span>Patient Name</span>
                    <ArrowUpDown className={`w-4 h-4 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                  </button>
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  <button
                    onClick={() => toggleSort('date')}
                    className="flex items-center space-x-1"
                  >
                    <span>Date & Time</span>
                    <ArrowUpDown className={`w-4 h-4 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                  </button>
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Notes
                </th>
                <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${
              theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'
            }`}>
              {filteredAndSortedAppointments.map((appointment) => (
                <tr 
                  key={appointment._id} 
                  className={`${
                    theme === 'dark' 
                      ? 'hover:bg-gray-800 text-gray-100' 
                      : 'hover:bg-gray-50 text-gray-900'
                  } transition-colors duration-200`}
                >
                  <td className="px-6 py-4">{appointment.patientName}</td>
                  <td className="px-6 py-4">
                    {format(new Date(appointment.date), 'MMM dd, yyyy HH:mm')}
                  </td>
                  <td className={`px-6 py-4 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {appointment.notes}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {onAccept && (
                      <button
                        onClick={() => onAccept(appointment)}
                        className={`text-sm px-3 py-1 rounded-full transition-colors duration-200 ${
                          theme === 'dark'
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                      >
                        Accept
                      </button>
                    )}
                    {onReschedule && (
                      <button
                        onClick={() => onReschedule(appointment)}
                        className={`text-sm px-3 py-1 rounded-full transition-colors duration-200 ${
                          theme === 'dark'
                            ? 'text-blue-400 hover:bg-gray-700'
                            : 'text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        Reschedule
                      </button>
                    )}
                    {onCancel && (
                      <button
                        onClick={() => onCancel(appointment)}
                        className={`text-sm px-3 py-1 rounded-full transition-colors duration-200 ${
                          theme === 'dark'
                            ? 'text-red-400 hover:bg-gray-700'
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AppointmentListModal; 