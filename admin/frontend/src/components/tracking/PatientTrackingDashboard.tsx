import React, { useEffect, useRef, useState } from 'react';
import { PatientTracking, PatientStatus } from '../../types';
import { CalendarClock, Clock, FileText, Eye, ChevronLeft, ChevronRight, Search, ArrowRightCircle } from 'lucide-react';
import { UserRound } from 'lucide-react';
import { ConsultationTimer } from './ConsultationTimer';
import format from 'date-fns/format';
import { Dialog } from '@headlessui/react';
import ConsultationFormModal from '../consultation/ConsultationFormModal';
import { mockPreConsultationData } from '../../mockData/consultationFormData';
import { ConsultationFormData } from '../../types/formTypes';
import { appointmentService } from '../../services/appointmentService';
import { useTheme } from '../../contexts/ThemeContext';

interface PatientTrackingDashboardProps {
  appointments: PatientTracking[];
  onStatusChange: (id: string, status: PatientStatus) => void;
  onReorderQueue: (patients: PatientTracking[]) => void;
  variant: 'active' | 'waiting';
  theme: 'light' | 'dark';
  onViewForm?: (patientId: string) => void;
}

const ViewFormButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="inline-flex items-center justify-center w-full px-5 py-2.5 rounded-xl
      bg-gradient-to-r from-gray-50 to-gray-100
      text-gray-700 font-semibold text-sm
      border border-gray-200/80
      hover:border-gray-300 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200
      transform transition-all duration-200 hover:scale-[1.02]
      shadow-sm hover:shadow-md active:scale-98
      backdrop-blur-sm h-[40px]"
  >
    <Eye className="w-4 h-4 mr-2.5 text-gray-500" />
    View Form
  </button>
);

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  message 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  message: string; 
}) => (
  <Dialog open={isOpen} onClose={onClose} className="relative z-50">
    <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <Dialog.Panel className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <Dialog.Title className="text-lg font-semibold mb-4">Confirm Action</Dialog.Title>
        <p className="mb-6 text-gray-600">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
          >
            Confirm
          </button>
        </div>
      </Dialog.Panel>
    </div>
  </Dialog>
);

const calculateWaitTime = (checkInTime: string | Date): number => {
  const startTime = new Date(checkInTime);
  const endTime = new Date();
  return Math.floor((endTime.getTime() - startTime.getTime()) / 60000); // Returns minutes
};

