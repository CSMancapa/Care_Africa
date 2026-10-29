import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { Patient } from '../../types/patient';
import {BASE_URL } from '../../services/api';
import supabase from '../../config/supabase';
import { toast } from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';

interface CreatePatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (patientData: Omit<Patient, 'id' | 'medications' | 'conditions' | 'visits'>) => void;
}

const CreatePatientModal: React.FC<CreatePatientModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: format(new Date(), 'yyyy-MM-dd'),
    gender: 'male' as 'male' | 'female' | 'other',
    contactNumber: '',
    email: '',
    address: '',
    idNumber: '',
  });
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error('Please sign in to create a patient');
        return;
      }

      // Validate ID number format
      if (!/^\d{13}$/.test(formData.idNumber)) {
        throw new Error('ID number must be exactly 13 digits');
      }

      // Extract date components from first 6 digits
      const yearStr = formData.idNumber.substring(0, 2);
      const monthStr = formData.idNumber.substring(2, 4);
      const dayStr = formData.idNumber.substring(4, 6);
      
      // Convert to numbers
      const year = parseInt(yearStr) + (parseInt(yearStr) > 22 ? 1900 : 2000);
      const month = parseInt(monthStr);
      const day = parseInt(dayStr);
      
      // Validate date components
      if (month < 1 || month > 12) {
        throw new Error('Invalid month in ID number (must be 01-12)');
      }
      if (day < 1 || day > 31) {
        throw new Error('Invalid day in ID number (must be 01-31)');
      }
      
      const dateOfBirth = format(new Date(year, month - 1, day), 'yyyy-MM-dd');

      const patientData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        date_of_birth: dateOfBirth,
        gender: formData.gender,
        contact_number: formData.contactNumber,
        email: formData.email,
        address: formData.address,
        id_number: formData.idNumber,
        practitioner_id: session.user.id,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('patients')
        .insert([patientData])
        .select()
        .single();

      if (error) throw error;

      onClose();
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        dateOfBirth: format(new Date(), 'yyyy-MM-dd'),
        gender: 'male' as 'male' | 'female' | 'other',
        contactNumber: '',
        email: '',
        address: '',
        idNumber: '',
      });

      toast.success('Patient created successfully');
    } catch (error) {
      console.error('Error creating patient:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create patient');
    }
  };

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog as="div" className={`fixed inset-0 z-10 overflow-y-auto ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`} onClose={handleClose}>
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
              <Dialog.Panel className={`w-full max-w-2xl transform overflow-hidden rounded-2xl p-6 shadow-xl transition-all max-h-[90vh] flex flex-col ${
                theme === 'dark' 
                  ? 'bg-gray-800 border border-gray-700' 
                  : 'bg-white'
              } ${isClosing ? 'opacity-75' : 'opacity-100'}`}>
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className={`text-lg font-semibold ${
                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    Add New Patient
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

                <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto flex-1">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className={`block text-sm font-medium ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        First Name
                      </label>
                      <input
                        type="text"
                        required
                        className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                        value={formData.firstName}
                        onChange={(e) =>
                          setFormData({ ...formData, firstName: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Last Name
                      </label>
                      <input
                        type="text"
                        required
                        className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                        value={formData.lastName}
                        onChange={(e) =>
                          setFormData({ ...formData, lastName: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Gender
                      </label>
                      <select
                        className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                        value={formData.gender}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            gender: e.target.value as 'male' | 'female' | 'other',
                          })
                        }
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Contact Number
                      </label>
                      <input
                        type="tel"
                        required
                        className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                        value={formData.contactNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, contactNumber: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        ID Number
                      </label>
                      <input
                        type="text"
                        required
                        className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                        value={formData.idNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, idNumber: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Address
                    </label>
                    <input
                      type="text"
                      required
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'border-gray-300 bg-white text-gray-900'
                      }`}
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Blood Type
                    </label>
                    <select
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'border-gray-300 bg-white text-gray-900'
                      }`}
                      value={formData.bloodType || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bloodType: (e.target.value || undefined) as Patient['bloodType'],
                        })
                      }
                    >
                      <option value="">Select blood type</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Allergies
                    </label>
                    <div className="mt-1 flex space-x-2">
                      <input
                        type="text"
                        className={`block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                        value={currentAllergy}
                        onChange={(e) => setCurrentAllergy(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddAllergy();
                          }
                        }}
                        placeholder="Type and press Enter to add"
                      />
                      <button
                        type="button"
                        onClick={handleAddAllergy}
                        className={`px-4 py-2 rounded-md transition-colors ${
                          theme === 'dark'
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        Add
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formData.allergies.map((allergy, index) => (
                        <span
                          key={index}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-sm ${
                            theme === 'dark'
                              ? 'bg-red-800/30 text-red-400'
                              : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {allergy}
                          <button
                            type="button"
                            onClick={() => handleRemoveAllergy(index)}
                            className={`ml-1 ${
                              theme === 'dark' ? 'hover:text-red-300' : 'hover:text-red-800'
                            }`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Chronic Conditions & Medications
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddMedicationModalOpen(true)}
                      className={`mt-2 px-4 py-2 rounded-md transition-colors ${
                        theme === 'dark'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      Add Condition & Medication
                    </button>

                    <div className="mt-2">
                      {formData.chronicConditions.map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-md mt-1">
                          <div>
                            <span className="font-medium">{item.condition}</span>
                            <span className="text-sm text-gray-500"> - {item.medication}</span>
                            <span className="text-sm text-gray-500"> ({item.dosage}, {item.frequency})</span>
                            <span className="text-sm text-gray-500"> Started: {item.startDate}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveChronicCondition(index)}
                            className={`text-red-600 hover:text-red-800 ${
                              theme === 'dark' ? 'hover:text-red-300' : ''
                            }`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    <AddMedicationModal
                      isOpen={isAddMedicationModalOpen}
                      onClose={() => setIsAddMedicationModalOpen(false)}
                      onSave={(medication) => {
                        setFormData({
                          ...formData,
                          chronicConditions: [...formData.chronicConditions, {
                            condition: medication.name,
                            medication: medication.name,
                            dosage: medication.dosage,
                            frequency: medication.frequency,
                            startDate: format(medication.startDate, 'yyyy-MM-dd')
                          }]
                        });
                        setIsAddMedicationModalOpen(false);
                      }}
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
                      Create Patient
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

export default CreatePatientModal;