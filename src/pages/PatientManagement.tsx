import React, { useEffect, useState } from 'react';
import { DashboardLayout } from "@/components/Dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, Users, Star, Calendar, Activity, ChevronLeft, ChevronRight, UserPlus, HeartPulse, Stethoscope, UsersRound, Upload } from "lucide-react";
import { supabase } from '@/config/supabase';
import { Patient } from '@/types/patient';
import { toast } from 'sonner';
import PatientCard from '@/components/Patient/PatientCard';
import AddPatientModal from '@/components/Patient/AddPatientModal';
import { useCurrentPractice } from '@/hooks/useCurrentPractice';
import ViewPatientModal from '@/components/Patient/ViewPatientModal';
import type { Appointment as ImportedAppointment } from '@/types/appointment';

const PatientManagement: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const practiceId = useCurrentPractice();
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<ImportedAppointment[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const patientsPerPage = 12;

  useEffect(() => {
    if (practiceId) {
      fetchPatients();
      fetchAppointments();
    }
  }, [practiceId]);

  const fetchPatients = async () => {
    if (!practiceId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*, dateOfBirth, contact_number, address, reward_claims')
        .eq('practice_id', practiceId);

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    if (!practiceId) return;
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
    }
  };

  const handleAddPatient = async (patientData: Partial<Patient>) => {
    try {
      if (!practiceId) {
        toast.error('Practice ID is required');
        return;
      }

      const { data, error } = await supabase
        .from('patients')
        .insert([{
          ...patientData,
          practice_id: practiceId,
          created_at: new Date().toISOString(),
          reward_claims: []
        }])
        .select()
        .single();

      if (error) throw error;

      setPatients(prev => [...prev, data]);
      toast.success('Member added successfully');
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast.error(error.message || 'Failed to add member');
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.contact_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const indexOfLastPatient = currentPage * patientsPerPage;
  const indexOfFirstPatient = indexOfLastPatient - patientsPerPage;
  const currentPatients = filteredPatients.slice(indexOfFirstPatient, indexOfLastPatient);
  const totalPages = Math.ceil(filteredPatients.length / patientsPerPage);

  const activePatients = patients.filter(patient => patient.status === 'active').length;
  const totalAppointments = patients.reduce((sum, patient) => sum + (patient.appointmentCount || 0), 0);
  const totalPoints = patients.reduce((sum, patient) => sum + (patient.points || 0), 0);

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Decorative elements */}
      <div className="relative mb-8">
        <div className="absolute -left-8 top-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center animate-float delay-150">
          <HeartPulse className="w-6 h-6 text-primary" />
        </div>
        <div className="absolute -right-6 top-4 w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center animate-float">
          <Stethoscope className="w-5 h-5 text-secondary" />
        </div>
        <div className="relative bg-gradient-to-br from-primary/5 to-secondary/5 rounded-full p-8 border border-primary/10">
          <div className="animate-pulse-slow">
            <div className="absolute inset-0 rounded-full bg-primary/5 animate-ping-slow"></div>
            <UsersRound className="w-16 h-16 text-primary/40" />
          </div>
        </div>
        <div className="absolute -bottom-4 left-0 w-9 h-9 bg-accent/10 rounded-full flex items-center justify-center animate-float delay-300">
          <Star className="w-5 h-5 text-accent" fill="currentColor" />
        </div>
      </div>

      {/* Content */}
      <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-3">
        Welcome to Member Management
      </h3>
      <p className="text-gray-500 text-center mb-8 max-w-md">
        Start building your practice by adding your first member. Track appointments, rewards, and manage patient information all in one place.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="gap-2 bg-primary hover:bg-primary/90"
        >
          <UserPlus className="w-4 h-4" />
          Add First Member
        </Button>
        {/* <Button 
          variant="outline" 
          onClick={() => {
            // Add import functionality here
            toast.info('Import feature coming soon!');
          }}
          className="gap-2"
        >
          <Upload className="w-4 h-4" />
          Import Members
        </Button> */}
      </div>

      {/* Quick tips */}
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center max-w-2xl w-full">
        <div className="p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors">
          <div className="bg-white rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <UserPlus className="w-5 h-5 text-primary" />
          </div>
          <h4 className="font-medium text-gray-900 mb-1">Add Members</h4>
          <p className="text-sm text-gray-500">Create detailed profiles for your patients</p>
        </div>
        <div className="p-4 rounded-lg bg-secondary/5 hover:bg-secondary/10 transition-colors">
          <div className="bg-white rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Calendar className="w-5 h-5 text-secondary" />
          </div>
          <h4 className="font-medium text-gray-900 mb-1">Track Visits</h4>
          <p className="text-sm text-gray-500">Monitor appointments and visits</p>
        </div>
        <div className="p-4 rounded-lg bg-accent/5 hover:bg-accent/10 transition-colors">
          <div className="bg-white rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Star className="w-5 h-5 text-accent" />
          </div>
          <h4 className="font-medium text-gray-900 mb-1">Reward Loyalty</h4>
          <p className="text-sm text-gray-500">Engage patients with rewards</p>
        </div>
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

    @keyframes ping-slow {
      0% {
        transform: scale(1);
        opacity: 0.5;
      }
      50% {
        transform: scale(1.2);
        opacity: 0;
      }
      100% {
        transform: scale(1);
        opacity: 0.5;
      }
    }

    .animate-float {
      animation: float 3s ease-in-out infinite;
    }

    .animate-ping-slow {
      animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite;
    }

    .delay-150 {
      animation-delay: 0.15s;
    }

    .delay-300 {
      animation-delay: 0.3s;
    }
  `;

  return (
    <DashboardLayout>
      <style>{styles}</style>
      <div className="flex flex-col min-h-[calc(100vh-4rem)]">
        <div className="space-y-6 flex-grow">
          {/* Header Section */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Member Management
              </h1>
              <p className="text-gray-600 mt-2">
                View and manage your member records
              </p>
            </div>
            <Button 
              className="gap-2 bg-primary hover:bg-primary/90"
              onClick={() => setIsModalOpen(true)}
            >
              <PlusCircle className="w-4 h-4" />
              Add Member
            </Button>
          </div>

          {/* Statistics Cards */}
          {patients.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active Members</p>
                    <h3 className="text-2xl font-semibold text-gray-900">{activePatients}</h3>
                  </div>
                </div>
              </Card>
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-secondary/10 rounded-lg">
                    <Calendar className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Appointments</p>
                    <h3 className="text-2xl font-semibold text-gray-900">{totalAppointments}</h3>
                  </div>
                </div>
              </Card>
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-500/10 rounded-lg">
                    <Star className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Points</p>
                    <h3 className="text-2xl font-semibold text-gray-900">{totalPoints}</h3>
                  </div>
                </div>
              </Card>
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <Activity className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Average Visits</p>
                    <h3 className="text-2xl font-semibold text-gray-900">
                      {patients.length ? (totalAppointments / patients.length).toFixed(1) : '0'}
                    </h3>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Search Bar */}
          {patients.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                className="pl-10"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {/* Member List or Empty State */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin">
                  <Users className="w-8 h-8 text-primary/60" />
                </div>
                <p className="text-sm text-gray-500">Loading members...</p>
              </div>
            </div>
          ) : patients.length === 0 ? (
            <Card className="border-dashed">
              <EmptyState />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentPatients.map((patient) => (
                <PatientCard 
                  key={patient.id} 
                  patient={patient}
                  appointments={appointments.filter(apt => apt.patient_email === patient.email)}
                  onViewDetails={() => {
                    setSelectedPatient(patient);
                    setIsViewModalOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination at bottom */}
        {filteredPatients.length > 0 && (
          <div className="flex justify-center items-center gap-4 py-6 mt-auto">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <AddPatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddPatient}
        onSuccess={async () => {
          await fetchPatients();
          setIsModalOpen(false);
        }}
      />

      {selectedPatient && (
        <ViewPatientModal
          patient={selectedPatient}
          appointments={appointments.filter(apt => apt.patient_email === selectedPatient.email)}
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
        />
      )}
    </DashboardLayout>
  );
};

export default PatientManagement;