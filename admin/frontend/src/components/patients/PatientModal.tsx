import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Edit2 } from 'lucide-react';
import PatientDetails from './PatientDetails';
import EditPatientForm from './EditPatientForm';
import { Patient } from '../../types/patient';
import { useTheme } from '../../contexts/ThemeContext';

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onUpdatePatient: (updatedPatient: Patient) => void;
}

const PatientModal: React.FC<PatientModalProps> = ({
  isOpen,
  onClose,
  patient,
  onUpdatePatient,
}) => {
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);

  if (!patient) return null;

  const handleSave = (updatedPatient: Patient) => {
    onUpdatePatient(updatedPatient);
    setIsEditing(false);
  };

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
              <Dialog.Panel className={`w-full max-w-4xl transform overflow-hidden rounded-2xl shadow-xl transition-all ${
                theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'
              }`}>
                <div className={`flex items-center justify-between p-6 border-b ${
                  theme === 'dark' ? 'border-gray-700' : 'border-gray-100'
                }`}>
                  <Dialog.Title className={`text-lg font-semibold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {isEditing ? 'Edit Patient' : 'Patient Details'}
                  </Dialog.Title>
                  <div className="flex items-center space-x-4">
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                          theme === 'dark'
                            ? 'text-blue-400 hover:bg-gray-700'
                            : 'text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                    )}
                    <button
                      onClick={onClose}
                      className={`rounded-full p-1 hover:bg-opacity-20 transition-colors ${
                        theme === 'dark'
                          ? 'text-gray-300 hover:bg-gray-700'
                          : 'text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className={`max-h-[80vh] overflow-y-auto p-6 ${
                  theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  {isEditing ? (
                    <EditPatientForm
                      patient={patient}
                      onSave={handleSave}
                      onCancel={() => setIsEditing(false)}
                      theme={theme}
                    />
                  ) : (
                    <PatientDetails patient={patient} theme={theme} />
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default PatientModal;