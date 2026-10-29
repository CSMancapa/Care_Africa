import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const getPatients = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*, appointments(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message: errorMessage });
  }
};

export const createPatient = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(400).json({ message: errorMessage });
  }
};

export const getPatientById = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*, appointments(*)')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    res.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message: errorMessage });
  }
};

export const updatePatient = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    res.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(400).json({ message: errorMessage });
  }
};

export const deletePatient = async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message: errorMessage });
  }
};
