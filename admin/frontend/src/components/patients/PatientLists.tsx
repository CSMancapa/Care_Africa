import React from 'react';
import { format } from 'date-fns';
import { Search, Plus } from 'lucide-react';
import { Patient } from '../../types/patient';
import { useTheme } from '../../contexts/ThemeContext';

const formatDate = (dateString: string | Date) => {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return format(date, 'MMM d, yyyy');
  } catch (error) {
    return 'Invalid date';
  }
};

interface PatientsListProps {
  patients: Patient[];
  onPatientSelect: (patient: Patient) => void;
  onAddPatient: () => void;
}

const PatientsList: React.FC<PatientsListProps> = ({
  patients,
  onPatientSelect,
  onAddPatient,
}) => {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredPatients = patients.filter(
    (patient) =>
      patient.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`rounded-xl shadow-sm transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-800' : 'bg-white'
    }`}>
      <div className={`p-6 border-b transition-colors duration-300 ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-100'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Patients
          </h2>
          <button
            onClick={onAddPatient}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-300 ${
              theme === 'dark'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Add Patient</span>
          </button>
        </div>
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          } w-5 h-5`} />
          <input
            type="text"
            placeholder="Search patients..."
            className={`w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 transition-colors duration-300 ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500'
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:ring-blue-500'
            } border`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {filteredPatients.map((patient) => (
          <div
            key={patient._id}
            className={`hover:bg-opacity-50 transition-colors duration-300 ${
              theme === 'dark' ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <button
              onClick={() => onPatientSelect(patient)}
              className={`w-full px-6 py-4 flex items-center justify-between transition-colors duration-300 ${
                theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
              }`}
            >
              <div>
                <h3 className="font-medium">
                  {patient.firstName} {patient.lastName}
                </h3>
                <div className={`text-sm mt-1 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  <p>{formatDate(patient.dateOfBirth)} • {patient.gender}</p>
                  <p className="mt-1">{patient.email}</p>
                  {patient.primaryDoctorId && (
                    <p className={`mt-1 ${
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      Dr. {patient.primaryDoctorId.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-sm">
                {patient.conditions?.some((c) => c.status === 'active') && (
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    theme === 'dark'
                      ? 'bg-red-800/30 text-red-400'
                      : 'bg-red-50 text-red-600'
                  }`}>
                    Active Conditions
                  </span>
                )}
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredPatients.length === 0 && (
        <div className={`text-center py-8 transition-colors duration-300 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          No patients found {searchTerm && 'matching your search'}
        </div>
      )}
    </div>
  );
};

export default PatientsList;