import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { format, parseISO, addDays, setHours, setMinutes, startOfDay, addMinutes } from 'date-fns';
import { Appointment, Patient } from '../../types';
import { appointmentService, BASE_URL } from '../../services/api';
import { toast } from 'react-hot-toast';
import { currentUser } from '../../services/auth';
import { doctorService } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import supabase from '../../config/supabase';

interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (appointment: Appointment) => void;
  prefillPatient?: Appointment;
  isExternalRequest?: boolean;
  theme: 'light' | 'dark';
  practiceId: string;
  // setFirstTimeAppointments: () => void;
  // setFollowUpAppointments: () => void;
}

const appointmentTypes = ['Check-up',  'Follow-up', 'Consultation', 'Emergency'];
const durations = [15, 30, 45, 60];
const CreateAppointmentModal: React.FC<CreateAppointmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  prefillPatient,
  isExternalRequest = false,
  theme,
  practiceId,
}) => {
  const { theme: contextTheme } = useTheme();
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  console.log('Prefill data:', prefillPatient);

  const [formData, setFormData] = useState<Partial<Appointment & Patient>>({
    patientId: prefillPatient?.patientId || '',
    patientName: prefillPatient?.patientName || '',
    type: 'Follow-up',
    date: new Date(),
    duration: prefillPatient?.duration || 30,
    notes: '',
    contactNumber: prefillPatient?.contactNumber || '',
    email: prefillPatient?.email || '',
  });

  const isFollowUp = Boolean(prefillPatient);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doctorsList, setDoctorsList] = useState<Array<{ _id: string; name: string }>>([]);
  const [firstTimePatient, setFirstTimePatient] = useState(false);
  const [followUpAppointments, setFollowUpAppointments] = useState<number>(0);
  const [firstTimeAppointments, setFirstTimeAppointments] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [settings, setSettings] = useState<{
    businessHours: {
      [key: string]: {
        start: string;
        end: string;
        isOpen: boolean;
      };
    };
    appointmentDuration: number;
  }>({
    businessHours: {
      monday: { start: '09:00', end: '17:00', isOpen: true },
      tuesday: { start: '09:00', end: '17:00', isOpen: true },
      wednesday: { start: '09:00', end: '17:00', isOpen: true },
      thursday: { start: '09:00', end: '17:00', isOpen: true },
      friday: { start: '09:00', end: '17:00', isOpen: true },
      saturday: { start: '09:00', end: '13:00', isOpen: true },
      sunday: { start: '09:00', end: '13:00', isOpen: true },
    },
    appointmentDuration: 30
  });

  // Function to generate time slots based on business hours and selected duration
  const generateTimeSlots = (date: Date) => {
    const dayOfWeek = format(date, 'EEEE').toLowerCase();
    const daySettings = settings.businessHours[dayOfWeek];
    
    if (!daySettings?.isOpen) return [];

    const startDate = startOfDay(date);
    const [startHour, startMinute] = daySettings.start.split(':').map(Number);
    const [endHour, endMinute] = daySettings.end.split(':').map(Number);

    let currentSlot = setMinutes(setHours(startDate, startHour), startMinute);
    const endTime = setMinutes(setHours(startDate, endHour), endMinute);
    
    const slots: Date[] = [];

    while (currentSlot < endTime) {
      slots.push(new Date(currentSlot));
      currentSlot = addMinutes(currentSlot, formData.duration || 30);
    }

    return slots;
  };

  // Add this debug log in your component to check the slots
  useEffect(() => {
    const slots = generateTimeSlots(selectedDate);
    console.log('Available time slots:', slots);
  }, [selectedDate, formData.duration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const appointmentData = {
        patient_id: formData.patientId,
        patient_name: formData.patientName,
        type: formData.type,
        date: formData.date?.toISOString(),
        duration: formData.duration,
        contact_number: formData.contactNumber,
        email: formData.email,
        notes: formData.notes,
        status: 'scheduled',
        source: isExternalRequest ? 'external' : 'internal',
        created_at: new Date().toISOString(),
      };

      // Create a new appointment in Supabase
      const { data, error } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select()
        .single();

      if (error) throw error;

      onSubmit(data);
      onClose();
      toast.success('Appointment created successfully');
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create appointment');
    }
  };

  // Use useEffect to update form data when prefillPatient changes
  useEffect(() => {
    if (prefillPatient) {
      setFormData({
        patientId: prefillPatient.patientId,
        patientName: prefillPatient.patientName,
        contactNumber: prefillPatient.contactNumber,
        email: prefillPatient.email,
        type: 'Follow-up',
        date: new Date(),
        duration: prefillPatient.duration,
        notes: '',
        status: 'scheduled',
        doctorId: prefillPatient.doctorId,
      });
    }
  }, [prefillPatient]);

  useEffect(() => {
    const loadDoctors = async () => {
      // const doctors = await doctorService.getDoctors(currentUser.practiceId);
      // setDoctorsList(doctors);
      // The following is mock data to test the feature
      const mockDoctors = [
        { _id: 'doc1', name: 'Dr. Jane Smith' },
        { _id: 'doc2', name: 'Dr. John Doe' },
        { _id: 'doc3', name: 'Dr. Emily Johnson' },
      ];
  
      // Simulate an asynchronous call
      await new Promise((resolve) => setTimeout(resolve, 500));
  
      // Set mock data to the state
      setDoctorsList(mockDoctors);
    };
    loadDoctors();
  }, []);

  // Load settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`/api/settings/${practiceId}`);
        if (!response.ok) throw new Error('Failed to fetch settings');
        const data = await response.json();
        setSettings(data);
      } catch (error) {
        console.warn('Using default settings:', error);
        // Set default settings here
      }
    };

    fetchSettings();
  }, [practiceId]);

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className={`fixed inset-0 z-10 overflow-y-auto ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`} onClose={handleClose}>
        <div className="flex min-h-full items-center justify-center p-4">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className={`w-full max-w-md transform overflow-hidden rounded-2xl p-6 shadow-xl transition-all ${
              theme === 'dark' 
                ? 'bg-gray-800 border border-gray-700' 
                : 'bg-white'
            } ${isClosing ? 'opacity-75' : 'opacity-100'}`}>
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title className={`text-lg font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Create New Appointment
                </Dialog.Title>
                <button
                  onClick={handleClose}
                  className={`rounded-full p-1 hover:bg-opacity-20 transition-colors ${
                    theme === 'dark' 
                      ? 'text-gray-300 hover:bg-gray-700' 
                      : 'text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Patient Name
                  </label>
                  <input
                    type="text"
                    required
                    readOnly={isFollowUp}
                    className={`mt-1 block w-full rounded-md shadow-sm transition-colors duration-300 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                    value={formData.patientName}
                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Appointment Type
                  </label>
                  <select
                    className={`mt-1 block w-full rounded-md shadow-sm transition-colors duration-300 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    {appointmentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Duration (minutes)
                  </label>
                  <select
                    className={`mt-1 block w-full rounded-md shadow-sm transition-colors duration-300 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration: parseInt(e.target.value),
                      })
                    }
                  >
                    {durations.map((duration) => (
                      <option key={duration} value={duration}>
                        {duration}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Select Date
                    </label>
                    <input
                      type="datetime-local"
                      className={`mt-1 block w-full rounded-md shadow-sm transition-colors duration-300 ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      }`}
                      value={format(formData.date, "yyyy-MM-dd'T'HH:mm")}
                      onChange={(e) => setFormData({ ...formData, date: parseISO(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Select Time
                    </label>
                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                      {generateTimeSlots(selectedDate).length > 0 ? (
                        generateTimeSlots(selectedDate).map((slot, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setFormData({ ...formData, date: slot })}
                            className={`p-2 text-sm rounded-lg border ${
                              formData.date && format(formData.date, 'HH:mm') === format(slot, 'HH:mm')
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                            }`}
                          >
                            {format(slot, 'h:mm a')}
                          </button>
                        ))
                      ) : (
                        <p className="col-span-3 text-center text-gray-500">
                          No available time slots for this date
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    readOnly={isFollowUp}
                    className={`mt-1 block w-full rounded-md shadow-sm transition-colors duration-300 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                    value={formData.contactNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, contactNumber: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Email
                  </label>
                  <input
                    type="email"
                    readOnly={isFollowUp}
                    className={`mt-1 block w-full rounded-md shadow-sm transition-colors duration-300 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Notes
                  </label>
                  <textarea
                    className={`mt-1 block w-full rounded-md shadow-sm transition-colors duration-300 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                    rows={3}
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Select Doctor
                  </label>
                  <select
                    value={formData.assignedDoctor}
                    onChange={(e) => setFormData({ ...formData, assignedDoctor: e.target.value })}
                    className={`form-select ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                    required
                  >
                    <option value="">Select Doctor</option>
                    {doctorsList.map(doctor => (
                      <option key={doctor._id} value={doctor.name}>
                        {doctor.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="firstTimePatient" className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Is this the patient's first appointment with this doctor?
                  </label>
                  <input
                    type="checkbox"
                    id="firstTimePatient"
                    name="firstTimePatient"
                    checked={firstTimePatient}
                    onChange={(e) => setFirstTimePatient(e.target.checked)}
                    className={`mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600'
                        : 'bg-white border-gray-300'
                    }`}
                  />
                </div>

                  {firstTimePatient && (
                    <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
                      <h4 className="font-medium text-gray-900">Additional Patient Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Date of Birth
                          </label>
                          <input
                            type="date"
                            required={firstTimePatient}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            onChange={(e) =>
                              setFormData({ ...formData, dateOfBirth: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Gender
                          </label>
                          <select
                            required={firstTimePatient}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            onChange={(e) =>
                              setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | 'other' })
                            }
                          >
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            ID Number
                          </label>
                          <input
                            type="text"
                            required={firstTimePatient}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            onChange={(e) =>
                              setFormData({ ...formData, idNumber: e.target.value })
                            }
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Address
                          </label>
                          <input
                            type="text"
                            required={firstTimePatient}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            onChange={(e) =>
                              setFormData({ ...formData, address: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}

                <div className="mt-6 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-100'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      theme === 'dark'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? 'Creating...' : 'Create Appointment'}
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default CreateAppointmentModal;