const PatientCard = ({ 
  appointment,
  appointments,
  onStatusChange,
  onViewPreConsultForm,
  onExtendConsultation,
  theme
}: {
  appointment: PatientTracking;
  appointments: PatientTracking[];
  onStatusChange: (patientId: string, newStatus: PatientStatus) => void;
  onViewPreConsultForm?: (patientId: string) => void;
  onExtendConsultation?: (patientId: string, additionalMinutes: number) => void;
  theme: 'light' | 'dark';
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({ message: '', onConfirm: () => {} });

  const handleStartConsultation = async (patientId: string) => {
    try {
      // Calculate wait time
      const patient = appointments.find(p => p.id === patientId);
      if (!patient) return;

      const waitTime = calculateWaitTime(patient.checkInTime || new Date());
      
      // Update wait time through the appointmentService instead of direct API call
      await appointmentService.updateAppointment(patientId, { waitTime });
      
      // Update status
      onStatusChange(patientId, 'in-room');
    } catch (error) {
      console.error('Error updating wait time:', error);
    }
  };

  const handleCompleteConsultation = () => {
    const consultationDuration = new Date().getTime() - new Date(appointment.startTime!).getTime();
    const durationMinutes = Math.floor(consultationDuration / 60000);

    fetch('/api/completeAppointment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointmentId: appointment.appointmentId,
        patientId: appointment.id,
        consultationDuration: durationMinutes,
        completedAt: new Date().toISOString(),
        status: 'complete'
      }),
    })
    .then(response => response.json())
    .then(data => {
      console.log('Appointment completed:', data);
      onStatusChange(appointment.id, 'complete');
    })
    .catch(error => console.error('Error completing appointment:', error));
  };

  return (
    <>
      <div style={{
        background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.95) 100%)',
        borderRadius: '20px',
        padding: '32px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(255, 255, 255, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        maxWidth: '480px',
        width: '100%',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(255, 255, 255, 0.3)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(255, 255, 255, 0.3)';
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          marginBottom: '5px',
          

        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}>
            <div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#000000',
                marginBottom: '8px',
                letterSpacing: '-0.02em'
              }}>{appointment.patientName}</h3>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#666666',
                fontSize: '0.9rem',
                letterSpacing: '-0.01em'
              }}>
                <Clock size={14} />
                <span>
                  {appointment.scheduledTime instanceof Date 
                    ? format(appointment.scheduledTime, 'h:mm a')
                    : format(new Date(appointment.scheduledTime), 'h:mm a')
                  } • {appointment.expectedDuration}min
                </span>
              </div>
            </div>

            <div style={{
              padding: '6px 16px',
              borderRadius: '24px',
              fontSize: '0.875rem',
              fontWeight: '500',
              background: getStatusColor(appointment.status).bg,
              color: getStatusColor(appointment.status).text,
              letterSpacing: '-0.01em',
              border: '1px solid rgba(0, 0, 0, 0.04)'
            }}>
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </div>
          </div>

          {appointment.status === 'waiting' && (
            <WaitTimer startTime={appointment.checkInTime ? new Date(appointment.checkInTime) : new Date()} />
          )}

          {(appointment.status === 'waiting' || appointment.status === 'in-room') && (
            <div className="flex flex-col gap-4">
              {appointment.status === 'in-room' && (
                <ConsultationTimer 
                  startTime={appointment.startTime || new Date()} 
                  expectedDuration={appointment.expectedDuration} 
                  onExtend={() => {
                    if (window.confirm('Do you want to extend this consultation by 15 minutes?')) {
                      onExtendConsultation?.(appointment.id, 15);
                    }
                  }}
                />
              )}
              
              {onViewPreConsultForm && (
                <ViewFormButton onClick={() => onViewPreConsultForm(appointment.id)} />
              )}
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0px'
        }}>
          {getStatusActions(appointment.status).map((action, index) => (
            <button
              key={index}
              onClick={() => {
                if (action.nextStatus === 'in-room') {
                  handleStartConsultation(appointment.id);
                } else if (action.nextStatus === 'complete') {
                  handleCompleteConsultation();
                } else {
                  setModalConfig({
                    message: action.confirmMessage,
                    onConfirm: () => onStatusChange(appointment.id, action.nextStatus)
                  });
                  setModalOpen(true);
                }
              }}
              style={{
                padding: '0 24px',
                borderRadius: '14px',
                fontSize: '0.938rem',
                fontWeight: '600',
                background: `linear-gradient(135deg, ${action.color} 0%, ${adjustColor(action.color, -20)} 100%)`,
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s ease',
                width: '100%',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                letterSpacing: '-0.01em'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
      
      <ConfirmationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={modalConfig.onConfirm}
        message={modalConfig.message}
      />
    </>
  );
};

type ValidStatus = 'waiting' | 'in-room' | 'complete';

const getStatusColor = (status: string): { bg: string; text: string; } => {
  const colors: Record<ValidStatus, { bg: string; text: string }> = {
    'waiting': { bg: 'rgba(234, 88, 12, 0.08)', text: '#d45207' },
    'in-room': { bg: 'rgba(22, 163, 74, 0.08)', text: '#15803d' },
    'complete': { bg: 'rgba(79, 70, 229, 0.08)', text: '#4338ca' }
  };
  return colors[status as ValidStatus] || colors['waiting'];
};

const getStatusActions = (status: string) => {
  const actions: Array<{ 
    label: string; 
    nextStatus: PatientStatus; 
    color: string;
    confirmMessage: string;
  }> = {
    'waiting': [{ 
      label: 'Start Consultation', 
      nextStatus: 'in-room' as PatientStatus,
      color: '#16a34a',
      confirmMessage: 'Are you sure you want to start this consultation?'
    }],
    'in-room': [{ 
      label: 'Complete', 
      nextStatus: 'complete' as PatientStatus,
      color: '#EA7C1F',
      confirmMessage: 'Are you sure you want to complete this consultation?'
    }],
    default: []
  }[status] || [];
  
  return actions;
};

const WaitTimer = ({ startTime }: { startTime: Date }) => {
  const [duration, setDuration] = useState('0m 0s');

  useEffect(() => {
    const updateDuration = () => {
      const now = new Date();
      const diff = now.getTime() - startTime.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setDuration(`${minutes}m ${seconds}s`);
    };

    updateDuration(); // Initial call
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: '#666666',
      fontSize: '0.9rem'
    }}>
      <CalendarClock size={14} />
      <span>Waiting for {duration}</span>
    </div>
  );
};

const adjustColor = (color: string, amount: number): string => {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x00FF) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const calculateAverageWaitTime = (appointments: PatientTracking[]): string => {
  const waitingPatients = appointments.filter(apt => apt.status === 'waiting' && apt.checkInTime);
  if (waitingPatients.length === 0) return '0m';
  
  const totalWaitTime = waitingPatients.reduce((acc, apt) => {
    const waitTime = new Date().getTime() - new Date(apt.checkInTime!).getTime();
    return acc + waitTime;
  }, 0);
  
  const averageMinutes = Math.floor((totalWaitTime / waitingPatients.length) / 60000);
  return `${averageMinutes}m`;
};

const PatientTrackingDashboard: React.FC<PatientTrackingDashboardProps> = ({
  theme,
  variant,
  appointments,
  onStatusChange,
  onReorderQueue,
  onViewForm
}) => {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'urgent' | 'regular'>('all');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { theme: contextTheme } = useTheme();

  // Use the theme prop if available, fallback to context
  const currentTheme = theme || contextTheme;

  const filteredAppointments = appointments
    .filter(patient => {
      const matchesSearch = patient.patientName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'all' ? true : 
        filterStatus === 'urgent' ? patient.expectedDuration > 30 : patient.expectedDuration <= 30;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      const timeA = a.checkInTime ? new Date(a.checkInTime).getTime() : 0;
      const timeB = b.checkInTime ? new Date(b.checkInTime).getTime() : 0;
      return timeA - timeB;
    });

  const handleViewForm = (patientId: string) => {
    setSelectedPatientId(patientId);
    setIsFormModalOpen(true);
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (appointments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {variant === 'waiting' ? 'No patients waiting' : 'No active consultations'}
      </div>
    );
  }

  if (variant !== 'waiting') {
    return (
      <div className={`space-y-4 ${currentTheme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
        {/* Controls Bar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full">
              {appointments.length} Active
            </div>
          </div>
        </div>

        {/* Scroll Controls and Cards Container */}
        <div className="relative w-full overflow-hidden">
          {/* Scroll Buttons */}
          <button
            onClick={() => handleScroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10
              w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center
              hover:bg-gray-50 transition-all duration-200"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>

          <button
            onClick={() => handleScroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10
              w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center
              hover:bg-gray-50 transition-all duration-200"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>

          {/* Cards Container */}
          <div
            ref={scrollContainerRef}
            className="flex overflow-x-auto gap-4 pb-4 px-4 no-scrollbar"
            style={{ 
              maxWidth: '100%',
              width: '100%',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              scrollSnapType: 'x mandatory'
            }}
          >
            {filteredAppointments.map((patient) => (
              <div key={patient.id} style={{ flex: '0 0 400px' }} className="snap-center">
                <PatientCard
                  appointment={patient}
                  appointments={appointments}
                  onStatusChange={onStatusChange}
                  onViewPreConsultForm={onViewForm}
                  onExtendConsultation={(patientId, minutes) => {
                    const updatedAppointments = appointments.map(apt => 
                      apt.id === patientId 
                        ? { ...apt, expectedDuration: apt.expectedDuration + minutes }
                        : apt
                    );
                    onReorderQueue(updatedAppointments);
                  }}
                  theme={currentTheme}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${currentTheme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
      {/* Controls Bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search patients..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'urgent' | 'regular')}
            className="px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Patients</option>
            <option value="urgent">Urgent Cases</option>
            <option value="regular">Regular Cases</option>
          </select>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <Clock className="h-4 w-4" />
            <span className="truncate">Average Wait: {calculateAverageWaitTime(appointments)}</span>
          </div>
          <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full">
            {filteredAppointments.length} Waiting
          </div>
        </div>
      </div>

      {/* Scroll Controls and Cards Container */}
      <div className="relative w-full overflow-hidden">
        {/* Scroll Buttons */}
        <button
          onClick={() => handleScroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10
            w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center
            hover:bg-gray-50 transition-all duration-200"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>

        <button
          onClick={() => handleScroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10
            w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center
            hover:bg-gray-50 transition-all duration-200"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>

        {/* Cards Container */}
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto gap-4 pb-4 px-4 no-scrollbar"
          style={{ 
            maxWidth: '100%',
            width: '100%',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollSnapType: 'x mandatory'
          }}
        >
          {filteredAppointments.length === 0 ? (
            <div className="flex-1 text-center py-8 text-gray-500">
              No patients match your search
            </div>
          ) : (
            filteredAppointments.map((patient) => (
              <div key={patient.id} style={{ flex: '0 0 400px' }} className="snap-center">
                <PatientCard
                  appointment={patient}
                  appointments={appointments}
                  onStatusChange={onStatusChange}
                  onViewPreConsultForm={onViewForm}
                  onExtendConsultation={(patientId, minutes) => {
                    const updatedAppointments = appointments.map(apt => 
                      apt.id === patientId 
                        ? { ...apt, expectedDuration: apt.expectedDuration + minutes }
                        : apt
                    );
                    onReorderQueue(updatedAppointments);
                  }}
                  theme={currentTheme}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Wait Time Indicators */}
      {/* <div className="flex justify-between text-sm text-gray-500 mt-4">
        <div>Shortest Wait: {calculateShortestWait(appointments)}</div>
        <div>Longest Wait: {calculateLongestWait(appointments)}</div>
      </div> */}

      <ConsultationFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        patientId={selectedPatientId}
        formData={mockPreConsultationData as unknown as ConsultationFormData}
      />
    </div>
  );
};

export default PatientTrackingDashboard;