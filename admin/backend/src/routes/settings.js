const express = require('express');
const router = express.Router();
const Practice = require('../models/Practice');

// Get practice settings
router.get('/:practiceId', async (req, res) => {
  try {
    const { practiceId } = req.params;
    const practice = await Practice.findById(practiceId);
    
    if (!practice) {
      return res.status(404).json({ message: 'Practice not found' });
    }

    res.json({
      practiceName: practice.practiceName,
      email: practice.email,
      phone: practice.phone,
      address: practice.address,
      businessHours: practice.businessHours,
      appointmentDuration: practice.appointmentDuration,
      notifications: practice.notifications
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching practice settings' });
  }
});

// Update practice settings
router.put('/:practiceId', async (req, res) => {
  try {
    const { practiceId } = req.params;
    const updates = req.body;

    const practice = await Practice.findByIdAndUpdate(
      practiceId,
      { $set: updates },
      { new: true }
    );

    if (!practice) {
      return res.status(404).json({ message: 'Practice not found' });
    }

    res.json(practice);
  } catch (error) {
    res.status(500).json({ message: 'Error updating practice settings' });
  }
});

module.exports = router; 