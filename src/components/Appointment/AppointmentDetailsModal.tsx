import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Appointment } from "@/types/appointment";
import { format } from "date-fns";
import { 
  Clock, 
  Calendar,
  User,
  Mail,
  Phone,
  Package,
  Clock4,
  AlertCircle
} from "lucide-react";

export interface Service {
  id: string;
  name: string;
  price: number;
  description?: string;
}

interface ServiceWithReward extends Service {
  applied_reward?: {
    type: 'free' | 'discount';
    discount_percentage?: number;
  };
}

interface AppointmentDetailsModalProps {
  appointment: {
    id: string;
    status: string;
    time: string;
    wait_time?: string;
    patient: string;
    patient_email: string;
    patient_phone: string;
    services: ServiceWithReward[];
    total_amount?: number;
  };
  isOpen: boolean;
  onClose: () => void;
}

export const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({
  appointment,
  isOpen,
  onClose
}) => {
  console.log('Appointment Services:', appointment.services);

  // Calculate total and handle discounts
  const calculateServicePrice = (service: ServiceWithReward) => {
    if (service.applied_reward) {
      if (service.applied_reward.type === 'free') {
        return 0;
      } else if (service.applied_reward.type === 'discount' && service.applied_reward.discount_percentage) {
        return service.price * (1 - service.applied_reward.discount_percentage / 100);
      }
    }
    return service.price;
  };

  const totalAmount = appointment.total_amount || appointment.services.reduce((sum, service) => 
    sum + calculateServicePrice(service), 0);

  return (
    <Modal open={isOpen}>
      <ModalContent className="max-w-2xl">
        <ModalHeader className="border-b p-4">
          <ModalTitle>Appointment Details</ModalTitle>
        </ModalHeader>

        <div className="p-4 space-y-6">
          {/* Status Banner */}
          <div className={`p-4 rounded-lg ${
            appointment.status === 'scheduled' ? 'bg-blue-50 text-blue-700' :
            appointment.status === 'in-room' ? 'bg-orange-50 text-orange-700' :
            appointment.status === 'waiting' ? 'bg-yellow-50 text-yellow-700' :
            appointment.status === 'completed' ? 'bg-green-50 text-green-700' :
            'bg-red-50 text-red-700'
          }`}>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium capitalize">
                {appointment.status.replace('-', ' ')} Appointment
              </span>
            </div>
          </div>

          {/* Time and Date */}
          <Card className="p-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-sm text-muted-foreground">Date</div>
                  <div className="font-medium">
                    {format(new Date(appointment.time), 'MMMM d, yyyy')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-sm text-muted-foreground">Time</div>
                  <div className="font-medium">
                    {format(new Date(appointment.time), 'h:mm a')}
                  </div>
                </div>
              </div>
              {appointment.wait_time && (
                <div className="flex items-center gap-3">
                  <Clock4 className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-sm text-muted-foreground">Wait Time</div>
                    <div className="font-medium">{appointment.wait_time}</div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Patient Information */}
          <Card className="p-4">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Patient Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Name</div>
                <div className="font-medium">{appointment.patient}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Email</div>
                <div className="font-medium">{appointment.patient_email}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Phone</div>
                <div className="font-medium">{appointment.patient_phone}</div>
              </div>
            </div>
          </Card>

          {/* Services Section */}
          {Array.isArray(appointment.services) && appointment.services.length > 0 && (
            <Card className="p-4">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Booked Services
              </h3>
              <div className="space-y-3">
                {appointment.services.map((service) => (
                  <div 
                    key={service.id}
                    className="p-4 bg-secondary/5 rounded-lg hover:bg-secondary/10 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{service.name}</h4>
                        {service.description && (
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {service.description}
                          </p>
                        )}
                        {service.applied_reward && (
                          <p className="text-sm text-green-600 mt-1">
                            {service.applied_reward.type === 'free' 
                              ? 'Free Service Applied'
                              : `${service.applied_reward.discount_percentage}% Discount Applied`}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {service.applied_reward && (
                          <span className="text-sm text-muted-foreground line-through">
                            R{service.price.toLocaleString()}
                          </span>
                        )}
                        <span className="text-primary font-medium">
                          R{calculateServicePrice(service).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Total Section */}
                <div className="mt-4 pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {appointment.services.length} service{appointment.services.length > 1 ? 's' : ''}
                      </p>
                      <p className="font-medium">Total Amount</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        R{totalAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="border-t p-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}; 