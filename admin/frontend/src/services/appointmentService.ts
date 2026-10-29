import { Appointment, PatientTracking } from '../types';

const BASE_URL = 'http://localhost:5001/api';

export const appointmentService = {
  async getAppointments(): Promise<Appointment[]> {
    const response = await fetch('/api/appointments');
    if (!response.ok) throw new Error('Failed to fetch appointments');
    return response.json();
  },

  async createAppointment(appointment: Omit<Appointment, 'id'>): Promise<Appointment> {
    const response = await fetch('/api/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appointment),
    });
    if (!response.ok) throw new Error('Failed to create appointment');
    return response.json();
  },

  async updateAppointment(appointmentId: string, data: any) {
    const response = await fetch(`${BASE_URL}/appointments/${appointmentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update appointment');
    }

    return response.json();
  },

  async deleteAppointment(id: string): Promise<void> {
    const response = await fetch(`/api/appointments/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete appointment');
  },

  createTrackingData: async (data: PatientTracking) => {
    const response = await fetch('/api/tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create tracking data');
    }
    return response.json();
  },
}; 