import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { Medication, Visit } from '../../types/patient';
import { useTheme } from '../../contexts/ThemeContext';

interface MedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (medication: Omit<Medication, 'id'>) => void;
  visit: Visit;
}

const MedicationModal: React.FC<MedicationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  visit,
}) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
    prescribedBy: '',
    notes: '',
  });
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: formData.name,
      dosage: formData.dosage,
      frequency: formData.frequency,
      startDate: new Date(formData.startDate),
      endDate: formData.endDate ? new Date(formData.endDate) : undefined,
      prescribedBy: formData.prescribedBy,
      notes: formData.notes || undefined,
    });
    handleClose();
  };

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
                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    Add New Medication
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className={`rounded-full p-1 transition-colors ${
                      theme === 'dark' 
                        ? 'text-gray-300 hover:bg-gray-700' 
                        : 'text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Medication Name
                    </label>
                    <input
                      type="text"
                      required
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        theme === 'dark' ? 'bg-gray-700 border border-gray-600' : ''
                      }`}
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Dosage
                    </label>
                    <input
                      type="text"
                      required
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        theme === 'dark' ? 'bg-gray-700 border border-gray-600' : ''
                      }`}
                      value={formData.dosage}
                      onChange={(e) =>
                        setFormData({ ...formData, dosage: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Frequency
                    </label>
                    <input
                      type="text"
                      required
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        theme === 'dark' ? 'bg-gray-700 border border-gray-600' : ''
                      }`}
                      value={formData.frequency}
                      onChange={(e) =>
                        setFormData({ ...formData, frequency: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        theme === 'dark' ? 'bg-gray-700 border border-gray-600' : ''
                      }`}
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        theme === 'dark' ? 'bg-gray-700 border border-gray-600' : ''
                      }`}
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Prescribed By
                    </label>
                    <input
                      type="text"
                      required
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        theme === 'dark' ? 'bg-gray-700 border border-gray-600' : ''
                      }`}
                      value={formData.prescribedBy}
                      onChange={(e) =>
                        setFormData({ ...formData, prescribedBy: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Notes (Optional)
                    </label>
                    <textarea
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        theme === 'dark' ? 'bg-gray-700 border border-gray-600' : ''
                      }`}
                      rows={3}
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        theme === 'dark'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      Add Medication
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

export default MedicationModal;