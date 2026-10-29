import React, { useState } from 'react';
import { format } from 'date-fns';
import { Patient } from '../../types/patient';
import { BASE_URL } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { X } from 'lucide-react';

interface EditPatientFormProps {
  patient: Patient;
  onSave: (updatedPatient: Patient) => void;
  onCancel: () => void;
}

const EditPatientForm: React.FC<EditPatientFormProps> = ({
  patient,
  onSave,
  onCancel,
}) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: format(new Date(patient.dateOfBirth), 'yyyy-MM-dd'),
    gender: patient.gender,
    contactNumber: patient.contactNumber,
    email: patient.email,
    address: patient.address,
    idNumber: patient.idNumber,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Extract date of birth from ID number
      const year = formData.idNumber.substring(0, 4);
      const month = formData.idNumber.substring(4, 6);
      const day = formData.idNumber.substring(6, 8);
      const dateOfBirth = new Date(`${year}-${month}-${day}`);

      const response = await fetch(`${BASE_URL}/patients/${patient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          dateOfBirth,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update patient' }));
        throw new Error(errorData.message);
      }

      const updatedPatient = await response.json();
      onSave(updatedPatient);
    } catch (error) {
      console.error('Error updating patient:', error);
      alert(error instanceof Error ? error.message : 'Failed to update patient');
    }
  };

  return (
    <div className={`min-h-screen p-6 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <form onSubmit={handleSubmit} className={`space-y-6 p-6 rounded-xl ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      }`}>
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
                  : 'border-gray-300 text-gray-900'
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
                  : 'border-gray-300 text-gray-900'
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
                  : 'border-gray-300 text-gray-900'
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
                  : 'border-gray-300 text-gray-900'
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
                  : 'border-gray-300 text-gray-900'
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
                  : 'border-gray-300 text-gray-900'
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
                : 'border-gray-300 text-gray-900'
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
                : 'border-gray-300 text-gray-900'
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
                  : 'border-gray-300 text-gray-900'
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
              className={`px-4 py-2 rounded-md ${
                theme === 'dark'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              Add
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {formData.allergies.map((allergy, index) => (
              <span
                key={index}
                className={`inline-flex items-center px-2 py-1 rounded-full ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-200 border-gray-300'
                }`}
              >
                {allergy}
                <button
                  type="button"
                  onClick={() => handleRemoveAllergy(index)}
                  className={`ml-1 ${
                    theme === 'dark' ? 'text-red-400 hover:bg-red-600' : 'text-red-600 hover:bg-red-100'
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
            className={`px-4 py-2 text-sm font-medium ${
              theme === 'dark'
                ? 'text-blue-500 hover:bg-blue-600'
                : 'text-blue-600 hover:bg-blue-50'
            } rounded-md`}
          >
            Add Condition & Medication
          </button>
          <div className="mt-2">
            {formData.chronicConditions.map((item, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-md ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                } border`}
              >
                <div>
                  <span className={`font-medium ${
                    theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                  }`}>
                    {item.condition}
                  </span>
                  <span className={`text-sm ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                  }`}> - {item.medication}</span>
                  <span className={`text-sm ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                  }`}> ({item.dosage}, {item.frequency})</span>
                  <span className={`text-sm ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                  }`}> Started: {item.startDate}</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleEditChronicCondition(index)}
                    className={`text-sm ${
                      theme === 'dark' ? 'text-blue-400 hover:bg-blue-600' : 'text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveMedication(index)}
                    className={`p-1 rounded-full ${
                      theme === 'dark' ? 'text-red-400 hover:bg-red-600' : 'text-red-600 hover:bg-red-100'
                    }`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-8">
          <button
            type="button"
            onClick={onCancel}
            className={`px-4 py-2 rounded-md font-medium ${
              theme === 'dark'
                ? 'text-gray-300 hover:bg-gray-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`px-4 py-2 rounded-md font-medium text-white ${
              theme === 'dark'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            Save Changes
          </button>
        </div>
      </form>
      
      <AddMedicationModal
        isOpen={isAddMedicationModalOpen}
        onClose={() => setIsAddMedicationModalOpen(false)}
        onSave={handleAddMedication}
      />
    </div>
  );
};

export default EditPatientForm;