import React, { useState, useEffect, useCallback } from 'react';
import type { Patient, Medication, MedicalCondition, Visit } from '../types/patient';
import PatientsList from '../components/patients/PatientLists';
import PatientModal from '../components/patients/PatientModal';
import MedicationModal from '../components/patients/MedicationModal';
import DocumentsModal from '../components/patients/DocumentsModal';
import CreatePatientModal from '../components/patients/CreatePatientModal';
import { BASE_URL } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Users, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';
import supabase from '../config/supabase';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

type SortField = 'name' | 'lastVisit';
type SortOrder = 'asc' | 'desc';

// Add these interfaces
interface VisitTrend {
  month: string;
  count: number;
}

interface PatientStatistics {
  visitTrends: VisitTrend[];
  conditionStats: { condition: string; count: number; }[];
  medicationAdherence: any[]; // Define proper type if needed
}

// Add this before the Patients component definition
const LoadingTableSkeleton = ({ theme }: { theme: 'light' | 'dark' }) => (
  <div className={`rounded-lg shadow-sm p-4 space-y-4 ${
    theme === 'dark' ? 'bg-gray-800' : 'bg-white'
  }`}>
    {[1, 2, 3, 4, 5].map((index) => (
      <div key={index} className="animate-pulse flex space-x-4">
        <div className="flex-1 space-y-3">
          <div className={`h-4 rounded w-3/4 ${
            theme === 'dark' ? 'bg-gray-700' : 'bg-slate-200'
          }`}></div>
          <div className={`h-4 rounded w-1/2 ${
            theme === 'dark' ? 'bg-gray-700' : 'bg-slate-200'
          }`}></div>
        </div>
        <div className={`rounded-full h-10 w-10 ${
          theme === 'dark' ? 'bg-gray-700' : 'bg-slate-200'
        }`}></div>
      </div>
    ))}
  </div>
);

