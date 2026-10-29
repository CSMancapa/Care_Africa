import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, X, Check, AlertCircle } from "lucide-react";
import { Appointment } from '@/types/appointment';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";

interface RequestedAppointmentsProps {
  appointments: Appointment[];
  onConfirm: (id: string) => void;
  onDecline: (id: string) => void;
  onReschedule: (id: string) => void;
}

const RequestedAppointments: React.FC<RequestedAppointmentsProps> = ({
  appointments,
  onConfirm,
  onDecline,
  onReschedule
}) => {
  if (appointments.length === 0) return null;

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/5 border-primary/10">
      <div className="p-6 border-b border-primary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Appointment Requests</h2>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {appointments.length} pending
          </Badge>
        </div>
      </div>

      <div className="divide-y divide-primary/10">
        {appointments.map((appointment) => (
          <div 
            key={appointment.id}
            className="p-4 hover:bg-primary/5 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="font-medium text-gray-900">
                  {appointment.patient}
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(appointment.time).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(appointment.time).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
                {appointment.notes && (
                  <p className="text-sm text-gray-600 mt-2">
                    Note: {appointment.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    onDecline(appointment.id);
                    toast.error(`Declined appointment for ${appointment.patient}`);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-primary hover:bg-primary/10"
                  onClick={() => {
                    onReschedule(appointment.id);
                    toast.info(`Rescheduling appointment for ${appointment.patient}`);
                  }}
                >
                  Reschedule
                </Button>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => {
                    onConfirm(appointment.id);
                    toast.success(`Confirmed appointment for ${appointment.patient}`);
                  }}
                >
                  <Check className="w-4 h-4 mr-1" /> Confirm
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {appointments.length > 5 && (
        <div className="p-4 text-center border-t border-primary/10">
          <Button variant="ghost" className="text-primary hover:bg-primary/10">
            View all requests
          </Button>
        </div>
      )}
    </Card>
  );
};

export default RequestedAppointments; 