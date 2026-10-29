import React, { useState, useEffect } from 'react';
import { Calendar, Plus, UserPlus, Clock, Users, Activity, User, Cable, Ban, BanIcon } from 'lucide-react';
import CalendarView from '../components/appointments/CalendarView';
import AppointmentModal from '../components/appointments/AppointmentModal';
import CreateAppointmentModal from '../components/appointments/CreateAppointmentModal';
import RescheduleModal from '../components/appointments/RescheduleModal';
import RequestedAppointments from '../components/appointments/RequestedAppointments';
import WalkInModal from '../components/appointments/WalkInModal.tsx';
import AnalyticsModal from '../components/appointments/AnalyticsModal.tsx';
import { Appointment } from '../types';
import { appointmentService, caseService } from '../services/api';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import AppointmentListModal from '../components/appointments/AppointmentListModal';
import { useNavigate } from 'react-router-dom';
import StatsCard from '../components/dashboard/StatsCard';
import { getAuth } from 'firebase/auth';
import { useTheme } from '../contexts/ThemeContext';
import { UpcomingAppointments } from '../components/appointments/UpcomingAppointments';
import CompletedAppointments from '../components/appointments/CompletedAppointments';
import { Dropdown } from 'antd';
import supabase from '../config/supabase';


type CaseStatus = 'open' | 'in-progress' | 'closed';

interface LocalCase {
  _id?: string;
  patientId: string;
  patientName: string;
  initialAppointmentId: string;
  status: CaseStatus;
  referrals: string[];
  notes: string[];
  createdAt: Date;
  updatedAt: Date;
}

