import { ConsultationFormData } from '../types/formTypes';

export class FormService {
    static async saveFormData(data: ConsultationFormData) {
      console.log('Form data:', data);
    }

    async getFormData(patientId: string): Promise<ConsultationFormData> {
      const response = await fetch(`/api/patients/${patientId}/form`);
      return response.json();
    }
}