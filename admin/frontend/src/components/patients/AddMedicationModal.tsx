import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { Medication } from '../../types/patient';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { useTheme } from '../../contexts/ThemeContext';

interface AddMedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (medication: Medication) => void;
  chronicConditions?: string[];
}

const AddMedicationModal: React.FC<AddMedicationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  chronicConditions = [],
}) => {
  const { theme } = useTheme();
  const [medication, setMedication] = useState({
    name: '',
    dosage: '',
    frequency: 'Once daily',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    prescribedBy: '',
    notes: '',
    chronicCondition: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ 
      ...medication, 
      id: uuidv4(),
      startDate: new Date(medication.startDate),
      chronicCondition: medication.chronicCondition || undefined,
    });
    setMedication({
      name: '',
      dosage: '',
      frequency: 'Once daily',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      prescribedBy: '',
      notes: '',
      chronicCondition: '',
    });
    onClose();
  };

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <div className="fixed inset-0 bg-black/25" />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Dialog.Panel className={`w-full max-w-md transform overflow-hidden rounded-2xl p-6 shadow-xl transition-all ${
              theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'
            }`}>
              <div className="flex justify-between items-center mb-4">
                <Dialog.Title className={`text-lg font-medium ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Add Medication
                </Dialog.Title>
                <button 
                  onClick={onClose}
                  className={`rounded-full p-1 hover:bg-opacity-20 transition-colors ${
                    theme === 'dark' 
                      ? 'text-gray-300 hover:bg-gray-700' 
                      : 'text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Related Condition
                  </label>
                  <input
                    list="conditions"
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'border-gray-300 text-gray-900'
                    }`}
                    value={medication.chronicCondition}
                    onChange={(e) => setMedication({ ...medication, chronicCondition: e.target.value })}
                    placeholder="Search conditions..."
                  />
                  <datalist id="conditions">
                    <option value="">None</option>
                    {chronicConditions.map((condition) => (
                      <option key={condition} value={condition}>
                        {condition}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'border-gray-300 text-gray-900'
                    }`}
                    value={medication.name}
                    onChange={(e) => setMedication({ ...medication, name: e.target.value })}
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
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'border-gray-300 text-gray-900'
                    }`}
                    value={medication.dosage}
                    onChange={(e) => setMedication({ ...medication, dosage: e.target.value })}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Frequency
                  </label>
                  <select
                    required
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'border-gray-300 text-gray-900'
                    }`}
                    value={medication.frequency}
                    onChange={(e) => setMedication({ ...medication, frequency: e.target.value })}
                  >
                    <option value="Once daily">Once daily</option>
                    <option value="Twice daily">Twice daily</option>
                    <option value="Three times daily">Three times daily</option>
                    <option value="Four times daily">Four times daily</option>
                    <option value="As needed">As needed</option>
                    <option value="Weekly">Weekly</option>
                  </select>
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
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'border-gray-300 text-gray-900'
                    }`}
                    value={medication.startDate}
                    onChange={(e) => setMedication({ ...medication, startDate: e.target.value })}
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
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'border-gray-300 text-gray-900'
                    }`}
                    value={medication.prescribedBy}
                    onChange={(e) => setMedication({ ...medication, prescribedBy: e.target.value })}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Notes
                  </label>
                  <textarea
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'border-gray-300 text-gray-900'
                    }`}
                    rows={3}
                    value={medication.notes}
                    onChange={(e) => setMedication({ ...medication, notes: e.target.value })}
                  />
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors ${
                      theme === 'dark' ? 'hover:bg-blue-700' : 'hover:bg-blue-500'
                    }`}
                  >
                    Add Medication
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default AddMedicationModal; 