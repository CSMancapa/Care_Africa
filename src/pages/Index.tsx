import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "../components/Dashboard/DashboardLayout";
import { Award, Users, Clock, Calendar, PlusCircle, ArrowRight, Timer, CalendarClock, Gift, Sparkles, TrendingUp, ChevronRight } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from 'date-fns';
import { supabase } from '@/config/supabase';
import AppointmentCard from '@/components/Appointment/AppointmentCard';
import { Appointment } from '@/types/appointment';
import { useCurrentPractice } from '@/hooks/useCurrentPractice';
import { Patient } from '@/types/patient';
import AddPatientModal from '@/components/Patient/AddPatientModal';
import { OnboardingCard } from '@/components/OnboardingCard';

const DashboardCard = ({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<any>;
}) => (
  <Card className="p-6 animate-scale-in hover:shadow-lg transition-shadow">
    <div className="flex items-center gap-4">
      <div className="p-3 bg-primary/10 rounded-lg">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <h3 className="text-2xl font-semibold text-gray-900">{value}</h3>
      </div>
    </div>
  </Card>
);

interface DashboardStats {
  activePatients: number;
  totalRewards: number;
  todaysAppointments: number;
}

const Dashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const practiceId = useCurrentPractice();
  const [averageWaitTime, setAverageWaitTime] = React.useState<number>(0);
  const [stats, setStats] = React.useState<DashboardStats>({
    activePatients: 0,
    totalRewards: 0,
    todaysAppointments: 0
  });
  const [selectedDate] = useState<Date>(new Date()); // For today's date
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState(false);
  
  useEffect(() => {
    if (practiceId) {
      // Verify that appointments belong to current practice before setting them
      const verifyAndFetchAppointments = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('practice_id', practiceId);

          if (error) throw error;
          setAppointments(data || []);
        } catch (error) {
          console.error('Error fetching appointments:', error);
          toast.error('Failed to fetch appointments');
        } finally {
          setLoading(false);
        }
      };

      // Verify that patients belong to current practice before setting them
      const verifyAndFetchPatients = async () => {
        try {
          const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('practice_id', practiceId);

          if (error) throw error;
          setPatients(data || []);
        } catch (error) {
          console.error('Error fetching patients:', error);
          toast.error('Failed to fetch patients');
        }
      };

      verifyAndFetchAppointments();
      verifyAndFetchPatients();
    } else {
      // Clear data if no practice ID
      setAppointments([]);
      setPatients([]);
    }
  }, [practiceId]);

  useEffect(() => {
    fetchTodaysAppointments();
    calculateAverageWaitTime();
    fetchDashboardStats();
    const loadPracticeSetupStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: practice, error } = await supabase
          .from('practices')
          .select('setup_completed')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;
        setSetupCompleted(practice?.setup_completed || false);
      } catch (error) {
        console.error('Error loading practice setup status:', error);
      }
    };

    loadPracticeSetupStatus();
  }, []);

  const fetchTodaysAppointments = async () => {
    if (!practiceId) return;
    
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('practice_id', practiceId)
        .gte('time', startOfDay)
        .lt('time', endOfDay)
        .order('time', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to fetch appointments');
    }
  };

  const calculateAverageWaitTime = async () => {
    if (!practiceId) return;

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('wait_duration')
        .eq('practice_id', practiceId)
        .not('wait_duration', 'is', null);

      if (error) throw error;

      if (!data || data.length === 0) {
        setAverageWaitTime(0);
        return;
      }

      // Convert MM:SS format to minutes
      const waitTimes = data.map(appointment => {
        if (!appointment.wait_duration) return 0;
        const [minutes, seconds] = appointment.wait_duration.split(':').map(Number);
        return minutes + (seconds / 60);
      });

      // Calculate average
      const average = waitTimes.length > 0
        ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
        : 0;

      setAverageWaitTime(average);
    } catch (error) {
      console.error('Error calculating average wait time:', error);
      toast.error('Failed to calculate average wait time');
    }
  };

  const fetchDashboardStats = async () => {
    if (!practiceId) return;

    try {
      const { data: activePatients, error: patientsError } = await supabase
        .from('patients')
        .select('id', { count: 'exact' })
        .eq('practice_id', practiceId)
        .eq('status', 'active');

      if (patientsError) throw patientsError;

      // Get today's appointments count
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const { count: appointmentsCount, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id', { count: 'exact' })
        .gte('time', startOfDay)
        .lt('time', endOfDay);

      if (appointmentsError) throw appointmentsError;

      // Update stats
      setStats({
        activePatients: activePatients.length || 0,
        totalRewards: 856, // You can update this with real data when available
        todaysAppointments: appointmentsCount || 0
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to fetch dashboard statistics');
    }
  };

  // Helper function to format wait time
  const formatWaitTime = (minutes: number): string => {
    if (minutes === 0) return 'No data';
    if (minutes < 60) return `${minutes} mins`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return remainingMins > 0 
      ? `${hours}h ${remainingMins}m`
      : `${hours}h`;
  };

  const handleUpdateStatus = async (id: string, newStatus: Appointment['status']) => {
    try {
      let updates: Partial<Appointment> = { 
        status: newStatus,
      };

      // Add wait_start_time when moving to waiting status
      if (newStatus === 'waiting') {
        updates.wait_start_time = new Date().toISOString();
      }

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

  // Filter appointments for today using the same logic from AppointmentManagement
  const todaysAppointments = practiceId ? appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.time);
    return appointmentDate.toDateString() === selectedDate.toDateString();
  }) : [];

  const activePatients = practiceId ? patients.filter(patient => 
    patient.status === 'active'
  ).length : 0;

  const waitingRoom = practiceId ? appointments.filter(appointment => 
    appointment.status === 'waiting'
  ).length : 0;

  const completedToday = practiceId ? appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.time);
    const today = new Date();
    return appointmentDate.toDateString() === today.toDateString() && 
           appointment.status === 'completed';
  }).length : 0;

  const AppointmentsEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <div className="relative mb-6">
        <div className="absolute -left-6 top-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center animate-float delay-150">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div className="relative bg-gradient-to-br from-primary/5 to-secondary/5 rounded-full p-6 border border-primary/10">
          <CalendarClock className="w-12 h-12 text-primary/40" />
        </div>
        <div className="absolute -right-4 bottom-0 w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center animate-float delay-300">
          <Clock className="w-4 h-4 text-secondary" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Appointments Today</h3>
      <p className="text-sm text-gray-500 text-center mb-6 max-w-sm">
        Schedule your first appointment to start managing your patient visits efficiently.
      </p>
      <Button 
        variant="default" 
        className="gap-2"
        onClick={() => {/* Add navigation to appointments */}}
      >
        <Calendar className="w-4 h-4" />
        Schedule Appointment
      </Button>
    </div>
  );

  const RewardsEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <div className="relative mb-6">
        <div className="absolute -left-6 top-0 w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center animate-float">
          <Gift className="w-5 h-5 text-secondary" />
        </div>
        <div className="relative bg-gradient-to-br from-secondary/5 to-primary/5 rounded-full p-6 border border-secondary/10">
          <div className="animate-pulse-slow">
            <Sparkles className="w-12 h-12 text-secondary/40" />
          </div>
        </div>
        <div className="absolute -right-4 bottom-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center animate-float delay-150">
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Rewarding Loyalty</h3>
      <p className="text-sm text-gray-500 text-center mb-6 max-w-sm">
        Create your first reward tier to encourage patient loyalty and engagement.
      </p>
      <div className="space-y-3">
        <Button 
          variant="default" 
          className="w-full gap-2"
          onClick={() => {/* Add navigation to rewards */}}
        >
          <Award className="w-4 h-4" />
          Create Rewards
        </Button>
  
      </div>
    </div>
  );

  // Add these animations to your styles
  const styles = `
    @keyframes float {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-8px);
      }
    }

    @keyframes pulse-slow {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    .animate-float {
      animation: float 3s ease-in-out infinite;
    }

    .animate-pulse-slow {
      animation: pulse-slow 2s ease-in-out infinite;
    }

    .delay-150 {
      animation-delay: 0.15s;
    }

    .delay-300 {
      animation-delay: 0.3s;
    }
  `;

  const handleAddPatient = async (patientData: any) => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .insert([patientData])
        .select()
        .single();

      if (error) throw error;

      setPatients(prev => [...prev, data]);
      toast.success('Patient added successfully');
      
      // Refresh dashboard stats
      fetchDashboardStats();
    } catch (error) {
      console.error('Error adding patient:', error);
      toast.error('Failed to add patient');
    }
  };

  return (
    <DashboardLayout>
      <style>{styles}</style>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome to Care Africa</h1>
            <p className="text-gray-600 mt-2">
              Monitor your practice's performance and reward patient loyalty
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              className="gap-2"
              onClick={() => setIsAddPatientModalOpen(true)}
            >
              <PlusCircle className="w-4 h-4" /> New Member
            </Button>
          </div>
        </div>

        {!setupCompleted && <OnboardingCard />}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCard
            title="Active Members"
            value={activePatients.toString()}
            icon={Users}
          />
          <DashboardCard
            title="Total Rewards Given"
            value={stats.totalRewards.toString()}
            icon={Award}
          />
          <DashboardCard
            title="Avg. Wait Time"
            value={formatWaitTime(averageWaitTime)}
            icon={Clock}
          />
          <DashboardCard
            title="Today's Appointments"
            value={todaysAppointments.length.toString()}
            icon={Calendar}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Today's Appointments</h2>
              <Button variant="outline" size="sm" className="gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            {todaysAppointments.length > 0 ? (
              <div className="space-y-4">
                {todaysAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onUpdateStatus={handleUpdateStatus}
                  />
                ))}
              </div>
            ) : (
              <AppointmentsEmptyState />
            )}
          </Card>

          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Recent Rewards Activity</h2>
              <Button variant="outline" size="sm" className="gap-1">
                Manage Rewards <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            {stats.totalRewards > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4 bg-primary/5">
                    <h3 className="font-medium text-primary mb-1">500 Points Tier</h3>
                    <p className="text-sm text-gray-600 mb-3">Most Popular</p>
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-primary" />
                      <span className="text-sm">12 Claimed Today</span>
                    </div>
                  </Card>
                  <Card className="p-4 bg-secondary/5">
                    <h3 className="font-medium text-secondary mb-1">1000 Points Tier</h3>
                    <p className="text-sm text-gray-600 mb-3">Premium Rewards</p>
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-secondary" />
                      <span className="text-sm">5 Claimed Today</span>
                    </div>
                  </Card>
                </div>
                <div className="mt-4">
                  <h3 className="font-medium mb-3">Recent Claims</h3>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                      <div className="flex items-center gap-3">
                        <Award className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium">Netflix Voucher</p>
                          <p className="text-sm text-gray-600">500 points</p>
                        </div>
                      </div>
                      <span className="text-sm text-gray-600">2h ago</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <RewardsEmptyState />
            )}
          </Card>
        </div>

        <AddPatientModal
          isOpen={isAddPatientModalOpen}
          onClose={() => setIsAddPatientModalOpen(false)}
          onAdd={handleAddPatient}
          onSuccess={fetchDashboardStats}
        />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