const Patients = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMedicationModalOpen, setIsMedicationModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [patientStats, setPatientStats] = useState<PatientStatistics>({
    visitTrends: [],
    conditionStats: [],
    medicationAdherence: []
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [tableData, setTableData] = useState<Patient[]>([]);
  const totalPages = Math.ceil(patients.length / itemsPerPage);
  const { theme } = useTheme();

  const getDateFromString = (dateString: string) => {
    return new Date(dateString);
  };

  const sortAndPaginateData = useCallback(() => {
    const sorted = [...patients].sort((a, b) => {
      switch (sortField) {
        case 'name':
          const nameA = `${a.lastName} ${a.firstName}`;
          const nameB = `${b.lastName} ${b.firstName}`;
          return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        case 'lastVisit':
          const visitA = a.visits[a.visits.length - 1]?.date || new Date(0);
          const visitB = b.visits[b.visits.length - 1]?.date || new Date(0);
          return sortOrder === 'asc' ? visitA.getTime() - visitB.getTime() : visitB.getTime() - visitA.getTime();
        default:
          return 0;
      }
    });

    const paginated = sorted.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );

    setTableData(paginated);
  }, [patients, sortField, sortOrder, currentPage, itemsPerPage]);

  useEffect(() => {
    sortAndPaginateData();
  }, [sortAndPaginateData]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const response = await fetch(`${BASE_URL}/api/patients`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            throw new Error(`Failed to fetch patients: ${response.status}`);
          }

          const data = await response.json();
          setPatients(data);
        }
      } catch (error) {
        console.error('Error fetching patients:', error);
      }
    };
    
    checkSession();
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsPatientModalOpen(true);
    fetchPatientStats(patient.id);
  };

  const handleUpdatePatient = async (updatedPatient: Patient) => {
    try {
      const response = await fetch(`${BASE_URL}/patients/${updatedPatient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updatedPatient)
      });

      if (!response.ok) {
        throw new Error('Failed to update patient');
      }

      await fetchPatients();
      setSelectedPatient(updatedPatient);
    } catch (err) {
      console.error('Error updating patient:', err);
      alert(err instanceof Error ? err.message : 'Failed to update patient');
    }
  };

  const handleCreatePatient = async (patientData: Omit<Patient, 'id' | 'medications' | 'conditions' | 'visits'>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No authenticated user found');
      }

      const response = await fetch(`${BASE_URL}/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          ...patientData,
          practitionerId: session.user.id
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const newPatient = await response.json();
      setPatients([...patients, newPatient]);
      await fetchPatients();
    } catch (err) {
      console.error('Error creating patient:', err);
      throw err;
    }
  };

  const handleAddMedication = (medicationData: Omit<Medication, 'id'>) => {
    if (!selectedPatient) return;

    const newMedication: Medication = {
      ...medicationData,
      id: Math.random().toString(36).substr(2, 9),
    };

    const updatedPatient = {
      ...selectedPatient,
      medications: [...selectedPatient.medications, newMedication],
    };

    setPatients(patients.map(p => 
      p.id === selectedPatient.id ? updatedPatient : p
    ));
    setSelectedPatient(updatedPatient);
  };

  const handleViewDocuments = (visit: Visit) => {
    setSelectedVisit(visit);
    setIsDocumentsModalOpen(true);
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const fetchPatients = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${BASE_URL}/patients`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch patients: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Patients data received:', data.length);
      
      setPatients(data);
      console.log('Patients state updated');
    } catch (error) {
      console.error('Error fetching patients:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientStats = async (patientId: string) => {
    try {
      const response = await fetch(`${BASE_URL}/patients/${patientId}/statistics`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch patient statistics');
      const stats = await response.json();
      setPatientStats(stats);
    } catch (error) {
      console.error('Error fetching patient statistics:', error);
    }
  };

  const handleDeletePatient = async (patientId: string) => {
    // Create a promise-based delete operation
    const deletePatient = () => {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await fetch(`${BASE_URL}/patients/${patientId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Failed to delete patient: ${errorData.message}`);
                }

                setPatients(prevPatients => prevPatients.filter(p => p._id !== patientId));
                setIsPatientModalOpen(false);
                setSelectedPatient(null);
                resolve('Patient deleted successfully');
            } catch (error) {
                console.error('Error deleting patient:', error);
                reject(error);
            }
        });
    };

    // Show confirmation toast
    toast((t) => (
        <div className="flex items-center gap-3">
            <p className="text-sm">Are you sure you want to delete this patient?</p>
            <div className="flex gap-2">
                <button
                    onClick={() => {
                        toast.dismiss(t.id);
                        toast.promise(
                            deletePatient(),
                            {
                                loading: 'Deleting...',
                                success: 'Patient deleted successfully',
                                error: (err) => err.message || 'Failed to delete patient'
                            },
                            {
                                position: 'top-center',
                                duration: 3000,
                                style: {
                                    minWidth: '250px',
                                }
                            }
                        );
                    }}
                    className="px-3 py-1 text-sm text-white bg-red-500 rounded-md hover:bg-red-600"
                >
                    Delete
                </button>
                <button
                    onClick={() => toast.dismiss(t.id)}
                    className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                    Cancel
                </button>
            </div>
        </div>
    ), {
        position: 'top-center',
        duration: Infinity,
        style: {
            minWidth: '300px',
        }
    });
  };

  return (
    <div className={`patients ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      <Toaster />
      <div className="max-w-7xl mx-auto">
        {/* Fixed search container */}
        <div className={`sticky top-0 z-10 pt-8 pb-4 transition-colors duration-300 ${
          theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
          <div className={`rounded-lg shadow p-6 transition-colors duration-300 ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } border`}>
            <div className="flex justify-between items-center mb-6">
              <h1 className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Patient Management
              </h1>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  theme === 'dark'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Plus size={18} />
                New Patient
              </button>
            </div>
            
            {/* Search and filter section */}
            <div className={`mb-6 p-4 rounded-lg ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search patients..."
                    className={`w-full p-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  />
                  <svg
                    className={`absolute left-3 top-2.5 h-5 w-5 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6"
                    />
                  </svg>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSort('name')}
                    className={`px-4 py-2 rounded-md border transition-colors ${
                      sortField === 'name' 
                        ? theme === 'dark'
                          ? 'bg-blue-800 border-blue-700 text-white' 
                          : 'bg-blue-50 border-blue-200 text-blue-700'
                        : theme === 'dark'
                          ? 'bg-gray-600 border-gray-500 text-white hover:bg-gray-500'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </button>
                  <button
                    onClick={() => handleSort('lastVisit')}
                    className={`px-4 py-2 rounded-md border transition-colors ${
                      sortField === 'lastVisit' 
                        ? theme === 'dark'
                          ? 'bg-blue-800 border-blue-700 text-white' 
                          : 'bg-blue-50 border-blue-200 text-blue-700'
                        : theme === 'dark'
                          ? 'bg-gray-600 border-gray-500 text-white hover:bg-gray-500'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Last Visit {sortField === 'lastVisit' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add margin-top to the table container */}
        <div className="mt-20"> {/* Adjust this value based on your header height */}
          {/* Existing table content */}
          {loading ? (
            <LoadingTableSkeleton theme={theme} />
          ) : (
            <div className={`rounded-lg shadow-sm border overflow-hidden ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className={`${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <tr>
                      {/* Update table header text colors */}
                      <th scope="col" className={`px-6 py-3 text-left text-sm font-medium ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        Patient Information
                      </th>
                      {/* ... rest of the table headers ... */}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${
                    theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'
                  }`}>
                    {tableData.map((patient) => (
                      <tr 
                        key={patient._id}
                        className={`transition-colors duration-300 ${
                          theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        {/* Update table cell text colors */}
                        <td className={`px-6 py-4 ${
                          theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                        }`}>
                          <div className="flex items-center space-x-4">
                            <div className={`flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center font-medium text-sm ${
                              theme === 'dark' 
                                ? 'bg-blue-900 text-blue-300' 
                                : 'bg-blue-100 text-blue-600'
                            }`}>
                              {patient.firstName[0]}{patient.lastName[0]}
                            </div>
                            {/* ... rest of the table cells ... */}
                          </div>
                        </td>
                        {/* Update status badges */}
                        <td className={`px-6 py-4 ${
                          theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              theme === 'dark'
                                ? 'bg-green-800 text-green-100'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              Active
                            </span>
                            {/* ... rest of the status badges ... */}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Update pagination styles */}
              <div className={`px-4 py-3 flex items-center justify-between border-t ${
                theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
              }`}>
                {/* ... pagination content with dark mode styles ... */}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Patients;