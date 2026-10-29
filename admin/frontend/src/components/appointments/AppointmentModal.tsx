import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { format, isValid } from 'date-fns';
import { X } from 'lucide-react';
import { Appointment } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onConfirm: (appointment: Appointment) => void;
  onReschedule: (appointment: Appointment) => void;
  onCancel: (appointment: Appointment) => void;
  onScheduleFollowUp: (appointment: Appointment) => void;
  theme: 'light' | 'dark';
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onConfirm,
  onReschedule,
  onCancel,
  onScheduleFollowUp,
  theme,
}) => {
  const { theme: contextTheme } = useTheme();
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return isValid(dateObj) ? format(dateObj, 'PPpp') : 'Invalid date';
  };

  if (!appointment) return null;

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className={`w-full max-w-md transform overflow-hidden rounded-2xl p-6 shadow-xl transition-all ${
                theme === 'dark' 
                  ? 'bg-gray-800 border border-gray-700' 
                  : 'bg-white'
              } ${isClosing ? 'opacity-75' : 'opacity-100'}`}>
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className={`text-lg font-semibold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Appointment Details
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className={`rounded-full p-1 hover:bg-opacity-20 transition-colors ${
                      theme === 'dark' 
                        ? 'text-gray-300 hover:bg-gray-700' 
                        : 'text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className={`font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Patient
                    </h3>
                    <p className={`${
                      theme === 'dark' ? 'text-gray-100' : 'text-gray-600'
                    }`}>
                      {appointment.patientName}
                    </p>
                  </div>

                  <div>
                    <h3 className={`font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Date & Time
                    </h3>
                    <p className={`${
                      theme === 'dark' ? 'text-gray-100' : 'text-gray-600'
                    }`}>
                      {formatDate(appointment.date)}
                    </p>
                  </div>

                  <div>
                    <h3 className={`font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Type
                    </h3>
                    <p className={`${
                      theme === 'dark' ? 'text-gray-100' : 'text-gray-600'
                    }`}>
                      {appointment.type}
                    </p>
                  </div>

                  {appointment.notes && (
                    <div>
                      <h3 className={`font-medium ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Notes
                      </h3>
                      <p className={`${
                        theme === 'dark' ? 'text-gray-100' : 'text-gray-600'
                      }`}>
                        {appointment.notes}
                      </p>
                    </div>
                  )}

                  <div className="flex space-x-3 pt-4">
                    {appointment.status === 'scheduled' && (
                      <>
                        <button
                          onClick={() => onConfirm(appointment)}
                          className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                            theme === 'dark'
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => onReschedule(appointment)}
                          className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                            theme === 'dark'
                              ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                              : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
                          }`}
                        >
                          Reschedule
                        </button>
                        <button
                          onClick={() => onCancel(appointment)}
                          className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                            theme === 'dark'
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-red-100 hover:bg-red-200 text-red-700'
                          }`}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {appointment.status === 'completed' && (
                      <button
                        onClick={() => onScheduleFollowUp(appointment)}
                        className={`w-full px-4 py-2 rounded-lg transition-colors ${
                          theme === 'dark'
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        Schedule Follow-up
                      </button>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default AppointmentModal;