import React from 'react';
import { Card } from '@/components/ui/card';
import { Clock, Users } from 'lucide-react';
import { Appointment } from '@/types/appointment';

interface AppointmentStatisticsProps {
  appointments: Appointment[];
}

const AppointmentStatistics: React.FC<AppointmentStatisticsProps> = ({ appointments }) => {
  const totalAppointments = appointments.length;
  const scheduledAppointments = appointments.filter(a => a.status === 'scheduled').length;
  const waitingAppointments = appointments.filter(a => a.status === 'waiting').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <Card className="p-6 flex items-center">
        <Clock className="w-6 h-6 text-blue-500 mr-4" />
        <div>
          <p className="text-sm text-gray-500">Total Appointments</p>
          <p className="text-xl font-semibold">{totalAppointments}</p>
        </div>
      </Card>
      <Card className="p-6 flex items-center">
        <Users className="w-6 h-6 text-green-500 mr-4" />
        <div>
          <p className="text-sm text-gray-500">Scheduled</p>
          <p className="text-xl font-semibold">{scheduledAppointments}</p>
        </div>
      </Card>
      <Card className="p-6 flex items-center">
        <Clock className="w-6 h-6 text-yellow-500 mr-4" />
        <div>
          <p className="text-sm text-gray-500">Waiting</p>
          <p className="text-xl font-semibold">{waitingAppointments}</p>
        </div>
      </Card>
    </div>
  );
};

export default AppointmentStatistics; 