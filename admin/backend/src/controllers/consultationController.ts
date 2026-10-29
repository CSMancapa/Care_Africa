import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

// Add this interface
interface AuthRequest extends Request {
  user: {
    _id: string;
    name: string;
    email: string;
    role: "doctor" | "admin" | "staff";
    specialization?: string;
  }
}

export const createConsultation = async (req: AuthRequest, res: Response) => {
  try {
    const { data: consultation, error } = await supabase
      .from('consultations')
      .insert([{
        ...req.body,
        doctor_id: req.user._id
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(consultation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getConsultations = async (req: AuthRequest, res: Response) => {
  try {
    const { data: consultations, error } = await supabase
      .from('consultations')
      .select('*, patients!inner(*)')
      .eq('doctor_id', req.user._id)
      .order('date_time', { ascending: false });

    if (error) throw error;
    res.json(consultations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateConsultation = async (req: AuthRequest, res: Response) => {
  try {
    const { data: consultation, error: fetchError } = await supabase
      .from('consultations')
      .select()
      .eq('id', req.params.id)
      .single();

    if (fetchError || !consultation) {
      return res.status(404).json({ message: 'Consultation not found' });
    }

    if (consultation.doctor_id !== req.user._id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { data: updatedConsultation, error } = await supabase
      .from('consultations')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(updatedConsultation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