const Appointments = () => {
  const { theme } = useTheme();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpcomingListModalOpen, setIsUpcomingListModalOpen] = useState(false);
  const [isRequestedListModalOpen, setIsRequestedListModalOpen] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [cancelledCount, setCancelledCount] = useState(0);
  const [firstTimeAppointmentsCount, setFirstTimeAppointmentsCount] = useState<number>(0);
  const [followUpAppointmentsCount, setFollowUpAppointmentsCount] = useState<number>(0);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*');

    if (error) {
      setError(error);
      console.error('Error fetching appointments:', error);
      return;
    }
    setAppointments(data);
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  const handleConfirmAppointment = async (appointment: Appointment) => {
    try {
      setIsLoading(true);
      if (!appointment._id) return;
      
      // Update appointment status
      await appointmentService.updateAppointment(appointment._id, {
        status: 'completed' as const,
      });
      // Increment completed count
      setCompletedCount(completedCount+1);
      // Create a new case
      const newCase: Omit<LocalCase, '_id'> = {
        patientId: appointment.patientId,
        patientName: appointment.patientName,
        initialAppointmentId: appointment._id,
        status: 'open',
        referrals: [],
        notes: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const createdCase = await caseService.createCase(newCase);
      
      // Update local state
      setAppointments(appointments.map(app => 
        app._id === appointment._id ? { ...app, status: 'completed' as const } : app
      ));

      setIsModalOpen(false);
      toast.success('Appointment completed and case created');

      // Optionally navigate to the new case
      // navigate(`/dashboard/cases/${createdCase._id}`);
      
    } catch (error) {
      toast.error('Failed to complete appointment or create case');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRescheduleAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(false);
    setIsRescheduleModalOpen(true);
  };

  const handleRescheduleConfirm = async (appointment: Appointment, newDate: Date) => {
    console.log('Starting reschedule:', { appointment, newDate });
    try {
      setIsLoading(true);
      if (!appointment._id) {
        console.error('No appointment ID');
        return;
      }
      
      // Update appointment in the database
      await appointmentService.updateAppointment(appointment._id, { 
        date: newDate
      });
      
      // Update local state
      setAppointments(prevAppointments =>
        prevAppointments.map(app =>
          app._id === appointment._id 
            ? { ...app, date: newDate }
            : app
        )
      );
      
      setIsRescheduleModalOpen(false);
      toast.success('Appointment rescheduled');
    } catch (error) {
      console.error('Failed to reschedule appointment:', error);
      toast.error('Failed to reschedule appointment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAppointment = async (appointment: Appointment) => {
    try {
      if (!appointment._id) return;
      setIsLoading(true);
      await appointmentService.updateAppointment(appointment._id, {
        status: 'cancelled' as const,
      });
      setCancelledCount(cancelledCount+1);
      setAppointments(appointments.map(app => 
        app._id === appointment._id ? { ...app, status: 'cancelled' as const } : app
      ));
      setIsModalOpen(false);
      toast.success('Appointment cancelled');
    } catch (error) {
      toast.error('Failed to cancel appointment');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAppointment = async (newAppointment: Appointment) => {
    try {
      setIsLoading(true);
      
      // Check if appointment already exists
      const existingAppointment = appointments.find(apt => 
        apt.patientName === newAppointment.patientName &&
        apt.date.getTime() === new Date(newAppointment.date).getTime()
      );

      if (existingAppointment) {
        toast.error('An appointment already exists for this patient at this time');
        return;
      }

      const createdAppointment = await appointmentService.createAppointment(newAppointment);
      
      // Only add to state if it's a new appointment
      const appointmentWithDate = {
        ...createdAppointment,
        date: new Date(createdAppointment.date)
      };
      
      // Update state using functional update to ensure we have latest state
      setAppointments(prevAppointments => {
        // Check again to prevent race conditions
        const isDuplicate = prevAppointments.some(apt => 
          apt._id === appointmentWithDate._id ||
          (apt.patientName === appointmentWithDate.patientName &&
           new Date(apt.date).getTime() === new Date(appointmentWithDate.date).getTime())
        );
        
        if (isDuplicate) {
          return prevAppointments;
        }
        return [...prevAppointments, appointmentWithDate];
      });
      
      setIsCreateModalOpen(false);
      toast.success('Appointment created successfully');
    } catch (error) {
      toast.error('Failed to create appointment');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRequest = (appointment: Appointment) => {
    setAppointments(appointments.map(app =>
      app._id === appointment._id ? { ...app, status: 'completed' as const } : app
    ));
  };

  const handleDeclineRequest = (appointment: Appointment) => {
    setAppointments(appointments.map(app =>
      app._id === appointment._id ? { ...app, status: 'cancelled' as const } : app
    ));
  };

  const handleWalkInAppointment = async (newAppointment: Omit<Appointment, 'id'>) => {
    try {
      setIsLoading(true);
      const walkInData = {
        ...newAppointment,
        status: 'walk-in' as const,
      };
      const createdAppointment = await appointmentService.createAppointment(walkInData);
      setAppointments([...appointments, createdAppointment]);
      setIsWalkInModalOpen(false);
      toast.success('Walk-in appointment created');
    } catch (error) {
      toast.error('Failed to create walk-in appointment');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const completedAppointments = appointments.map(appointment => ({
    ...appointment,
    date: appointment.date instanceof Date ? appointment.date : new Date(appointment.date)
  })).filter(app => app.status === 'completed');

  console.log('All appointments:', appointments);
  console.log('Completed appointments:', completedAppointments);

  const activeAppointments = appointments.filter(app => 
    app.status === 'scheduled' || app.status === 'walk-in'
  );

  const handleScheduleFollowUp = (appointment: Appointment) => {
    setIsModalOpen(false);
    setSelectedAppointment(appointment);
    setIsCreateModalOpen(true);
  };

  const handleFollowUp = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  const upcomingAppointments = appointments.filter(app => 
    app.status === 'scheduled' && 
    new Date(app.date) > new Date()
  );

  const requestedAppointments = appointments.filter(app => 
    app.source === 'external'
  );

  const handleViewCase = (caseId: string) => {
    navigate(`/dashboard/cases/${caseId}`);
  };

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className={`p-8 min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="max-w-7xl mx-auto">
        
        <div className={`flex justify-between items-center mb-8 p-4 rounded-lg ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white'
        } border`}>
          <h1 className={`text-2xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Appointments
          </h1>
          
          <div className="flex space-x-4">
            <button
              onClick={() => setIsWalkInModalOpen(true)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'bg-green-700 hover:bg-green-600'
                  : 'bg-green-600 hover:bg-green-700'
              } text-white`}
            >
              <UserPlus className="w-5 h-5" />
              <span>Walk-In</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'bg-blue-700 hover:bg-blue-600'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              <Plus className="w-5 h-5" />
              <span>New Appointment</span>
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-500">
            Appointment Analytics
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatsCard
                title="Total Booked"
                value="85"
                icon={Users}
                className={theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
              />
              <StatsCard
                title="Total Cancelled"
                value="11"
                icon={BanIcon}
                trend={{value: 5, isPositive: true}}
              />
              <StatsCard
                title="First Time Appointments"
                value="20"
                icon={User}
                trend={{ value: 5, isPositive: false }}
              />
              <StatsCard
                title="Follow-Up Appointments"
                value="45"
                icon={UserPlus}
                trend={{ value: 3, isPositive: true }}
              />
            </div>
       
        <div className="flex flex-col space-y-8">
          <div className={`h-[650px] rounded-xl shadow-sm ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white'
          } border`}>
            <CalendarView
              appointments={activeAppointments}
              onAppointmentClick={handleAppointmentClick}
              theme={theme}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div className={`rounded-2xl shadow-lg border ${
    theme === 'dark' 
      ? 'bg-gradient-to-b from-gray-800 to-gray-900 border-gray-700' 
      : 'bg-gradient-to-b from-gray-50 to-white border-gray-100'
  }`}>
    <UpcomingAppointments
      appointments={upcomingAppointments}
      theme={theme}
      onReschedule={handleRescheduleAppointment}
      onCancel={handleCancelAppointment}
      onViewAll={() => setIsUpcomingListModalOpen(true)}
    />
  </div>

            <RequestedAppointments
              appointments={requestedAppointments}
              onAccept={handleAcceptRequest}
              onReschedule={handleRescheduleAppointment}
              onViewAll={() => setIsRequestedListModalOpen(true)}
            />
          </div>
            <div className="overflow-x-auto">
              <CompletedAppointments
                appointments={completedAppointments}
                theme={theme}
                onViewDetails={handleAppointmentClick}
                onViewCase={handleViewCase}
              />
          </div>
        </div>

        <AppointmentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          appointment={selectedAppointment}
          onConfirm={handleConfirmAppointment}
          onReschedule={handleRescheduleAppointment}
          onCancel={handleCancelAppointment}
          onScheduleFollowUp={handleScheduleFollowUp}
          theme={theme}
        />

        <CreateAppointmentModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setSelectedAppointment(null);
          }}
          onSubmit={handleCreateAppointment}
          prefillPatient={selectedAppointment || undefined}
          theme={theme}
        />

        <RescheduleModal
          isOpen={isRescheduleModalOpen}
          onClose={() => setIsRescheduleModalOpen(false)}
          appointment={selectedAppointment}
          onReschedule={handleRescheduleConfirm}
          theme={theme}
        />

        <WalkInModal
          isOpen={isWalkInModalOpen}
          onClose={() => setIsWalkInModalOpen(false)}
          onSubmit={handleWalkInAppointment}
          theme={theme}
        />

        <AppointmentListModal
          isOpen={isUpcomingListModalOpen}
          onClose={() => setIsUpcomingListModalOpen(false)}
          appointments={upcomingAppointments}
          title="Upcoming Appointments"
          onReschedule={handleRescheduleAppointment}
          onCancel={handleCancelAppointment}
          theme={theme}
        />

        <AnalyticsModal
          isOpen={isAnalyticsModalOpen}
          onClose={() => setIsAnalyticsModalOpen(false)}
          analyticsData={{
          totalBooked: completedCount,
          totalCancelled: cancelledCount,
          firstTimeAppointments: firstTimeAppointmentsCount,
          followUpAppointments: followUpAppointmentsCount,
          }}
          theme={theme}
        />
        <AppointmentListModal
          isOpen={isRequestedListModalOpen}
          onClose={() => setIsRequestedListModalOpen(false)}
          appointments={requestedAppointments}
          title="Requested Appointments"
          onAccept={handleAcceptRequest}
          onReschedule={handleRescheduleAppointment}
          theme={theme}
        />
      </div>
    </div>
  );
};

export default Appointments;