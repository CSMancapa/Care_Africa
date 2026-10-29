import { Appointment, PatientTracking } from "../types";
import axios from 'axios';

export const BASE_URL = 'http://localhost:5001/api';

// Add error handling utility
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'An error occurred');
  }
  return response.json();
};

const defaultHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

export const appointmentService = {
  createAppointment: async (appointmentData: Omit<Appointment, '_id'>): Promise<Appointment> => {
    console.log('Raw appointment data:', appointmentData); // Debug log
    
    const response = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appointmentData),
      credentials: 'include', // Include credentials if using sessions
    });

    console.log('Response status:', response.status); // Debug log
    
    if (!response.ok) {
      const error = await response.json();
      console.log('Full response data:', error); // Debug log
      throw new Error(error.message || 'Failed to create appointment');
    }
    
    return response.json();
  },

  async updateAppointment(id: string, appointmentData: Partial<Appointment>) {
    const response = await fetch(`${BASE_URL}/appointments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(appointmentData),
    });
    return handleResponse(response);
  },

  getAppointments: async (options?: { status?: string, uid?: string }) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!options?.uid) {
        throw new Error('UID is required');
      }

      const queryParams = new URLSearchParams();
      if (options.status) queryParams.append('status', options.status);
      if (options.uid) queryParams.append('uid', options.uid);

      const url = `${BASE_URL}/appointments?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching appointments:', error);
      return [];
    }
  },

  async deleteAppointment(id: string) {
    const response = await fetch(`${BASE_URL}/appointments/${id}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    });
    return handleResponse(response);
  },

  createCalendarEntry: async (appointment: Appointment) => {
    const response = await fetch('/api/calendar/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `${appointment.type} - ${appointment.patientName}`,
        start: appointment.date,
        end: new Date(new Date(appointment.date).getTime() + appointment.duration * 60000),
        description: appointment.notes,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create calendar entry');
    }
    
    return response.json();
  },

  createTrackingData: (trackingData: PatientTracking): Promise<PatientTracking> => {
    return axios.post(`${BASE_URL}/appointments/tracking`, trackingData);
  },
};

export const notificationService = {
  getNotifications: async () => {
    const response = await fetch('/api/notifications');
    return response.json();
  }
};

export const doctorService = {
  getDoctors: async (practiceId: string) => {
    const response = await fetch(`/api/doctors?practiceId=${practiceId}`);
    return response.json();
  }
};

export const caseService = {
  createCase: async (caseData: any) => {
    const response = await fetch('/api/cases', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(caseData),
    });
    return response.json();
  },
  // Add other case-related methods as needed
};

// export const campaignService = {
//   createCampaign: async (campaignData: Omit<Campaign, '_id'>): Promise<Campaign> => {
//     const response = await fetch(`${BASE_URL}/campaigns`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify(campaignData)
//     });

//     if (!response.ok) {
//       const error = await response.json();
//       throw new Error(error.message || 'Failed to create campaign');
//     }
//     return response.json();
//   },

//   getCampaigns: async (uid: string): Promise<Campaign[]> => {
//     const response = await fetch(`${BASE_URL}/campaigns?uid=${uid}`);
//     if (!response.ok) {
//       throw new Error('Failed to fetch campaigns');
//     }
//     return response.json();
//   }
// }; 