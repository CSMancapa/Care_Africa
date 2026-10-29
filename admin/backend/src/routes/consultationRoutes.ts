import express from 'express';
const router = express.Router();

// Basic setup for consultation routes
router.get('/', (req, res) => {
    res.json({ message: 'Consultation routes working' });
});

export default router; 