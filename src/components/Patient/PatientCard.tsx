import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Patient } from '@/types/patient';
import { Calendar, Eye, User, Star, Clock, RepeatIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Appointment } from '@/types/appointment';
import AddAppointmentModal from '@/components/Appointment/AddAppointmentModal';
import { supabase } from '@/config/supabase';


interface PatientCardProps {
  patient: Patient;
  appointments?: Appointment[];
  onSchedule?: () => void;
  onViewDetails?: () => void;
}

const PatientCard: React.FC<PatientCardProps> = ({ patient, appointments, onSchedule, onViewDetails }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Get the latest completed appointment date
  const lastVisit = appointments?.find(apt => apt.status === 'completed')?.time
    ? format(new Date(appointments.find(apt => apt.status === 'completed')!.time), 'MMM d, yyyy')
    : 'No visits';

  // Update the appointments count as well
  const completedAppointmentsCount = appointments?.filter(apt => apt.status === 'completed').length || 0;

  const handleAddAppointment = async (appointmentData: any) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select()
        .single();

      if (error) throw error;

      setIsAddModalOpen(false);
      onSchedule && onSchedule();
    } catch (error) {
      console.error('Failed to create appointment:', error);
    }
  };

  return (
    <>
      <Card className="p-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 hover:scale-[1.02] bg-white border-0 rounded-xl backdrop-blur-sm group relative">
        <div className="flex justify-between items-start mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <User className="h-5 w-5" />
          </div>
          
          {/* Status Badge moved here */}
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium tracking-wide ${
            patient.status === 'active' 
              ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20' 
              : 'bg-gray-50 text-gray-700 ring-1 ring-gray-600/20'
          }`}>
            {patient.status || 'inactive'}
          </span>
        </div>

        <div className="space-y-3 mb-14">
          <h3 className="font-medium text-xl tracking-tight text-gray-900">
            {patient.name}
          </h3>
          <p className="text-gray-500 text-sm font-normal">{patient.email}</p>
          
          {/* Patient Stats */}
          <div className="flex justify-between items-center pt-2">
            <div className="flex items-center gap-1.5">
              <div className="p-1.5 bg-primary/10 rounded-full">
                <Star className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm text-gray-600 whitespace-nowrap">{patient.points || 0} pts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="p-1.5 bg-primary/10 rounded-full">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm text-gray-600 whitespace-nowrap">{lastVisit}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="p-1.5 bg-primary/10 rounded-full">
                <RepeatIcon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm text-gray-600 whitespace-nowrap">
                {completedAppointmentsCount}
              </span>
            </div>
          </div>
        </div>

        {/* Buttons container with frosted glass effect */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pt-10 bg-gradient-to-t from-white/95 via-white/95 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-3 justify-end backdrop-blur-sm">
          <Button
            onClick={onViewDetails}
            variant="ghost"
            size="sm"
            className="hover:bg-gray-100 text-gray-700 transition-colors duration-200"
          >
            <Eye className="h-4 w-4 mr-1.5" />
            View Details
          </Button>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white transition-colors duration-200"
          >
            <Calendar className="h-4 w-4 mr-1.5" />
            Schedule
          </Button>
        </div>
      </Card>

      <AddAppointmentModal
        patient={patient}
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddAppointment}
      />
    </>
  );
};

export default PatientCard; 