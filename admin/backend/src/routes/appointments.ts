import express, { RequestHandler } from 'express'
import { supabase } from '../config/supabase'
const router = express.Router()

// Create appointment
router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .insert([req.body])
      .select()

    if (error) throw error
    res.status(201).json(data[0])
  } catch (error) {
    console.error('Error creating appointment:', error)
    res.status(400).json({ message: 'Error creating appointment' })
  }
})

// Get all appointments
router.get('/', (async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('date', { ascending: false })

    if (error) throw error
    res.json(data)
  } catch (error) {
    console.error('Error fetching appointments:', error)
    res.status(500).json({ message: 'Error fetching appointments' })
  }
}) as RequestHandler)

// Get completed appointments
router.get('/completed', (async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('status', 'completed')
      .order('date', { ascending: false })

    if (error) throw error
    res.json(data)
  } catch (error) {
    console.error('Error fetching completed appointments:', error)
    res.status(500).json({ message: 'Error fetching completed appointments' })
  }
}) as RequestHandler)

// Update appointment
router.put('/:id', (async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .update(req.body)
      .eq('id', req.params.id)
      .select()

    if (error) throw error
    if (!data?.length) {
      return res.status(404).json({ message: 'Appointment not found' })
    }
    res.json(data[0])
  } catch (error) {
    console.error('Error updating appointment:', error)
    res.status(400).json({ message: 'Error updating appointment' })
  }
}) as RequestHandler)

// Complete appointment
router.post('/completeAppointment', async (req: express.Request, res: express.Response) => {
  try {
    const {
      appointmentId,
      patientId,
      consultationDuration,
      completedAt,
      status
    } = req.body

    const { data, error } = await supabase
      .from('appointments')
      .update({
        status,
        consultationDuration,
        completedAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select()

    if (error) throw error
    res.json(data[0])
  } catch (error) {
    console.error('Error completing appointment:', error)
    res.status(500).json({ message: 'Failed to complete appointment' })
  }
})

export default router 