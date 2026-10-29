import express from 'express'
import { supabase } from '../config/supabase'
const router = express.Router()

// Get active campaigns for a doctor
router.get('/active', async (req, res) => {
  try {
    const { doctorId } = req.query
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('is_active', true)

    if (error) throw error
    res.json(data)
  } catch (error) {
    res.status(500).json({ message: 'Error fetching campaigns' })
  }
})

// Create new active campaign
router.post('/active', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .insert([req.body])
      .select()

    if (error) throw error
    res.status(201).json(data[0])
  } catch (error) {
    res.status(400).json({ message: 'Error creating campaign' })
  }
})

// Deactivate campaign
router.delete('/active/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('campaigns')
      .update({ is_active: false })
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ message: 'Campaign deactivated successfully' })
  } catch (error) {
    res.status(400).json({ message: 'Error deactivating campaign' })
  }
})

export default router 