import React, { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/Dashboard/DashboardLayout";
import { Award, Users, Clock, Calendar, PlusCircle, ArrowRight, Timer } from "lucide-react";
import { supabase } from '@/config/supabase';
import AppointmentCard from '@/components/Appointment/AppointmentCard';
import AddAppointmentModal from '@/components/Appointment/AddAppointmentModal';
import { Appointment } from '@/types/appointment';
import { toast } from 'sonner';
import AppointmentCalendar from '@/components/Appointment/AppointmentCalendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RequestedAppointments from '@/components/Appointment/RequestedAppointments';
import { Badge } from "@/components/ui/badge";
import { WaitingTimer } from '@/components/Appointment/WaitingTimer';
import { useCurrentPractice } from '@/hooks/useCurrentPractice';
import { AppointmentData } from '@/types/appointment';

const AppointmentManagement: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [requestedAppointments, setRequestedAppointments] = useState<Appointment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const practiceId = useCurrentPractice();
  const [pointsAwarded, setPointsAwarded] = useState<number>(0);
  const [completedPatientName, setCompletedPatientName] = useState<string>('');
  const [completedModalOpen, setCompletedModalOpen] = useState<boolean>(false);

  // Fetch all appointments when practiceId changes
  useEffect(() => {
    if (practiceId) {  // Only fetch when practiceId is available
      fetchAppointments();
      fetchRequestedAppointments();
    }
  }, [practiceId]); // Add practiceId as dependency

  const fetchAppointments = async () => {
    if (!practiceId) {
      console.log('No practice ID available');
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching appointments for practice:', practiceId);
      
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('practice_id', practiceId) // Filter by practice_id
        .in('status', ['scheduled', 'arrived', 'waiting', 'in-room', 'completed', 'cancelled'])
        .order('time', { ascending: true });

      if (error) throw error;
      
      console.log('Found appointments:', data?.length || 0);
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequestedAppointments = async () => {
    if (!practiceId) return;

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('practice_id', practiceId) // Filter by practice_id
        .eq('status', 'requested');

      if (error) throw error;
      setRequestedAppointments(data || []);
    } catch (error) {
      console.error('Error fetching requested appointments:', error);
      toast.error('Failed to fetch requested appointments');
    }
  };

  const handleUpdateStatus = async (
    id: string, 
    newStatus: Appointment['status'], 
    waitTime?: string
  ) => {
    try {
      let updates: Partial<Appointment> = { 
        status: newStatus,
      };

      if (newStatus === 'waiting') {
        updates.wait_start_time = new Date().toISOString();
      } 
      else if (newStatus === 'in-room' && waitTime) {
        updates.wait_duration = waitTime;
        updates.wait_start_time = null;
      }

      // Update appointment status
      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setAppointments(prev => prev.map(apt => 
        apt.id === id ? data : apt
      ));
      
      toast.success('Appointment status updated');
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleAddAppointment = async (appointmentData: AppointmentData) => {
    console.log('handleAddAppointment started with data:', appointmentData);
    
    try {
      if (!practiceId) {
        console.error('No practice ID available');
        toast.error('Practice ID is required');
        return;
      }

      // Validate the appointment data
      if (!appointmentData.time || !appointmentData.patient || !appointmentData.services) {
        console.error('Missing required fields:', appointmentData);
        toast.error('Missing required appointment information');
        return;
      }

      const appointment = {
        ...appointmentData,
        practice_id: practiceId,
        status: 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Sending appointment to Supabase:', appointment);

      const { data, error } = await supabase
        .from('appointments')
        .insert([appointment])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Appointment created successfully:', data);
      
      // Update local state
      setAppointments(prev => {
        console.log('Previous appointments:', prev);
        const newAppointments = [...prev, data];
        console.log('Updated appointments:', newAppointments);
        return newAppointments;
      });
      
      setIsModalOpen(false);
      toast.success('Appointment created successfully');
    } catch (error: any) {
      console.error('Error adding appointment:', error);
      toast.error(error.message || 'Failed to create appointment');
      throw error;
    }
  };

  const handleConfirmRequested = async (id: string) => {
    await handleUpdateStatus(id, 'scheduled');
    setRequestedAppointments(prev => prev.filter(appointment => appointment.id !== id));
  };

  const handleDeclineRequest = async (id: string) => {
    try {
      await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      setRequestedAppointments(prev => 
        prev.filter(appointment => appointment.id !== id)
      );
    } catch (error) {
      console.error('Error declining appointment:', error);
      toast.error('Failed to decline appointment');
    }
  };

  const handleRescheduleRequest = async (id: string) => {
    // Implement reschedule logic or open reschedule modal
    setIsRescheduleModalOpen(true);
    setSelectedAppointmentId(id);
  };

  const filteredAppointments = practiceId ? appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.time);
    return (
      appointmentDate.toDateString() === selectedDate.toDateString()
    );
  }) : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Appointment Management
            </h1>
            <p className="text-gray-600 mt-2">
              Schedule and manage patient appointments
            </p>
          </div>
          <Button 
            className="gap-2 bg-primary hover:bg-primary/90"
            onClick={() => setIsModalOpen(true)}
          >
            <PlusCircle className="w-4 h-4" /> 
            New Appointment
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Today's Appointments</p>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {filteredAppointments.length}
                </h3>
              </div>
            </div>
          </Card>
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary/10 rounded-lg">
                <Clock className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Waiting Room</p>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {appointments.filter(a => a.status === 'waiting').length}
                </h3>
              </div>
            </div>
          </Card>
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <Users className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Requests</p>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {requestedAppointments.length}
                </h3>
              </div>
            </div>
          </Card>
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Award className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed Today</p>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {appointments.filter(a => a.status === 'completed').length}
                </h3>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-12 gap-6">
          {/* Calendar Column - Now wider */}
          <Card className="col-span-12 lg:col-span-8 p-6">
            <AppointmentCalendar 
              appointments={appointments} 
              onDateChange={setSelectedDate}
              selectedDate={selectedDate}
            />
          </Card>

          {/* Appointments Column - Now sidebar */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Requested Appointments */}
            <RequestedAppointments
              appointments={requestedAppointments}
              onConfirm={handleConfirmRequested}
              onDecline={handleDeclineRequest}
              onReschedule={handleRescheduleRequest}
            />

            {/* Today's Appointments */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  {selectedDate.toLocaleDateString()}
                </h2>
                <Badge variant="secondary">
                  {practiceId ? filteredAppointments.length : 0} appointments
                </Badge>
              </div>
              <div className="space-y-3">
                {practiceId ? (
                  filteredAppointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment as any}
                      onUpdateStatus={(id, newStatus) => handleUpdateStatus(id, newStatus, appointment.wait_duration)}
                    />
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Please log in to view appointments
                  </p>
                )}
                {practiceId && filteredAppointments.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No appointments scheduled for this day
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
      
      <AddAppointmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddAppointment}
      />
    </DashboardLayout>
  );
};

export default AppointmentManagement; 