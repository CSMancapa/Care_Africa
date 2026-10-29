import express from 'express'
import { supabase } from '../config/supabase'
const router = express.Router()

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error

    res.json({
      user: data.user,
      session: data.session
    })
  } catch (error) {
    console.error('Auth error:', error)
    res.status(401).json({ message: 'Authentication failed' })
  }
})

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role, specialization } = req.body
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) throw authError

    // Create user profile in users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user?.id,
          name,
          email,
          role,
          specialization
        }
      ])

    if (userError) throw userError

    res.status(201).json({
      user: authData.user,
      profile: userData[0]
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(400).json({ message: 'Registration failed' })
  }
})

export default router 