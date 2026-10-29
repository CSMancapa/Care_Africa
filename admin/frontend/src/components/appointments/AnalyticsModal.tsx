import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  analyticsData: {
    totalBooked: number;
    totalCancelled: number;
    firstTimeAppointments: number;
    followUpAppointments: number;
  };
  theme: 'light' | 'dark';
}

const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  analyticsData,
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

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        {/* Background overlay */}
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

        {/* Modal Content */}
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
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className={`text-lg font-semibold ${
                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    Appointment Analytics
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

                {/* Analytics Data */}
                <div className="space-y-4">
                  {Object.entries(analyticsData).map(([key, value]) => (
                    <div 
                      key={key}
                      className={`flex justify-between items-center py-2 ${
                        theme === 'dark' 
                          ? 'border-b border-gray-700' 
                          : 'border-b border-gray-200'
                      }`}
                    >
                      <span className={`text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        {key.replace(/([A-Z])/g, ' $1')}:
                      </span>
                      <span className={`font-medium ${
                        theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                      }`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Close Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleClose}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-100'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }`}
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default AnalyticsModal;
