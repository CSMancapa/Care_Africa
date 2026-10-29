import React, { useState, useEffect } from 'react';
import { Users, Calendar, Clock, Activity, PlusCircle, Eye, Gift, Settings, LogOut } from 'lucide-react';
import StatsCard from '../components/dashboard/StatsCard';
import AppointmentsList from '../components/dashboard/AppointmentsList';
import NotificationsList from '../components/dashboard/NotificationsList';
import { Appointment, Notification, PatientTracking, PatientStatus } from '../types';
import { ConsultationFormData } from '../types/formTypes';
import PatientTrackingDashboard from '../components/tracking/PatientTrackingDashboard';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import ConsultationFormModal from '../components/consultation/ConsultationFormModal';
import { mockPreConsultationData } from '../mockData/consultationFormData';
import { useQuery } from '@tanstack/react-query';
import { appointmentService, notificationService } from '../services/api';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import supabase from '../config/supabase';

interface DashboardData {
  appointments: number;
  patients: number;
  consultations: number;
  // Add other dashboard metrics as needed
}

const API_BASE_URL = 'http://localhost:5001'; // or your actual backend URL
import { useTheme } from './../contexts/ThemeContext';
import { toast } from 'react-hot-toast';

const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [trackingData, setTrackingData] = useState<PatientTracking[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [completedAppointments, setCompletedAppointments] = useState<Appointment[]>([]);
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const itemsPerPage = 10;
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const location = useLocation();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch('/api/dashboard', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);
  const { theme } = useTheme();

  const { data: appointments = [], isLoading: isLoadingAppointments, error: appointmentsError } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) return [];
      
      const response = await fetch(`${API_BASE_URL}/api/appointments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to fetch appointments: ${response.status}`);
      }
      return response.json();
    },
    retry: 1
  });

  const { data: completedData = [], isLoading: isLoadingCompletedData } = useQuery({
    queryKey: ['completedAppointments'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) return [];
      
      const response = await fetch(`${API_BASE_URL}/api/appointments/completed`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to fetch completed appointments: ${response.status}`);
      }
      return response.json();
    },
    retry: 1
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }
      
      const response = await fetch(`${API_BASE_URL}/api/patients`, {
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
      return response.json();
    },
    enabled: true
  });

  if (appointmentsError) {
    console.error('Error fetching appointments:', appointmentsError);
  }

  console.log('All appointments:', appointments);
  console.log('Today\'s appointments:', appointments.filter((apt: Appointment) => 
    new Date(apt.date).toDateString() === new Date().toDateString()
  ));

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found');
        return Promise.resolve([]);
      }
      return fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch notifications');
          }
          return response.json();
        });
    }
  });

  // Map tracking status to appointment status
  const statusMap: Record<PatientStatus, 'scheduled' | 'completed'> = {
    'waiting': 'scheduled',
    'ready': 'scheduled',
    'in-room': 'scheduled',
    'complete': 'completed'
  };

  const handleStatusChange = (patientId: string, newStatus: PatientStatus) => {
    setTrackingData((current: PatientTracking[]) => 
      current.map(patient => {
        if (patient.id !== patientId) return patient;
        
        const updates: Partial<PatientTracking> = { 
          status: newStatus,
          startTime: newStatus === 'in-room' ? new Date() : patient.startTime,
          endTime: newStatus === 'complete' ? new Date() : patient.endTime
        };
        
        return { ...patient, ...updates };
      })
    );

    // Optional: Update the appointment status in your backend
    if (localStorage.getItem('token')) {
      fetch('/api/update-appointment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patientId,
          status: statusMap[newStatus]
        })
      })
        .catch(error => console.error('Failed to update appointment status:', error));
    }
  };

  const handleReorderQueue = (reorderedPatients: PatientTracking[]) => {
    setTrackingData(reorderedPatients);
  };

  const handleViewPreConsultForm = (patientId: string) => {
    setSelectedPatientId(patientId);
    setIsModalOpen(true);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedAppointments = completedData
    .filter((appointment: Appointment) =>
      appointment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      new Date(appointment.date).toLocaleDateString().includes(searchTerm)
    )
    .sort((a: Appointment, b: Appointment) => {
      const modifier = sortDirection === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'patientName':
          return modifier * a.patientName.localeCompare(b.patientName);
        case 'date':
          return modifier * (new Date(a.date).getTime() - new Date(b.date).getTime());
        case 'waitTime':
          return modifier * ((a.waitTime || 0) - (b.waitTime || 0));
        case 'duration':
          return modifier * ((a.consultationDuration || 0) - (b.consultationDuration || 0));
        default:
          return 0;
      }
    });

  const paginatedAppointments = filteredAndSortedAppointments
    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalPages = Math.ceil(filteredAndSortedAppointments.length / itemsPerPage);

  const handlePatientClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
  };

  // Helper function to check if a date is today
  const isToday = (dateInput: Date | string) => {
    const appointmentDate = new Date(dateInput);
    const today = new Date();
    return (
      appointmentDate.getDate() === today.getDate() &&
      appointmentDate.getMonth() === today.getMonth() &&
      appointmentDate.getFullYear() === today.getFullYear()
    );
  };

  // Get today's appointments with duplicate removal and excluding cancelled ones
  const todayAppointments = appointments
    .filter((apt: Appointment) => {
      // Check if it's today's appointment
      const isTodays = isToday(apt.date);
      // Check if appointment is not cancelled
      const isNotCancelled = apt.status !== 'cancelled';
      return isTodays && isNotCancelled;
    })
    .reduce((unique: Appointment[], apt: Appointment) => {
      // Check if we already have this appointment (by patientId and date)
      const exists = unique.find(item => 
        item._id === apt._id || 
        (item.patientId === apt.patientId && 
         new Date(item.date).getTime() === new Date(apt.date).getTime())
      );
      if (!exists) {
        unique.push(apt);
      }
      return unique;
    }, []);

  // Sort appointments by time
  todayAppointments.sort((a: Appointment, b: Appointment) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  console.log('Filtered today\'s appointments:', todayAppointments);

  const allPatientIds = new Set([
    ...completedData.map((apt: Appointment) => apt.patientId),
    ...appointments.map((apt: Appointment) => apt.patientId)
  ]);

  console.log('Completed appointments:', completedData);
  console.log('Current appointments:', appointments);
  console.log('All unique patient IDs:', allPatientIds);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>No data available</div>;

  return (
    <div className={`min-h-screen w-full transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <h1 className={`text-2xl font-bold mb-8 transition-colors duration-300 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Dashboard
          </h1>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Patients"
              value={String(patients.length)}
              icon={Users}
              className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100/50'}
            />
            <StatsCard
              title="Today's Appointments"
              value={todayAppointments.length.toString()}
              icon={Calendar}
            />
            <StatsCard
              title="Average Wait Time"
              value="14 min"
              icon={Clock}
              trend={{ value: 5, isPositive: false }}
            />
            <StatsCard
              title="Patient Satisfaction"
              value="94%"
              icon={Activity}
              trend={{ value: 3, isPositive: true }}
            />
          </div>

          <div className="space-y-6">
            <div className={`rounded-lg shadow-sm border p-6 backdrop-blur-sm transition-colors duration-300 ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100/50'
            }`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-lg font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Active Consultations
                </h2>
              </div>
              <div className="w-full overflow-hidden">
                <PatientTrackingDashboard
                  appointments={trackingData.filter(p => p.status === 'in-room')}
                  onStatusChange={handleStatusChange}
                  onReorderQueue={handleReorderQueue}
                  variant="active"
                  theme={theme}
                />
              </div>
            </div>

            <div className={`rounded-lg shadow-sm border p-6 backdrop-blur-sm transition-colors duration-300 ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100/50'
            }`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-lg font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Waiting Room
                </h2>
              </div>
              <div className="w-full overflow-hidden">
                <PatientTrackingDashboard
                  appointments={trackingData.filter(p => p.status === 'waiting')}
                  onStatusChange={handleStatusChange}
                  onReorderQueue={handleReorderQueue}
                  variant="waiting"
                  theme={theme}
                  onViewForm={handleViewPreConsultForm}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            <div className={`rounded-lg p-6 transition-colors duration-300 ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100/50'
            } border`}>
              <AppointmentsList 
                appointments={todayAppointments}
                theme={theme}
                onMoveToWaiting={(appointment: Appointment) => {
                  const appointmentId = appointment._id;
                  if (appointment) {
                    setTrackingData(current => [...current, {
                      id: appointmentId,
                      patientName: appointment.patientName,
                      status: 'waiting',
                      checkInTime: new Date(),
                      startTime: undefined,
                      endTime: undefined,
                      appointmentId: appointment._id,
                      scheduledTime: appointment.date,
                      expectedDuration: appointment.duration
                    } as PatientTracking]);
                  }
                }}
              />
            </div>
            <div className={`rounded-lg p-6 transition-colors duration-300 ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100/50'
            } border`}>
              <NotificationsList notifications={notifications} theme={theme} />
            </div>
          </div>

          <div className={`mt-8 rounded-lg shadow-sm p-6 transition-colors duration-300 ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100/50'
          } border`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-lg font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Completed Appointments
              </h2>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-500">
                  Total: {completedData.length}
                </div>
                <button
                  onClick={() => setIsCompletedModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4" />
                  View All
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className={`transition-colors duration-300 ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Patient Name
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Date
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Wait Time
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Duration
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-gray-200 dark:divide-gray-700 ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                }`}>
                  {completedData.map((appointment: Appointment) => (
                    <tr 
                      key={appointment._id}
                      className={`transition-colors duration-300 hover:${
                        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                      }`}
                    >
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                      }`}>
                        <div className="text-sm font-medium">
                          {appointment.patientName}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                      }`}>
                        <div className="text-sm text-gray-500">
                          {new Date(appointment.date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                      }`}>
                        <div className="text-sm text-gray-500">
                          {appointment.waitTime ? `${appointment.waitTime}m` : '-'}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                      }`}>
                        <div className="text-sm text-gray-500">
                          {appointment.consultationDuration ? `${appointment.consultationDuration}m` : '-'}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                      }`}>
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Completed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {completedData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No completed appointments yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <ConsultationFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          patientId={selectedPatientId}
          formData={mockPreConsultationData as unknown as ConsultationFormData}
        />
      )}

      {isCompletedModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsCompletedModalOpen(false)} />
            <div className="relative bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">All Completed Appointments</h3>
                  <button onClick={() => setIsCompletedModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              
                {/* Search Bar */}
                <div className="mt-4 relative">
                  <input
                    type="text"
                    placeholder="Search appointments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md pl-10"
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div className="px-6 py-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        { key: 'patientName', label: 'Patient Name' },
                        { key: 'date', label: 'Date' },
                        { key: 'waitTime', label: 'Wait Time' },
                        { key: 'duration', label: 'Duration' },
                        { key: 'status', label: 'Status' }
                      ].map(column => (
                        <th
                          key={column.key}
                          onClick={() => column.key !== 'status' && handleSort(column.key)}
                          className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.key !== 'status' ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            {column.label}
                            {sortField === column.key && (
                              sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedAppointments.map((appointment: Appointment) => (
                      <tr 
                        key={appointment._id} 
                        className="hover:bg-gray-50 cursor-pointer" 
                        onClick={() => handlePatientClick(appointment)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {appointment.patientName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(appointment.date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {appointment.waitTime ? `${appointment.waitTime}m` : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {appointment.consultationDuration ? `${appointment.consultationDuration}m` : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Completed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedAppointments.length)} of {filteredAndSortedAppointments.length} results
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border rounded-md disabled:opacity-50"
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 border rounded-md ${currentPage === page ? 'bg-blue-500 text-white' : ''}`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border rounded-md disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedAppointment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedAppointment(null)} />
            <div className="relative bg-white rounded-lg p-6 max-w-lg w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Patient Details</h3>
                <button onClick={() => setSelectedAppointment(null)} className="text-gray-400 hover:text-gray-500">
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <p><span className="font-medium">Patient:</span> {selectedAppointment.patientName}</p>
                <p><span className="font-medium">Date:</span> {new Date(selectedAppointment.date).toLocaleDateString()}</p>
                <p><span className="font-medium">Wait Time:</span> {selectedAppointment.waitTime}m</p>
                <p><span className="font-medium">Duration:</span> {selectedAppointment.consultationDuration}m</p>
                <button
                  onClick={() => navigate(`/appointments/new?patientId=${selectedAppointment._id}`)}
                  className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Schedule Follow-up
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DashboardCard = ({ title, value }: { title: string; value: number }) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
    <p className="text-3xl font-bold mt-2">{value}</p>
  </div>
);

export default Dashboard;