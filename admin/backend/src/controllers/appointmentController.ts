import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

// Create
export const createAppointment = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Read (Get All)
export const getAppointments = async (req: Request, res: Response) => {
  try {
    const { status, uid } = req.query;
    let query = supabase
      .from('appointments')
      .select('*, patients(*)');
    
    if (status) query = query.eq('status', status);
    if (uid) query = query.eq('uid', uid);
    
    const { data, error } = await query.order('date', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update
export const updateAppointment = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete
export const deleteAppointment = async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 