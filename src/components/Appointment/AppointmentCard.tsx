import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Users, Clock, Timer, ArrowRight, CheckCircle, Check, X, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Appointment } from "@/types/appointment";
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils'; // Utility for conditional classNames
import { WaitingTimer } from '../Appointment/WaitingTimer';
import { format } from 'date-fns';
import { AppointmentDetailsModal } from './AppointmentDetailsModal';
import { supabase } from '@/config/supabase';

interface Service {
  id: string;
  name: string;
  price: number;
}

interface AppointmentCardProps {
  appointment: Omit<Appointment, 'services'> & {
    services: (Service | string)[];
    patient_email: string;
  };
  onUpdateStatus: (id: string, newStatus: Appointment['status'], currentWaitTime?: string) => void;
}

const StatusBadge = ({ status }: { status: Appointment['status'] }) => {
  const statusConfig = {
    scheduled: { className: "bg-blue-100 text-blue-800", label: "Scheduled" },
    arrived: { className: "bg-orange-100 text-orange-800", label: "Arrived" },
    waiting: { className: "bg-yellow-100 text-yellow-800", label: "Waiting" },
    "in-room": { className: "bg-orange-100 text-orange-800", label: "In Room" },
    completed: { className: "bg-green-100 text-green-800", label: "Completed" },
    cancelled: { className: "bg-red-100 text-red-800", label: "Cancelled" },
  };

  const config = statusConfig[status];
  return (
    <span className={cn("px-2 py-1 text-xs rounded-full font-medium", config.className)}>
      {config.label}
    </span>
  );
};

const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, onUpdateStatus }) => {
  const [currentWaitTime, setCurrentWaitTime] = useState<string>('00:00');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const awardPoints = async (appointmentId: string) => {
    try {
      // Get practice rewards percentage
      const { data: practiceData, error: practiceError } = await supabase
        .from('practices')
        .select('rewards')
        .eq('id', appointment.practice_id)
        .single();

      if (practiceError) throw practiceError;

      // Calculate total amount from services
      const totalAmount = appointment.services
        .filter((service): service is Service => 
          typeof service === 'object' && service !== null && 'price' in service
        )
        .reduce((sum, service) => sum + service.price, 0);

      console.log('Total service amount:', totalAmount);
      console.log('Practice rewards config:', practiceData.rewards);
      
      // Calculate points based on percentage
      const rewardPercentage = practiceData?.rewards?.percentage_reward || 1;
      console.log('Reward percentage:', rewardPercentage);
      
      const pointsToAward = Math.floor((totalAmount * rewardPercentage) / 100);
      console.log('Points to award:', pointsToAward);

      // Get current patient points
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('id, points')
        .eq('email', appointment.patient_email)
        .eq('practice_id', appointment.practice_id)
        .single();

      if (patientError || !patientData) throw patientError || new Error('Patient not found');

      console.log('Current patient points:', patientData.points);
      const newTotalPoints = (patientData.points || 0) + pointsToAward;
      console.log('New total points will be:', newTotalPoints);

      // Update patient points
      const { data: updateData, error: updateError } = await supabase
        .from('patients')
        .update({ points: newTotalPoints })
        .eq('id', patientData.id)
        .eq('practice_id', appointment.practice_id)
        .select();

      if (updateError) throw updateError;
      
      console.log('Updated patient data:', updateData);
      toast.success(`Awarded ${pointsToAward} points (${rewardPercentage}% of R${totalAmount})`);
    } catch (error) {
      console.error('Error awarding points:', error);
      toast.error('Failed to award points');
      throw error; // Re-throw to prevent status update
    }
  };

  const handleStatusChange = async (newStatus: Appointment['status']) => {
    // Only award points when completing the appointment
    if (newStatus === 'completed') {
      try {
        await awardPoints(appointment.id);
        onUpdateStatus(appointment.id, newStatus);
      } catch (error) {
        console.error('Error completing appointment:', error);
        toast.error('Failed to complete appointment');
        return; // Don't update status if points award fails
      }
    } else {
      // For all other status changes, just update the status
      if (newStatus === 'in-room' && appointment.status === 'waiting') {
        onUpdateStatus(appointment.id, newStatus, currentWaitTime);
      } else {
        onUpdateStatus(appointment.id, newStatus);
      }
    }

    // Status change notifications
    switch (newStatus) {
      case "arrived":
        toast.success(`Marked ${appointment.patient} as Arrived`);
        break;
      case "waiting":
        toast.success(`${appointment.patient} moved to Waiting Room`);
        break;
      case "in-room":
        toast.success(`${appointment.patient} moved to Consulting Room`);
        break;
      case "completed":
        toast.success(`Completed ${appointment.patient}'s appointment`);
        break;
      case "cancelled":
        toast.success(`Cancelled ${appointment.patient}'s appointment`);
        break;
      default:
        break;
    }
  };

  const getStatusButton = () => {
    switch (appointment.status) {
      case "scheduled":
        return (
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full text-blue-600 hover:bg-blue-100"
            onClick={() => handleStatusChange("arrived")}
          >
            <Users className="w-4 h-4 mr-1" /> 
            Mark as Arrived
          </Button>
        );
      case "arrived":
        return (
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full text-orange-600 hover:bg-orange-100"
            onClick={() => handleStatusChange("waiting")}
          >
            <Clock className="w-4 h-4 mr-1" /> 
            Move to Waiting Room
          </Button>
        );
      case "waiting":
        return (
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full text-secondary hover:bg-secondary-100"
            onClick={() => handleStatusChange("in-room")}
          >
            <WaitingTimer 
              status={appointment.status} 
              wait_start_time={appointment.wait_start_time}
              onElapsedTimeChange={setCurrentWaitTime}
            />
            <ArrowRight className="w-4 h-4 ml-1" /> 
            Move to Consulting Room
          </Button>
        );
      case "in-room":
        return (
          <Button 
            size="sm" 
            variant="outline" 
            className="text-green-600 hover:bg-green-100"
            onClick={() => handleStatusChange("completed")}
          >
            <CheckCircle className="w-4 h-4 mr-1" /> 
            Complete Appointment
          </Button>
        );
      case "completed":
        return (
          <span className="text-sm font-medium text-green-600">Completed</span>
        );
      case "cancelled":
        return (
          <span className="text-sm font-medium text-red-600">Cancelled</span>
        );
      default:
        return null;
    }
  };

  const canBeRescheduled = ['scheduled', 'arrived', 'waiting'].includes(appointment.status);

  const getActionButtons = () => {
    const statusButton = getStatusButton();
    
    return (
      <div className="flex flex-col w-full gap-2 mt-auto">
        {canBeRescheduled && (
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full text-gray-600 hover:bg-gray-100"
            onClick={() => toast.info('Reschedule functionality coming soon')}
          >
            <Calendar className="w-4 h-4 mr-1" />
            Reschedule
          </Button>
        )}
        <div className="w-full">
          {statusButton}
        </div>
      </div>
    );
  };

  console.log('wait_start_time:', appointment.wait_start_time);

  return (
    <>
      <Card 
        className="w-full flex-1 p-4 shadow hover:shadow-md transition-shadow bg-white dark:bg-gray-800 rounded-lg cursor-pointer"
        onClick={(e) => {
          // Only open modal if the click target is the card or its non-button children
          if (!(e.target as HTMLElement).closest('button')) {
            setIsDetailsModalOpen(true);
          }
        }}
      >
        <div className="flex flex-col h-full space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{appointment.patient}</h3>
              <p className="text-sm text-muted-foreground">
                {format(new Date(appointment.time), 'h:mm a')}
              </p>
            </div>
            <StatusBadge status={appointment.status} />
          </div>
          <div className="flex-1 flex flex-col justify-end">
            {getActionButtons()}
          </div>
        </div>
      </Card>

      <AppointmentDetailsModal
        appointment={{
          ...appointment,
          services: appointment.services.filter((service): service is Service => 
            typeof service === 'object' && service !== null
          ) as Service[]
        }}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
      />
    </>
  );
};

export default AppointmentCard; 