import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { User, Calendar, Mail, Phone, MapPin, Award, Clock, Star, Gift } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useState } from "react";
import AddAppointmentModal from "../Appointment/AddAppointmentModal";
import { Patient } from '@/types/patient';
import type { Appointment } from '@/types/appointment';

interface ViewPatientModalProps {
  patient: Patient;
  appointments: Appointment[];
  isOpen: boolean;
  onClose: () => void;
}

const formatDate = (date: string) => {
  return format(new Date(date), 'PP');
};

export default function ViewPatientModal({ patient, appointments, isOpen, onClose }: ViewPatientModalProps) {
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  
  console.log('Patient data:', patient);
  console.log('Appointments:', appointments);

  // Filter appointments for this patient
  const patientAppointments = appointments?.filter(
    (appointment) => appointment.patient_email === patient.email
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Member Profile</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(80vh-120px)]">
          <div className="space-y-6 p-1">
            {/* Patient Overview Card */}
            <Card className="p-6 bg-gradient-to-br from-primary/5 via-background to-primary/5">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center backdrop-blur-sm">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{patient.name}</h2>
                  
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-full">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date of Birth</p>
                      <p className="font-medium">{formatDate(patient.dateOfBirth)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-full">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{patient.email}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-full">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{patient.contact_number}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-full">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">{patient.address}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-full">
                      <Award className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Reward Points</p>
                      <p className="font-medium">{patient.points ? patient.points + " points" : "No points"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Tabs Section */}
            <Tabs defaultValue="appointments" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="appointments">Appointments</TabsTrigger>
                <TabsTrigger value="medical-history">Reward History</TabsTrigger>
              </TabsList>

              <TabsContent value="appointments">
                <Card>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Clock className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold">Appointment History</h3>
                    </div>
                    <div className="space-y-4">
                      {patientAppointments?.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-primary/5 transition-colors"
                        >
                          <div>
                            <p className="font-medium">
                              {appointment.time ? format(new Date(appointment.time), 'PPP') : 'No date'}
                            </p>
                            <p className="text-sm text-muted-foreground">{appointment.patient}</p>
                          </div>
                          <div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              appointment.status === 'completed' 
                                ? 'bg-green-100 text-green-800'
                                : appointment.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {appointment.status}
                            </span>
                          </div>
                        </div>
                      ))}
                      {(!patientAppointments || patientAppointments.length === 0) && (
                        <p className="text-muted-foreground text-center py-4">No appointments found.</p>
                      )}
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="medical-history">
                <Card>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Star className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold">Reward History</h3>
                    </div>
                    
                    {patient.reward_claims && patient.reward_claims.length > 0 ? (
                      <div className="space-y-4">
                        {patient.reward_claims.map((claim: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-2 bg-primary/10 rounded-full">
                                <Gift className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{claim.reward_name}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Star className="w-3 h-3" />
                                  {claim.points_used} points
                                </div>
                                {claim.service_name && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Service: {claim.service_name}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                Code: {claim.redemption_code}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(claim.claimed_at), 'PPp')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Gift className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                        <p>No rewards claimed yet</p>
                      </div>
                    )}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button 
            onClick={() => {
              setIsScheduleModalOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Schedule
          </Button>
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Close
          </Button>
        </div>

        {/* Add Schedule Modal */}
        {isScheduleModalOpen && (
          <AddAppointmentModal
            patient={patient}
            isOpen={isScheduleModalOpen}
            onClose={() => setIsScheduleModalOpen(false)}
            onAdd={async () => {
              // Handle appointment addition
              setIsScheduleModalOpen(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}