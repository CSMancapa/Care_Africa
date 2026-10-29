import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { format, parseISO, addDays, isValid } from 'date-fns';
import { Appointment } from '../../types';
import { appointmentService } from '../../services/appointmentService';
import { toast } from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onReschedule: (appointment: Appointment, newDate: Date) => void;
  theme: 'light' | 'dark';
}

const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onReschedule,
  theme,
}) => {
  const { theme: contextTheme } = useTheme();
  const [selectedDate, setSelectedDate] = useState<Date>(
    appointment?.date ? new Date(appointment.date) : new Date()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Add validation before setting the date
  const handleDateChange = (date: Date | null) => {
    if (date && isValid(date)) {
      setSelectedDate(date);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (appointment && isValid(selectedDate)) {
      try {
        setIsLoading(true);
        console.log('Rescheduling appointment:', { id: appointment._id, date: selectedDate });
        await onReschedule(appointment, selectedDate);
        toast.success('Appointment rescheduled successfully');
        onClose();
      } catch (error) {
        console.error('Failed to reschedule appointment:', error);
        toast.error('Failed to reschedule appointment');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  // Generate available time slots for the next 7 days
  const availableSlots = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(new Date(), i);
    return [
      new Date(date.setHours(9, 0, 0, 0)),
      new Date(date.setHours(10, 30, 0, 0)),
      new Date(date.setHours(14, 0, 0, 0)),
      new Date(date.setHours(15, 30, 0, 0)),
    ];
  }).flat();

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
                    Reschedule Appointment
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className={`rounded-full p-1 hover:bg-opacity-20 transition-colors ${
                      theme === 'dark' 
                        ? 'text-gray-300 hover:bg-gray-700' 
                        : 'text-gray-500 hover:bg-gray-200'
                    }`}
                    disabled={isLoading}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <h3 className={`font-medium ${
                      theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                    }`}>
                      Current Appointment
                    </h3>
                    <p className={`${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {appointment?.patientName} - {appointment?.date && format(appointment.date, 'PPP p')}
                    </p>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    } mb-2`}>
                      Select New Date and Time
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                      {availableSlots.map((slot, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleDateChange(slot)}
                          disabled={isLoading}
                          className={`p-3 text-sm rounded-lg border transition-colors duration-200 ${
                            format(selectedDate, 'yyyy-MM-dd HH:mm') === format(slot, 'yyyy-MM-dd HH:mm')
                              ? theme === 'dark'
                                ? 'border-blue-500 bg-blue-900/20 text-blue-300'
                                : 'border-blue-500 bg-blue-50 text-blue-700'
                              : theme === 'dark'
                                ? 'border-gray-600 hover:border-blue-500 hover:bg-gray-700'
                                : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {format(slot, 'MMM d, h:mm a')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                        isLoading 
                          ? 'bg-blue-400 cursor-not-allowed' 
                          : theme === 'dark'
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {isLoading ? 'Rescheduling...' : 'Confirm Reschedule'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default RescheduleModal;