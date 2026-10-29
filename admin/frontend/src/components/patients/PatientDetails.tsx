import React from 'react';
import { format } from 'date-fns';
import { Phone, Mail, MapPin, Activity, FileText, Calendar } from 'lucide-react';
import { Patient, Visit } from '../../types/patient';
import { useTheme } from '../../contexts/ThemeContext';

interface PatientDetailsProps {
  patient: Patient;
}

const PatientDetails: React.FC<PatientDetailsProps> = ({ patient }) => {
  const { theme } = useTheme();

  const formatAppointmentDate = (date: Date) => {
    return format(date, 'MMMM d, yyyy');
  };

  return (
    <div className={`rounded-xl shadow-sm transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } border`}>
      <div className={`p-6 border-b ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-100'
      }`}>
        <h2 className={`text-xl font-semibold ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          {patient.firstName} {patient.lastName}
        </h2>
        <div className="mt-4 space-y-2">
          <div className={`flex items-center ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            <FileText className="w-4 h-4 mr-2" />
            ID: {patient.idNumber}
          </div>
          <div className={`flex items-center ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            <Calendar className="w-4 h-4 mr-2" />
            {format(new Date(patient.dateOfBirth), 'MMMM d, yyyy')} ({patient.gender})
          </div>
          <div className={`flex items-center ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            <Phone className="w-4 h-4 mr-2" />
            {patient.contactNumber}
          </div>
          <div className={`flex items-center ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            <Mail className="w-4 h-4 mr-2" />
            {patient.email}
          </div>
          <div className={`flex items-center ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            <MapPin className="w-4 h-4 mr-2" />
            {patient.address}
          </div>
        </div>
      </div>

      <div className={`p-6 border-b ${
        theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white'
      }`}>
        <h3 className={`font-semibold mb-4 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Medical Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Blood Type
            </p>
            <p className={`font-medium ${
              theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
            }`}>
              {patient.bloodType || 'Not specified'}
            </p>
          </div>
          <div>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Allergies
            </p>
            {(!patient.allergies || patient.allergies.length === 0) ? (
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              }`}>
                No known allergies
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 mt-1">
                {patient.allergies.map((allergy, index) => (
                  <span
                    key={index}
                    className={`px-2 py-1 rounded-full text-xs ${
                      theme === 'dark'
                        ? 'bg-red-800 text-red-100'
                        : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {allergy}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`p-6 border-b ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-100'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Current Medications
          </h3>
          <button className={`text-sm ${
            theme === 'dark' 
              ? 'text-blue-400 hover:text-blue-300' 
              : 'text-blue-600 hover:text-blue-700'
          }`}>
            Add Medication
          </button>
        </div>
        {(!patient.medications || patient.medications.filter(med => !med.endDate || med.endDate > new Date()).length === 0) ? (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No current medications</p>
            <p className="text-sm text-gray-400 mt-1">Click 'Add Medication' to prescribe medications</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(patient.medications || []).filter((med) => !med.endDate || med.endDate > new Date()).map((medication) => (
              <div
                key={medication.id}
                className="p-4 border border-gray-100 rounded-lg"
              >
                <div className="flex justify-between">
                  <h4 className="font-medium">{medication.name}</h4>
                  <span className="text-sm text-gray-500">
                    {format(medication.startDate, 'MMM d, yyyy')}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {medication.dosage} • {medication.frequency}
                </p>
                {medication.notes && (
                  <p className="text-sm text-gray-500 mt-2">{medication.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`p-6 ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Recent Visits
          </h3>
          <button className={`text-sm ${
            theme === 'dark' 
              ? 'text-blue-400 hover:text-blue-300' 
              : 'text-blue-600 hover:text-blue-700'
          }`}>
            View All
          </button>
        </div>
        {(!patient.visits || patient.visits.length === 0) ? (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No visit history</p>
            <p className="text-sm text-gray-400 mt-1">Patient hasn't had any visits yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(patient.visits || []).slice(0, 3).map((visit) => (
              <div
                key={visit.id}
                className="p-4 border border-gray-100 rounded-lg"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <Activity className="w-4 h-4 text-blue-600 mr-2" />
                      <h4 className="font-medium">
                        {visit.type.charAt(0).toUpperCase() + visit.type.slice(1)}
                      </h4>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {format(visit.date, 'MMMM d, yyyy')}
                    </p>
                  </div>
                  {visit.documents.length > 0 && (
                    <button className="flex items-center text-sm text-blue-600 hover:text-blue-700">
                      <FileText className="w-4 h-4 mr-1" />
                      Documents ({visit.documents.length})
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2">{visit.chiefComplaint}</p>
                {visit.diagnosis && (
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-medium">Diagnosis:</span> {visit.diagnosis}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Upcoming Appointments</h3>
          <button className="text-sm text-blue-600 hover:text-blue-700">
            Schedule New
          </button>
        </div>
        {(!patient.appointments || 
          patient.appointments.filter(apt => new Date(apt.date) >= new Date()).length === 0) ? (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No upcoming appointments</p>
            <p className="text-sm text-gray-400 mt-1">Click 'Schedule New' to book an appointment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(patient.appointments || [])
              .filter(apt => new Date(apt.date) >= new Date())
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .slice(0, 3)
              .map((appointment) => (
                <div
                  key={appointment.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {appointment.type}
                      </h4>
                      <div className="flex items-center mt-1 space-x-4">
                        <span className="text-sm text-gray-600">
                          {format(new Date(appointment.date), 'MMMM d, yyyy')}
                        </span>
                        <span className="text-sm text-gray-600">
                          {format(new Date(appointment.date), 'h:mm a')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="text-sm text-blue-600 hover:text-blue-700">
                        Reschedule
                      </button>
                      <button className="text-sm text-red-600 hover:text-red-700">
                        Cancel
                      </button>
                    </div>
                  </div>
                  {appointment.notes && (
                    <p className="mt-2 text-sm text-gray-600">
                      {appointment.notes}
                    </p>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDetails;