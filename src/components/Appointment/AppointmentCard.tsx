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

interface Service {
  id?: string;
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
    scheduled: { className: "bg-slate-100 text-slate-700", label: "Scheduled" },
    arrived: { className: "bg-orange-100 text-orange-800", label: "Arrived" },
    waiting: { className: "bg-yellow-100 text-yellow-800", label: "Waiting" },
    "in-room": { className: "bg-teal-100 text-teal-800", label: "In Room" },
    completed: { className: "bg-green-100 text-green-800", label: "Completed" },
    cancelled: { className: "bg-red-100 text-red-800", label: "Cancelled" },
    requested: { className: "bg-primary/10 text-primary", label: "Requested" },
  };

  const config = statusConfig[status] ?? statusConfig.scheduled;
  return (
    <span className={cn("px-2 py-1 text-xs rounded-full font-medium", config.className)}>
      {config.label}
    </span>
  );
};

const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, onUpdateStatus }) => {
  const [currentWaitTime, setCurrentWaitTime] = useState<string>('00:00');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const handleStatusChange = async (newStatus: Appointment['status']) => {
    // Points for a completed visit are awarded by the database (complete_appointment).
    if (newStatus === 'in-room' && appointment.status === 'waiting') {
      onUpdateStatus(appointment.id, newStatus, currentWaitTime);
    } else {
      onUpdateStatus(appointment.id, newStatus);
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
            className="w-full text-primary hover:bg-primary/10"
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
          ) as any[]
        }}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
      />
    </>
  );
};

export default AppointmentCard; 