import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { Appointment } from '../../types';
import { toast } from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';

interface WalkInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (appointment: Omit<Appointment, 'id'>) => void;
  theme: 'light' | 'dark';
}

const WalkInModal: React.FC<WalkInModalProps> = ({ isOpen, onClose, onSubmit, theme }) => {
  const { theme: contextTheme } = useTheme();
  const mockDoctors = [
    { _id: '1', name: 'Dr. Smith' },
    { _id: '2', name: 'Dr. Johnson' },
    { _id: '3', name: 'Dr. Williams' }
  ];

  const [formData, setFormData] = useState({
    patientName: '',
    contactNumber: '',
    email: '',
    notes: '',
    type: 'Walk-in',
    assignedDoctor: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = new Date();
      const appointmentData = {
        ...formData,
        date: now,
        checkInTime: now,
        status: 'walk-in' as const,
        duration: 30,
        patientId: '0',
        uid: '0',
        assignedDoctor: formData.assignedDoctor || mockDoctors[0].name,
        email: formData.email,
        source: 'internal' as const
      };

      await onSubmit(appointmentData);
      toast.success('Walk-in appointment created successfully');
      onClose();
      setFormData({
        patientName: '',
        contactNumber: '',
        email: '',
        notes: '',
        type: 'Walk-in',
        assignedDoctor: '',
      });
    } catch (error) {
      console.error('Error creating walk-in appointment:', error);
      toast.error('Failed to create walk-in appointment');
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose} 
      className={`fixed inset-0 z-10 overflow-y-auto ${theme === 'dark' ? 'dark' : ''}`}
    >
      <div className="flex items-center justify-center min-h-screen">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
        
        <div className={`relative rounded-lg p-8 max-w-md w-full mx-4 transition-colors duration-300 ${
          theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        }`}>
          <Dialog.Title className={`text-xl font-bold mb-4 ${
            theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
          }`}>
            New Walk-In Patient
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Contact Number
              </label>
              <input
                type="tel"
                className={`mt-1 block w-full rounded-md shadow-sm transition-colors duration-300 ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Patient Name
              </label>
              <input
                type="text"
                required
                className={`mt-1 block w-full rounded-md shadow-sm transition-colors duration-300 ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                value={formData.patientName}
                onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
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
                className={`mt-1 block w-full rounded-md shadow-sm transition-colors duration-300 ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Select Doctor
              </label>
              <select
                className={`mt-1 block w-full rounded-md shadow-sm transition-colors duration-300 ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                value={formData.assignedDoctor}
                onChange={(e) => setFormData({ ...formData, assignedDoctor: e.target.value })}
              >
                <option value="">Select Doctor</option>
                {mockDoctors.map(doctor => (
                  <option key={doctor._id} value={doctor.name}>
                    {doctor.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Notes
              </label>
              <textarea
                className={`mt-1 block w-full rounded-md shadow-sm transition-colors duration-300 ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-300 ${
                  theme === 'dark'
                    ? 'text-gray-300 bg-gray-700 hover:bg-gray-600'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors duration-300 ${
                  theme === 'dark'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Add Walk-In
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
};

export default WalkInModal; 