import express, { Request as ExpressRequest, Response as ExpressResponse, RequestHandler } from 'express'
import { supabase } from '../config/supabase'

// Add this interface
interface AuthRequest extends ExpressRequest {
  user?: {
    id: string;
  };
}

const router = express.Router()

// Get all patients
router.get('/', (async (req: AuthRequest, res: ExpressResponse) => {
  try {
    // Get user ID from auth token
    const userId = req.user?.id
    console.log('Auth debug:', { 
      hasUser: !!req.user, 
      userId,
      headers: req.headers.authorization 
    })
    
    if (!userId) {
      return res.status(401).json({ 
        message: 'Unauthorized - No user ID found',
        debug: { hasUser: !!req.user }
      })
    }

    // Query patients with error handling
    const { data, error } = await supabase
      .from('patients')
      .select(`
        *,
        appointments (
          id,
          date,
          status
        )
      `)
      .eq('practitionerId', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ 
        message: error.message,
        code: error.code 
      })
    }

    // Return empty array if no data
    res.json(data || [])

  } catch (error) {
    console.error('Server error:', error)
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      details: error instanceof Error ? error.stack : undefined
    })
  }
}) as RequestHandler)

// Create patient
router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .insert([req.body])
      .select()

    if (error) throw error
    res.status(201).json(data[0])
  } catch (error) {
    console.error('Error creating patient:', error)
    res.status(400).json({ message: 'Error creating patient' })
  }
})

// Update patient
router.put('/:id', (async (req: AuthRequest, res: ExpressResponse) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .update(req.body)
      .eq('id', req.params.id)
      .select()

    if (error) throw error
    if (!data?.length) {
      return res.status(404).json({ message: 'Patient not found' })
    }
    res.json(data[0])
  } catch (error) {
    console.error('Error updating patient:', error)
    res.status(400).json({ message: 'Error updating patient' })
  }
}) as RequestHandler)

// Delete patient
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ message: 'Patient deleted successfully' })
  } catch (error) {
    console.error('Error deleting patient:', error)
    res.status(500).json({ message: 'Error deleting patient' })
  }
})

export default router 